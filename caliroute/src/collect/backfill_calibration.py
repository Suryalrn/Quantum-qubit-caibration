"""
Historical Calibration Backfiller for CaliRoute.

Pulls historical calibration snapshots from IBM Quantum for a range of past
dates (e.g., past 14-30 days) using backend.properties(datetime=target_date)
to generate the time-series dataset needed for Phase 5 (Drift Forecaster).

Note: This only queries backend metadata and consumes 0 quantum runtime seconds.
Requires an active IBM Quantum API token or saved IBM Quantum account credentials.
"""

import os
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Tuple, Dict, Any, List

import pandas as pd
import yaml

from .snapshot_calibration import extract_calibration_data, save_calibration_snapshot

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("caliroute.collect.backfill")


def get_ibm_service(token: Optional[str] = None, channel: str = "ibm_quantum_platform"):
    """Instantiates QiskitRuntimeService."""
    from qiskit_ibm_runtime import QiskitRuntimeService
    auth_token = token or os.environ.get("IBM_QUANTUM_TOKEN") or os.environ.get("QISKIT_IBM_TOKEN")
    if auth_token:
        return QiskitRuntimeService(channel=channel, token=auth_token)
    return QiskitRuntimeService(channel=channel)


def backfill_calibration_history(
    backend_name: str = "ibm_sherbrooke",
    days: int = 30,
    output_dir: str = "data/raw/calibration",
    token: Optional[str] = None,
    channel: str = "ibm_quantum_platform"
) -> Tuple[List[str], pd.DataFrame]:
    """
    Attempts to pull one calibration snapshot per day for the past `days` days.
    Saves snapshots as JSON in output_dir and compiles a summary DataFrame.
    """
    try:
        service = get_ibm_service(token=token, channel=channel)
        backend = service.backend(backend_name)
    except Exception as e:
        logger.error(f"Cannot connect to live IBM backend '{backend_name}' for historical backfill: {e}")
        logger.info("For offline/local development, Phase 5 supports synthetic drift modeling per project guidelines.")
        return [], pd.DataFrame()

    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    today = datetime.now(timezone.utc)
    saved_files = []
    seen_timestamps = set()
    summary_rows = []

    logger.info(f"Querying {days} days of historical calibration for {backend.name}...")

    for i in range(days):
        target_date = today - timedelta(days=i)
        try:
            properties = backend.properties(datetime=target_date)
        except Exception as e:
            logger.info(f"  [skip] {target_date.date()}: {e}")
            continue

        if properties is None:
            logger.info(f"  [skip] {target_date.date()}: No calibration snapshot returned.")
            continue

        actual_time = str(getattr(properties, "last_update_date", target_date.isoformat()))
        if actual_time in seen_timestamps:
            logger.info(f"  [dup ] {target_date.date()}: Duplicate timestamp ({actual_time}), skipping.")
            continue
        seen_timestamps.add(actual_time)

        # Extract structured snapshot
        # Temporarily mock backend.properties returning this historical properties
        class HistoricalBackendWrapper:
            def __init__(self, base_backend, props):
                self._base = base_backend
                self._props = props
                self.name = base_backend.name
                self.num_qubits = getattr(base_backend, "num_qubits", len(props.qubits))
                self.coupling_map = getattr(base_backend, "coupling_map", None)

            def properties(self):
                return self._props

        wrapper = HistoricalBackendWrapper(backend, properties)
        snapshot = extract_calibration_data(wrapper, is_mock=False)
        snapshot["metadata"]["historical_requested_date"] = target_date.isoformat()
        snapshot["metadata"]["historical_actual_date"] = actual_time

        ts_clean = actual_time.replace(":", "").replace("-", "").replace(" ", "_")[:15]
        file_path = out_path / f"calibration_{backend.name}_{ts_clean}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(snapshot, f, indent=2)

        saved_files.append(str(file_path))
        logger.info(f"  [ok  ] {target_date.date()}: saved snapshot from {actual_time} -> {file_path}")

        # Compute summary metrics across qubits
        avg_t1 = sum(q["t1"] for q in snapshot["qubits"].values()) / len(snapshot["qubits"])
        avg_t2 = sum(q["t2"] for q in snapshot["qubits"].values()) / len(snapshot["qubits"])
        avg_ro = sum(q["readout_error"] for q in snapshot["qubits"].values()) / len(snapshot["qubits"])
        summary_rows.append({
            "target_date": str(target_date.date()),
            "actual_time": actual_time,
            "avg_t1_us": avg_t1 * 1e6,
            "avg_t2_us": avg_t2 * 1e6,
            "avg_readout_error": avg_ro,
            "filepath": str(file_path)
        })

    summary_df = pd.DataFrame(summary_rows)
    if not summary_df.empty:
        summary_csv = out_path / f"historical_summary_{backend.name}.csv"
        summary_df.to_csv(summary_csv, index=False)
        logger.info(f"Saved historical summary table to: {summary_csv}")

    return saved_files, summary_df


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Backfill historical calibration data from IBM Quantum")
    parser.add_argument("--backend", default="ibm_sherbrooke", help="IBM backend name")
    parser.add_argument("--days", type=int, default=30, help="Days of history to attempt pulling")
    parser.add_argument("--outdir", default="data/raw/calibration", help="Output directory")
    args = parser.parse_args()

    saved, df = backfill_calibration_history(backend_name=args.backend, days=args.days, output_dir=args.outdir)
    print(f"Backfill complete! Collected {len(saved)} distinct snapshots.")
