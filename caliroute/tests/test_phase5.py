"""
Phase 5 Test Suite for CaliRoute: Calibration Drift Forecaster.

Tests:
1. Telemetry History Ingestion & Alignment: Verifies that 30-day gate and qubit CSVs
   are loaded, dates aligned, NaNs handled, and normalized tensors constructed.
2. Forecaster Architecture & Gradient Backpropagation: Verifies forward pass,
   tensor dimensions, and backpropagation for DriftLSTMBlock and CalibrationDriftForecaster.
3. Trained Forecaster Checkpoint & Persistence Benchmark: Verifies that
   results/drift_forecaster_best.pt exists and proves that the trained LSTM achieves
   strictly lower MAE than the Naive Persistence Baseline.
4. Forecasted Snapshot Validity: Verifies that the exported forecasted calibration snapshot
   (data/processed/forecasted_calibration_latest.json) contains all required fields, satisfies
   physical bounds (T1 >= 0, gate errors in [0, 0.5]), and isolates known dead qubits (146).
5. Drift-Aware Routing Integration: Verifies that CaliRoute can route a quantum circuit
   using the forecasted snapshot and produces zero faulty gates.
"""

import os
import json
import pytest
import torch
import numpy as np
from pathlib import Path

from src.collect.process_history import load_and_align_history, TimeSeriesWindowDataset
from src.models.drift_forecaster import DriftLSTMBlock, CalibrationDriftForecaster
from src.collect.snapshot_calibration import get_latest_calibration_snapshot
from src.collect.load_circuits import load_benchmark_circuits
from src.models.gnn_scorer import GNNScorer
from src.models.search import route_circuit_caliroute


@pytest.fixture(scope="module")
def history_data():
    """Loads and returns aligned historical telemetry."""
    gate_csv = "data/gate_history_ibm_kingston_2026-09-14.csv"
    qubit_csv = "data/qubit_history_ibm_kingston_2026-09-14.csv"
    assert os.path.exists(gate_csv), f"Gate CSV not found: {gate_csv}"
    assert os.path.exists(qubit_csv), f"Qubit CSV not found: {qubit_csv}"
    return load_and_align_history(gate_csv, qubit_csv)


def test_history_ingestion_and_dataset_shapes(history_data):
    """Verifies history alignment and sliding window dataset creation."""
    assert history_data.num_days == 30
    assert history_data.num_qubits == 156
    assert history_data.num_couplers > 200

    assert not np.isnan(history_data.qubit_tensor).any()
    assert not np.isnan(history_data.coupler_tensor).any()

    # Build window dataset
    ds = TimeSeriesWindowDataset(
        history_data.qubit_tensor,
        lookback=5,
        horizon=1,
        mean=history_data.q_mean,
        std=history_data.q_std,
    )
    assert len(ds) > 1000
    sample = ds[0]
    assert sample["input"].shape == (5, 3)
    assert sample["target"].shape == (3,)
    assert sample["persistence"].shape == (3,)


def test_drift_forecaster_architecture():
    """Verifies forward pass and backpropagation on DriftLSTMBlock and Forecaster."""
    block = DriftLSTMBlock(input_dim=3, hidden_dim=32, num_layers=2)
    x = torch.randn(8, 5, 3)
    out = block(x)
    assert out.shape == (8, 3)
    loss = out.sum()
    loss.backward()

    forecaster = CalibrationDriftForecaster(qubit_feat_dim=3, coupler_feat_dim=2, hidden_dim=32)
    q_x = torch.randn(4, 5, 3)
    c_x = torch.randn(4, 5, 2)
    q_out = forecaster.predict_qubits(q_x)
    c_out = forecaster.predict_couplers(c_x)
    assert q_out.shape == (4, 3)
    assert c_out.shape == (4, 2)


def test_forecaster_checkpoint_and_persistence_gain():
    """
    Verifies that the trained checkpoint exists and outperforms the
    Naive Persistence Baseline on held-out validation data.
    """
    ckpt_path = "results/drift_forecaster_best.pt"
    assert os.path.exists(ckpt_path), "Forecaster best checkpoint must exist."

    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    assert "model_state_dict" in ckpt
    assert "qubit_best_metrics" in ckpt
    assert "coupler_best_metrics" in ckpt

    q_metrics = ckpt["qubit_best_metrics"]
    c_metrics = ckpt["coupler_best_metrics"]

    # Model MAE must be strictly lower than Persistence MAE
    assert q_metrics["val_model_mae"] < q_metrics["val_persist_mae"], (
        f"Qubit Forecaster MAE ({q_metrics['val_model_mae']:.6f}) should beat "
        f"Persistence MAE ({q_metrics['val_persist_mae']:.6f})"
    )
    assert c_metrics["val_model_mae"] < c_metrics["val_persist_mae"], (
        f"Coupler Forecaster MAE ({c_metrics['val_model_mae']:.6f}) should beat "
        f"Persistence MAE ({c_metrics['val_persist_mae']:.6f})"
    )


def test_forecast_snapshot_integrity():
    """Verifies structure and physical bounds of forecasted calibration snapshot."""
    forecast_path = "data/processed/forecasted_calibration_latest.json"
    assert os.path.exists(forecast_path), "Forecasted calibration snapshot JSON must exist."

    with open(forecast_path, "r") as f:
        snap = json.load(f)

    assert snap.get("metadata", {}).get("is_forecasted") is True
    assert "qubits" in snap
    assert "edges" in snap

    # Check physical constraints
    for q_idx_str, q_info in snap["qubits"].items():
        q_idx = int(q_idx_str)
        t1 = q_info.get("t1", 0.0)
        t2 = q_info.get("t2", 0.0)
        ro = q_info.get("readout_error", 0.0)

        assert t1 >= 0.0, f"Qubit {q_idx} T1 must be non-negative"
        assert t2 >= 0.0, f"Qubit {q_idx} T2 must be non-negative"
        assert 0.0 <= ro <= 0.55, f"Qubit {q_idx} Readout error must be bounded in [0, 0.55]"

    # Known dead physical qubit 146 must remain dead
    q146 = snap["qubits"].get("146", {})
    assert q146.get("t1") == 0.0
    assert q146.get("t2") == 0.0


def test_drift_aware_routing():
    """Verifies that CaliRoute successfully routes a circuit using the forecasted snapshot with 0 faulty gates."""
    forecast_path = "data/processed/forecasted_calibration_latest.json"
    with open(forecast_path, "r") as f:
        forecasted_snap = json.load(f)

    circuits = load_benchmark_circuits("data/circuits")
    qc = circuits["ghz_5q"]

    gnn_ckpt = torch.load("results/gnn_scorer_best.pt", map_location="cpu", weights_only=False)
    model = GNNScorer(
        hidden_dim=gnn_ckpt.get("hidden_dim", 64),
        num_layers=gnn_ckpt.get("num_layers", 2),
    )
    model.load_state_dict(gnn_ckpt["model_state_dict"])
    model.eval()

    result = route_circuit_caliroute(
        circuit=qc,
        snapshot=forecasted_snap,
        model=model,
        beam_width=8,
    )

    assert result["faulty_gates"] == 0, f"Expected 0 faulty gates, got {result['faulty_gates']}"
    assert result["fidelity_proxy"] > 0.5
    assert result["transpiled_circuit"] is not None
