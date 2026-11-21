"""
Training Pipeline for LSTM Calibration Drift Forecaster in CaliRoute (Phase 5).

Usage:
    python src/train/train_forecaster.py [options]

This single script:
1. Loads the 30-day historical calibration data (gate and qubit telemetry).
2. Builds sliding-window time-series datasets (lookback L -> horizon 1).
3. Evaluates the Naive Persistence Baseline (assuming zero change: x_{t+1} = x_t).
4. Trains the CalibrationDriftForecaster (PyTorch LSTM with residual skip connections).
5. Compares Forecaster vs. Persistence Baseline on held-out validation sequences.
6. Persists the best checkpoint to results/drift_forecaster_best.pt and exports a
   forecasted snapshot to data/processed/forecasted_calibration_latest.json.
"""

import os
import sys
import json
import logging
import argparse
from pathlib import Path
from typing import Dict, Any, Tuple, Optional

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

# Ensure repository root is in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.collect.process_history import load_and_align_history, TimeSeriesWindowDataset
from src.models.drift_forecaster import CalibrationDriftForecaster
from src.collect.snapshot_calibration import get_latest_calibration_snapshot

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("caliroute.train.forecaster")


def evaluate_baseline_and_model(
    model: nn.Module,
    val_loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> Dict[str, float]:
    """
    Evaluates both the trained LSTM model and the Naive Persistence Baseline
    on the validation dataset.
    """
    model.eval()
    model_loss_total = 0.0
    persist_loss_total = 0.0
    model_mae_total = 0.0
    persist_mae_total = 0.0
    total_samples = 0

    with torch.no_grad():
        for batch in val_loader:
            x = batch["input"].to(device)              # (B, L, F)
            y_true = batch["target"].to(device)        # (B, F)
            y_persist = batch["persistence"].to(device)# (B, F)

            # Model prediction
            y_pred = model(x)                          # (B, F)

            # Losses
            model_loss = criterion(y_pred, y_true).item()
            persist_loss = criterion(y_persist, y_true).item()

            # MAE
            model_mae = torch.mean(torch.abs(y_pred - y_true)).item()
            persist_mae = torch.mean(torch.abs(y_persist - y_true)).item()

            batch_size = x.size(0)
            model_loss_total += model_loss * batch_size
            persist_loss_total += persist_loss * batch_size
            model_mae_total += model_mae * batch_size
            persist_mae_total += persist_mae * batch_size
            total_samples += batch_size

    return {
        "model_loss": model_loss_total / total_samples,
        "persist_loss": persist_loss_total / total_samples,
        "model_mae": model_mae_total / total_samples,
        "persist_mae": persist_mae_total / total_samples,
    }


def train_single_branch(
    model_branch: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    branch_name: str,
    epochs: int = 50,
    lr: float = 1e-3,
    device: torch.device = torch.device("cpu"),
) -> Tuple[nn.Module, Dict[str, Any]]:
    """Trains a single forecaster branch (qubit or coupler)."""
    optimizer = torch.optim.AdamW(model_branch.parameters(), lr=lr, weight_decay=1e-4)
    criterion = nn.SmoothL1Loss(beta=0.1)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=5)

    best_val_loss = float("inf")
    best_weights = copy_weights = copy_state = None
    best_metrics = {}
    history = []

    logger.info(f"--- Training {branch_name} Branch ({epochs} epochs) ---")

    for epoch in range(1, epochs + 1):
        model_branch.train()
        train_loss_total = 0.0
        train_samples = 0

        for batch in train_loader:
            x = batch["input"].to(device)
            y = batch["target"].to(device)

            optimizer.zero_grad()
            y_pred = model_branch(x)
            loss = criterion(y_pred, y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model_branch.parameters(), max_norm=1.0)
            optimizer.step()

            train_loss_total += loss.item() * x.size(0)
            train_samples += x.size(0)

        train_loss = train_loss_total / train_samples
        val_eval = evaluate_baseline_and_model(model_branch, val_loader, criterion, device)
        scheduler.step(val_eval["model_loss"])

        if val_eval["model_loss"] < best_val_loss:
            best_val_loss = val_eval["model_loss"]
            best_state = {k: v.cpu().clone() for k, v in model_branch.state_dict().items()}
            best_metrics = {
                "epoch": epoch,
                "train_loss": train_loss,
                "val_model_loss": val_eval["model_loss"],
                "val_persist_loss": val_eval["persist_loss"],
                "val_model_mae": val_eval["model_mae"],
                "val_persist_mae": val_eval["persist_mae"],
                "mae_reduction_pct": ((val_eval["persist_mae"] - val_eval["model_mae"]) / max(1e-8, val_eval["persist_mae"])) * 100.0,
            }

        history.append({
            "epoch": epoch,
            "train_loss": train_loss,
            **val_eval
        })

        if epoch % 10 == 0 or epoch == epochs or epoch == 1:
            logger.info(
                f"[{branch_name}] Epoch {epoch:02d}/{epochs:02d} | "
                f"Train Loss: {train_loss:.5f} | Val Model Loss: {val_eval['model_loss']:.5f} | "
                f"Val Persist Loss: {val_eval['persist_loss']:.5f} | "
                f"MAE Gain: {((val_eval['persist_mae'] - val_eval['model_mae']) / max(1e-8, val_eval['persist_mae'])) * 100.0:+.2f}%"
            )

    model_branch.load_state_dict(best_state)
    return model_branch, {"best_metrics": best_metrics, "history": history}


def train_drift_forecaster(
    gate_history_csv: str = "data/gate_history_ibm_kingston_2026-09-14.csv",
    qubit_history_csv: str = "data/qubit_history_ibm_kingston_2026-09-14.csv",
    epochs: int = 50,
    lookback: int = 5,
    batch_size: int = 64,
    lr: float = 1e-3,
    hidden_dim: int = 64,
    num_layers: int = 2,
    model_save_path: str = "results/drift_forecaster_best.pt",
    history_save_path: str = "results/forecaster_training_history.json",
    forecast_snapshot_save_path: str = "data/processed/forecasted_calibration_latest.json",
    seed: int = 42,
) -> Dict[str, Any]:
    """
    Main training function for the Phase 5 Drift Forecaster.
    """
    torch.manual_seed(seed)
    np.random.seed(seed)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")

    # 1. Load and align 30-day historical telemetry
    history = load_and_align_history(gate_history_csv, qubit_history_csv)

    # 2. Build Qubit Datasets
    q_train_ds = TimeSeriesWindowDataset(
        history.qubit_tensor,
        lookback=lookback,
        horizon=1,
        mean=history.q_mean,
        std=history.q_std,
        train_val_split=0.8,
        is_train=True,
    )
    q_val_ds = TimeSeriesWindowDataset(
        history.qubit_tensor,
        lookback=lookback,
        horizon=1,
        mean=history.q_mean,
        std=history.q_std,
        train_val_split=0.8,
        is_train=False,
    )

    q_train_loader = DataLoader(q_train_ds, batch_size=batch_size, shuffle=True)
    q_val_loader = DataLoader(q_val_ds, batch_size=batch_size, shuffle=False)

    # 3. Build Coupler Datasets
    c_train_ds = TimeSeriesWindowDataset(
        history.coupler_tensor,
        lookback=lookback,
        horizon=1,
        mean=history.c_mean,
        std=history.c_std,
        train_val_split=0.8,
        is_train=True,
    )
    c_val_ds = TimeSeriesWindowDataset(
        history.coupler_tensor,
        lookback=lookback,
        horizon=1,
        mean=history.c_mean,
        std=history.c_std,
        train_val_split=0.8,
        is_train=False,
    )

    c_train_loader = DataLoader(c_train_ds, batch_size=batch_size, shuffle=True)
    c_val_loader = DataLoader(c_val_ds, batch_size=batch_size, shuffle=False)

    logger.info(
        f"Built TimeSeries Datasets (Lookback={lookback} days): "
        f"Qubit Samples: {len(q_train_ds)} train, {len(q_val_ds)} val | "
        f"Coupler Samples: {len(c_train_ds)} train, {len(c_val_ds)} val"
    )

    # 4. Instantiate Forecaster
    forecaster = CalibrationDriftForecaster(
        qubit_feat_dim=3,
        coupler_feat_dim=2,
        hidden_dim=hidden_dim,
        num_layers=num_layers,
        dropout=0.1,
    ).to(device)

    # 5. Train Qubit Model Branch
    forecaster.qubit_model, q_results = train_single_branch(
        forecaster.qubit_model,
        q_train_loader,
        q_val_loader,
        branch_name="Qubits",
        epochs=epochs,
        lr=lr,
        device=device,
    )

    # 6. Train Coupler Model Branch
    forecaster.coupler_model, c_results = train_single_branch(
        forecaster.coupler_model,
        c_train_loader,
        c_val_loader,
        branch_name="Couplers",
        epochs=epochs,
        lr=lr,
        device=device,
    )

    # 7. Persist Best Checkpoint
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    checkpoint = {
        "model_state_dict": forecaster.state_dict(),
        "hidden_dim": hidden_dim,
        "num_layers": num_layers,
        "lookback": lookback,
        "q_mean": history.q_mean,
        "q_std": history.q_std,
        "c_mean": history.c_mean,
        "c_std": history.c_std,
        "qubit_best_metrics": q_results["best_metrics"],
        "coupler_best_metrics": c_results["best_metrics"],
        "coupler_keys": history.coupler_keys,
    }
    torch.save(checkpoint, model_save_path)
    logger.info(f"Saved best forecaster checkpoint to {model_save_path}")

    # 8. Save Training History
    os.makedirs(os.path.dirname(history_save_path), exist_ok=True)
    full_history = {
        "qubit_branch": q_results,
        "coupler_branch": c_results,
    }
    with open(history_save_path, "w") as f:
        json.dump(full_history, f, indent=2)
    logger.info(f"Saved training history to {history_save_path}")

    # 9. Generate & Save Forecasted Calibration Snapshot
    base_snapshot = get_latest_calibration_snapshot("data/raw/calibration")
    recent_q = history.qubit_tensor[-lookback:, :, :]
    recent_c = history.coupler_tensor[-lookback:, :, :]

    forecasted_snap = forecaster.forecast_snapshot(
        recent_qubits_raw=recent_q,
        recent_couplers_raw=recent_c,
        base_snapshot=base_snapshot,
        q_mean=history.q_mean,
        q_std=history.q_std,
        c_mean=history.c_mean,
        c_std=history.c_std,
        coupler_keys=history.coupler_keys,
        device=device,
    )

    os.makedirs(os.path.dirname(forecast_snapshot_save_path), exist_ok=True)
    with open(forecast_snapshot_save_path, "w") as f:
        json.dump(forecasted_snap, f, indent=2)
    logger.info(f"Exported predicted calibration snapshot to {forecast_snapshot_save_path}")

    # 10. Print Final Executive Performance Summary
    q_best = q_results["best_metrics"]
    c_best = c_results["best_metrics"]

    print("\n" + "=" * 80)
    print("           CALIROUTE PHASE 5: DRIFT FORECASTER TRAINING RESULTS           ")
    print("=" * 80)
    print(f"Lookback Window      : {lookback} days")
    print(f"Training Samples     : {len(q_train_ds) + len(c_train_ds)} total sequences")
    print(f"Validation Samples   : {len(q_val_ds) + len(c_val_ds)} total sequences")
    print("-" * 80)
    print("QUBIT METRICS (T1, T2, Readout Error):")
    print(f"  Naive Persistence MAE : {q_best['val_persist_mae']:.6f}")
    print(f"  LSTM Forecaster MAE   : {q_best['val_model_mae']:.6f}")
    print(f"  Forecasting MAE Gain  : {q_best['mae_reduction_pct']:+.2f}% improvement over persistence")
    print("-" * 80)
    print("COUPLER METRICS (CZ and RZZ Gate Errors):")
    print(f"  Naive Persistence MAE : {c_best['val_persist_mae']:.6f}")
    print(f"  LSTM Forecaster MAE   : {c_best['val_model_mae']:.6f}")
    print(f"  Forecasting MAE Gain  : {c_best['mae_reduction_pct']:+.2f}% improvement over persistence")
    print("=" * 80 + "\n")

    return checkpoint


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train CaliRoute Phase 5 Calibration Drift Forecaster")
    parser.add_argument("--gate-csv", type=str, default="data/gate_history_ibm_kingston_2026-09-14.csv")
    parser.add_argument("--qubit-csv", type=str, default="data/qubit_history_ibm_kingston_2026-09-14.csv")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--lookback", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--hidden-dim", type=int, default=64)
    parser.add_argument("--num-layers", type=int, default=2)

    args = parser.parse_args()

    train_drift_forecaster(
        gate_history_csv=args.gate_csv,
        qubit_history_csv=args.qubit_csv,
        epochs=args.epochs,
        lookback=args.lookback,
        batch_size=args.batch_size,
        lr=args.lr,
        hidden_dim=args.hidden_dim,
        num_layers=args.num_layers,
    )
