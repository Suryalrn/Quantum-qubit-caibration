"""
Historical Telemetry Processor for CaliRoute Phase 5.

Loads, aligns, and processes multi-day historical calibration records:
- data/gate_history_ibm_kingston_2026-09-14.csv (30 days of gate errors)
- data/qubit_history_ibm_kingston_2026-09-14.csv (30 days of qubit coherence)

Builds normalized sliding-window time-series datasets for training and evaluating
the LSTM Calibration Drift Forecaster.
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("caliroute.collect.process_history")


class CalibrationTimeSeriesData:
    """
    Container holding aligned, chronological calibration history across all physical
    qubits and physical coupling edges of the quantum processor.
    """
    def __init__(
        self,
        dates: List[str],
        qubit_tensor: np.ndarray,      # shape: (num_days, num_qubits, num_q_feats)
        coupler_tensor: np.ndarray,    # shape: (num_days, num_couplers, num_c_feats)
        qubit_ids: List[int],
        coupler_keys: List[str],
        q_feat_names: List[str],
        c_feat_names: List[str],
        q_mean: np.ndarray,
        q_std: np.ndarray,
        c_mean: np.ndarray,
        c_std: np.ndarray,
    ):
        self.dates = dates
        self.qubit_tensor = qubit_tensor
        self.coupler_tensor = coupler_tensor
        self.qubit_ids = qubit_ids
        self.coupler_keys = coupler_keys
        self.q_feat_names = q_feat_names
        self.c_feat_names = c_feat_names
        self.q_mean = q_mean
        self.q_std = q_std
        self.c_mean = c_mean
        self.c_std = c_std

    @property
    def num_days(self) -> int:
        return len(self.dates)

    @property
    def num_qubits(self) -> int:
        return len(self.qubit_ids)

    @property
    def num_couplers(self) -> int:
        return len(self.coupler_keys)


def load_and_align_history(
    gate_history_csv: str = "data/gate_history_ibm_kingston_2026-09-14.csv",
    qubit_history_csv: str = "data/qubit_history_ibm_kingston_2026-09-14.csv",
) -> CalibrationTimeSeriesData:
    """
    Loads raw gate and qubit CSVs, cleans NaNs, parses chronological timestamps,
    applies log-transform to coupler gate errors, and constructs structured aligned 3D tensors.
    """
    if not os.path.exists(gate_history_csv):
        raise FileNotFoundError(f"Gate history CSV not found: {gate_history_csv}")
    if not os.path.exists(qubit_history_csv):
        raise FileNotFoundError(f"Qubit history CSV not found: {qubit_history_csv}")

    logger.info(f"Loading gate history from {gate_history_csv}...")
    df_gates = pd.read_csv(gate_history_csv)

    logger.info(f"Loading qubit history from {qubit_history_csv}...")
    df_qubits = pd.read_csv(qubit_history_csv)

    # 1. Parse and align chronological dates (format is DD-MM-YYYY)
    df_qubits["datetime"] = pd.to_datetime(df_qubits["snapshot_date_requested"], format="%d-%m-%Y")
    df_gates["datetime"] = pd.to_datetime(df_gates["snapshot_date_requested"], format="%d-%m-%Y")

    chronological_dates = sorted(df_qubits["datetime"].unique())
    date_strs = [d.strftime("%Y-%m-%d") for d in chronological_dates]
    num_days = len(chronological_dates)
    logger.info(f"Found {num_days} continuous calibration dates: {date_strs[0]} to {date_strs[-1]}.")

    # 2. Extract Qubit Data (156 qubits x 3 features: T1, T2, Readout Error)
    qubit_ids = sorted(df_qubits["qubit_id"].unique().tolist())
    num_qubits = len(qubit_ids)
    q_feat_names = ["t1", "t2", "readout_error"]

    # Raw tensor: (days, qubits, 3)
    q_raw = np.zeros((num_days, num_qubits, 3), dtype=np.float32)

    for day_idx, d in enumerate(chronological_dates):
        day_df = df_qubits[df_qubits["datetime"] == d]
        for _, row in day_df.iterrows():
            q = int(row["qubit_id"])
            # Dead qubits (e.g. 146) have NaN T1/T2 -> fill with 0.0
            t1 = float(row["T1_seconds"]) if pd.notna(row["T1_seconds"]) else 0.0
            t2 = float(row["T2_seconds"]) if pd.notna(row["T2_seconds"]) else 0.0
            ro = float(row["readout_error"]) if pd.notna(row["readout_error"]) else 0.5
            q_raw[day_idx, q, 0] = t1
            q_raw[day_idx, q, 1] = t2
            q_raw[day_idx, q, 2] = ro

    # 3. Extract Coupler Gate Errors (cz_error, rzz_error) in Log Space
    cz_df = df_gates[df_gates["gate"] == "cz"]
    rzz_df = df_gates[df_gates["gate"] == "rzz"]

    # Format coupler key from "u,v" to "u_v"
    def normalize_coupler(q_str: str) -> str:
        parts = str(q_str).split(",")
        return f"{parts[0].strip()}_{parts[1].strip()}"

    cz_df = cz_df.copy()
    cz_df["coupler_key"] = cz_df["qubits"].apply(normalize_coupler)

    rzz_df = rzz_df.copy()
    rzz_df["coupler_key"] = rzz_df["qubits"].apply(normalize_coupler)

    coupler_keys = sorted(cz_df["coupler_key"].unique().tolist())
    num_couplers = len(coupler_keys)
    coupler_idx_map = {k: i for i, k in enumerate(coupler_keys)}
    c_feat_names = ["log_cz_error", "log_rzz_error"]

    # Coupler tensor in log-space: log10(error + 1e-7)
    c_raw = np.zeros((num_days, num_couplers, 2), dtype=np.float32)

    for day_idx, d in enumerate(chronological_dates):
        # CZ errors
        day_cz = cz_df[cz_df["datetime"] == d]
        for _, row in day_cz.iterrows():
            c_key = row["coupler_key"]
            if c_key in coupler_idx_map:
                c_idx = coupler_idx_map[c_key]
                err = float(row["error"]) if pd.notna(row["error"]) else 0.01
                c_raw[day_idx, c_idx, 0] = np.log10(max(1e-7, err) + 1e-7)

        # RZZ errors
        day_rzz = rzz_df[rzz_df["datetime"] == d]
        for _, row in day_rzz.iterrows():
            c_key = row["coupler_key"]
            if c_key in coupler_idx_map:
                c_idx = coupler_idx_map[c_key]
                err = float(row["error"]) if pd.notna(row["error"]) else 0.01
                c_raw[day_idx, c_idx, 1] = np.log10(max(1e-7, err) + 1e-7)

    # 4. Compute robust normalizations (mean and std across time and channels)
    q_mean = np.mean(q_raw, axis=(0, 1), keepdims=True)  # (1, 1, 3)
    q_std = np.std(q_raw, axis=(0, 1), keepdims=True)
    q_std[q_std < 1e-6] = 1.0

    c_mean = np.mean(c_raw, axis=(0, 1), keepdims=True)  # (1, 1, 2)
    c_std = np.std(c_raw, axis=(0, 1), keepdims=True)
    c_std[c_std < 1e-6] = 1.0

    logger.info(f"Loaded {num_qubits} qubits and {num_couplers} physical couplers across {num_days} days.")

    return CalibrationTimeSeriesData(
        dates=date_strs,
        qubit_tensor=q_raw,
        coupler_tensor=c_raw,
        qubit_ids=qubit_ids,
        coupler_keys=coupler_keys,
        q_feat_names=q_feat_names,
        c_feat_names=c_feat_names,
        q_mean=q_mean,
        q_std=q_std,
        c_mean=c_mean,
        c_std=c_std,
    )


class TimeSeriesWindowDataset(Dataset):
    """
    Sliding window dataset for training recurrent neural networks (LSTM).
    Given lookback length L, samples sequences of shape (L, F) to predict target of shape (F,).
    """
    def __init__(
        self,
        raw_data: np.ndarray,      # shape: (days, num_channels, num_features)
        lookback: int = 5,
        horizon: int = 1,
        mean: Optional[np.ndarray] = None,
        std: Optional[np.ndarray] = None,
        train_val_split: Optional[float] = None,
        is_train: bool = True
    ):
        self.lookback = lookback
        self.horizon = horizon
        self.mean = mean if mean is not None else np.zeros((1, 1, raw_data.shape[-1]), dtype=np.float32)
        self.std = std if std is not None else np.ones((1, 1, raw_data.shape[-1]), dtype=np.float32)

        # Normalize data
        norm_data = (raw_data - self.mean) / self.std

        # Total sliding steps across time
        num_days, num_channels, num_features = raw_data.shape
        max_start = num_days - lookback - horizon + 1

        if max_start <= 0:
            raise ValueError(f"Lookback ({lookback}) + horizon ({horizon}) exceeds available days ({num_days}).")

        # Temporal split (e.g. first 80% of days for train, last 20% for val)
        if train_val_split is not None:
            split_step = int(max_start * train_val_split)
            if is_train:
                valid_starts = list(range(0, split_step))
            else:
                valid_starts = list(range(split_step, max_start))
        else:
            valid_starts = list(range(0, max_start))

        # Generate sample pairs (normalized inputs, normalized targets, raw persistence baselines)
        self.inputs = []
        self.targets = []
        self.persistences = []
        self.channel_indices = []
        self.target_days = []

        for start_t in valid_starts:
            target_t = start_t + lookback + horizon - 1
            persistence_t = start_t + lookback - 1  # naive persistence baseline is the last seen day

            for ch in range(num_channels):
                x_seq = norm_data[start_t : start_t + lookback, ch, :]           # (L, F)
                y_target = norm_data[target_t, ch, :]                            # (F,)
                y_persist = norm_data[persistence_t, ch, :]                      # (F,)

                self.inputs.append(x_seq)
                self.targets.append(y_target)
                self.persistences.append(y_persist)
                self.channel_indices.append(ch)
                self.target_days.append(target_t)

        self.inputs = torch.tensor(np.array(self.inputs), dtype=torch.float32)
        self.targets = torch.tensor(np.array(self.targets), dtype=torch.float32)
        self.persistences = torch.tensor(np.array(self.persistences), dtype=torch.float32)

    def __len__(self) -> int:
        return len(self.inputs)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        return {
            "input": self.inputs[idx],             # (L, F)
            "target": self.targets[idx],           # (F,)
            "persistence": self.persistences[idx], # (F,)
            "channel": self.channel_indices[idx],
            "target_day": self.target_days[idx]
        }
