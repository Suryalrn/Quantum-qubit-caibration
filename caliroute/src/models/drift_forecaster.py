"""
LSTM Calibration Drift Forecaster for CaliRoute Phase 5.

This module models temporal calibration drift in superconducting quantum processors.
Using a residual recurrent architecture (PyTorch LSTM), it predicts future physical
calibration metrics (qubit T1, T2, readout error, and coupler gate errors) at time
t + Delta t from historical telemetry sequences up to time t.
"""

import sys
import copy
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

import numpy as np
import torch
import torch.nn as nn

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("caliroute.models.drift_forecaster")


class DriftLSTMBlock(nn.Module):
    """
    Residual Recurrent Neural Network for temporal calibration drift.
    Models the change: y_hat = x_{t-1} + MLP(LSTM(x_{t-L : t}))
    """
    def __init__(
        self,
        input_dim: int,
        hidden_dim: int = 64,
        num_layers: int = 2,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )

        self.head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, input_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Tensor of shape (batch_size, sequence_length, input_dim)
        Returns:
            Tensor of shape (batch_size, input_dim) representing predicted values at t + 1
        """
        # x[:, -1, :] is the last observed time step (persistence baseline)
        last_step = x[:, -1, :]

        lstm_out, _ = self.lstm(x)  # (batch_size, seq_len, hidden_dim)
        last_hidden = lstm_out[:, -1, :]  # (batch_size, hidden_dim)

        # Predict residual deviation from the last observed state
        delta = self.head(last_hidden)  # (batch_size, input_dim)
        prediction = last_step + delta

        return prediction


class CalibrationDriftForecaster(nn.Module):
    """
    Dual-branch time-series forecaster combining:
    1. QubitDriftForecaster: predicts [T1, T2, Readout Error] across 156 qubits
    2. CouplerDriftForecaster: predicts [log_cz_error, log_rzz_error] across physical couplers
    """
    def __init__(
        self,
        qubit_feat_dim: int = 3,
        coupler_feat_dim: int = 2,
        hidden_dim: int = 64,
        num_layers: int = 2,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.qubit_feat_dim = qubit_feat_dim
        self.coupler_feat_dim = coupler_feat_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        self.qubit_model = DriftLSTMBlock(
            input_dim=qubit_feat_dim,
            hidden_dim=hidden_dim,
            num_layers=num_layers,
            dropout=dropout,
        )

        self.coupler_model = DriftLSTMBlock(
            input_dim=coupler_feat_dim,
            hidden_dim=hidden_dim,
            num_layers=num_layers,
            dropout=dropout,
        )

    def predict_qubits(self, x_qubits: torch.Tensor) -> torch.Tensor:
        """Forecasts normalized qubit metrics."""
        return self.qubit_model(x_qubits)

    def predict_couplers(self, x_couplers: torch.Tensor) -> torch.Tensor:
        """Forecasts normalized coupler metrics."""
        return self.coupler_model(x_couplers)

    def forecast_snapshot(
        self,
        recent_qubits_raw: np.ndarray,      # (lookback, 156, 3)
        recent_couplers_raw: np.ndarray,    # (lookback, num_couplers, 2) in log-space
        base_snapshot: Dict[str, Any],
        q_mean: np.ndarray,
        q_std: np.ndarray,
        c_mean: np.ndarray,
        c_std: np.ndarray,
        coupler_keys: List[str],
        device: torch.device = torch.device("cpu"),
    ) -> Dict[str, Any]:
        """
        Given the most recent lookback days of physical telemetry and a base snapshot,
        evaluates the forecaster and produces an updated, valid calibration snapshot
        representing the predicted state of the quantum processor at execution time.
        """
        self.eval()
        with torch.no_grad():
            # 1. Normalize qubit sequences: (lookback, 156, 3) -> transpose to (156, lookback, 3)
            q_norm = (recent_qubits_raw - q_mean) / q_std
            q_inputs = np.transpose(q_norm, (1, 0, 2))  # (156, L, 3)
            q_t = torch.tensor(q_inputs, dtype=torch.float32, device=device)

            q_preds_norm = self.predict_qubits(q_t).cpu().numpy()  # (156, 3)
            # Denormalize back to physical units
            q_preds = q_preds_norm * q_std[0] + q_mean[0]  # (156, 3)

            # Clamp to physical bounds
            q_preds[:, 0] = np.maximum(q_preds[:, 0], 0.0)      # T1 >= 0
            q_preds[:, 1] = np.maximum(q_preds[:, 1], 0.0)      # T2 >= 0
            q_preds[:, 2] = np.clip(q_preds[:, 2], 0.0, 0.5)    # Readout error in [0, 0.5]

            # 2. Normalize coupler sequences (in log space): (lookback, num_c, 2) -> (num_c, lookback, 2)
            c_norm = (recent_couplers_raw - c_mean) / c_std
            c_inputs = np.transpose(c_norm, (1, 0, 2))  # (num_c, L, 2)
            c_t = torch.tensor(c_inputs, dtype=torch.float32, device=device)

            c_preds_norm = self.predict_couplers(c_t).cpu().numpy()  # (num_c, 2)
            c_preds_log = c_preds_norm * c_std[0] + c_mean[0]        # (num_c, 2) in log-space

            # Invert log transform: error = 10^(log_error) - 1e-7
            c_preds = np.power(10.0, c_preds_log) - 1e-7
            c_preds[:, 0] = np.clip(c_preds[:, 0], 1e-5, 0.5)  # CZ error in [1e-5, 0.5]
            c_preds[:, 1] = np.clip(c_preds[:, 1], 1e-5, 0.5)  # RZZ error in [1e-5, 0.5]

        # 3. Deepcopy base snapshot and update with predicted values
        forecasted_snapshot = copy.deepcopy(base_snapshot)
        meta = forecasted_snapshot.get("metadata", {})
        meta["is_forecasted"] = True
        meta["forecast_model"] = "CalibrationDriftForecaster_LSTM"

        # Update qubits
        qubits_dict = forecasted_snapshot.setdefault("qubits", {})
        for q_idx in range(len(q_preds)):
            q_str = str(q_idx)
            q_dict = qubits_dict.setdefault(q_str, {})
            # If qubit was already dead (like 146), preserve dead state
            if q_dict.get("t1", 0.0) <= 0.0 and q_idx in {113, 121, 131, 146}:
                q_dict["t1"] = 0.0
                q_dict["t2"] = 0.0
                q_dict["readout_error"] = 0.4968
            else:
                q_dict["t1"] = float(q_preds[q_idx, 0])
                q_dict["t2"] = float(q_preds[q_idx, 1])
                q_dict["readout_error"] = float(q_preds[q_idx, 2])

        # Update edges
        edges_dict = forecasted_snapshot.setdefault("edges", {})
        for c_idx, c_key in enumerate(coupler_keys):
            cz_err = float(c_preds[c_idx, 0])
            if c_key in edges_dict:
                edges_dict[c_key]["gate_error"] = cz_err
            else:
                parts = c_key.split("_")
                if len(parts) == 2:
                    edges_dict[c_key] = {
                        "qubits": [int(parts[0]), int(parts[1])],
                        "gate": "cz",
                        "gate_error": cz_err,
                        "gate_length": 6.8e-08,
                    }

        return forecasted_snapshot
