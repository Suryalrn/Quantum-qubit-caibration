"""
Root Execution Script: Train Phase 5 Calibration Drift Forecaster.

Run with:
    python run_train_forecaster.py
"""

import sys
from pathlib import Path

# Add project root to sys.path
REPO_ROOT = Path(__file__).resolve().parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.train.train_forecaster import train_drift_forecaster

if __name__ == "__main__":
    train_drift_forecaster(
        gate_history_csv="data/gate_history_ibm_kingston_2026-09-14.csv",
        qubit_history_csv="data/qubit_history_ibm_kingston_2026-09-14.csv",
        epochs=50,
        lookback=5,
        batch_size=64,
        lr=1e-3,
        hidden_dim=64,
        num_layers=2,
    )
