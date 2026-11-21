"""
Snapshot Calibration Collector for CaliRoute.

This module retrieves backend properties from a real IBM superconducting quantum
processor (or genuine calibration snapshots via IBM fake provider backends when
offline or without an API key), extracts key calibration parameters (T1, T2,
readout error, edge gate errors, and gate durations), and persists them as timestamped JSON.

Hardware calibration parameters extracted:
- Qubit T1 (relaxation time, s)
- Qubit T2 (dephasing time, s)
- Qubit readout error (SPAM error)
- Qubit readout length (s)
- Directed edge two-qubit gate errors and lengths (e.g., ECR or CX)
- Single-qubit gate errors and lengths (e.g., sx, x)
"""

import os
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

import yaml

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("caliroute.collect.snapshot")


def get_backend_instance(
    backend_name: str = "ibm_sherbrooke",
    token: Optional[str] = None,
    channel: str = "ibm_quantum",
    fallback_to_mock: bool = True,
):
    """
    Attempt to connect to a live IBM Quantum backend via QiskitRuntimeService;
    if token is not present or live service fails and fallback_to_mock is True,
    instantiate the corresponding authentic calibration provider (e.g., FakeSherbrooke).
    """
    # 1. Try real IBM Quantum service if token or saved account exists
    auth_token = token or os.environ.get("IBM_QUANTUM_TOKEN") or os.environ.get("QISKIT_IBM_TOKEN")
    try:
        from qiskit_ibm_runtime import QiskitRuntimeService
        if auth_token:
            service = QiskitRuntimeService(channel=channel, token=auth_token)
        else:
            # Load default saved account directly
            service = QiskitRuntimeService()
        backend = service.backend(backend_name)
        logger.info(f"Connected to live IBM Quantum service for backend: {backend_name}")
        return backend, False
    except Exception as e:
        logger.info(f"Live IBM service connection not established ({e}).")

    if not fallback_to_mock:
        raise ConnectionError(
            f"Could not connect to live backend '{backend_name}' and fallback_to_mock=False."
        )

    # 2. Fallback to authentic real calibration snapshots via FakeProvider
    logger.info(f"Falling back to authentic calibration snapshot provider for '{backend_name}'...")
    from qiskit_ibm_runtime.fake_provider import (
        FakeSherbrooke,
        FakeBrisbane,
        FakeKyoto,
        FakeTorino,
        FakeManilaV2,
    )

    name_lower = backend_name.lower().replace("-", "_")
    if "sherbrooke" in name_lower:
        backend = FakeSherbrooke()
    elif "brisbane" in name_lower:
        backend = FakeBrisbane()
    elif "kyoto" in name_lower:
        backend = FakeKyoto()
    elif "torino" in name_lower:
        backend = FakeTorino()
    elif "manila" in name_lower:
        backend = FakeManilaV2()
    else:
        # Default to FakeSherbrooke (127-qubit flagship IBM processor)
        logger.warning(f"Backend '{backend_name}' not in recognized fake map; defaulting to FakeSherbrooke.")
        backend = FakeSherbrooke()

    return backend, True


def extract_calibration_data(backend, is_mock: bool = False) -> Dict[str, Any]:
    """
    Extracts structured calibration metrics from a backend.properties() object
    and backend target/coupling map.

    Returns a serializable dictionary containing:
    - metadata (backend name, num_qubits, timestamp, is_mock)
    - qubits: dict of qubit_idx -> {t1, t2, readout_error, prob_meas0_prep1, ...}
    - edges: dict of "u_v" -> {qubits: [u, v], gate: str, gate_error: float, gate_length: float}
    - single_qubit_gates: dict of qubit_idx -> {gate_name: {gate_error, gate_length}}
    - coupling_map: list of [u, v] pairs
    """
    props = backend.properties()
    if props is None:
        raise ValueError(f"Backend {backend.name} does not have properties available.")

    num_qubits = getattr(backend, "num_qubits", len(props.qubits))
    backend_name = getattr(backend, "name", "unknown")

    # Coupling map edges
    if hasattr(backend, "coupling_map") and backend.coupling_map is not None:
        if hasattr(backend.coupling_map, "get_edges"):
            coupling_edges = [list(e) for e in backend.coupling_map.get_edges()]
        else:
            coupling_edges = [list(e) for e in backend.coupling_map]
    else:
        coupling_edges = []

    # Qubit calibration data
    qubits_data: Dict[str, Dict[str, Any]] = {}
    for q_idx in range(num_qubits):
        # Extract direct named parameters from props.qubits
        q_items: Dict[str, Any] = {}
        if hasattr(props, "qubits") and q_idx < len(props.qubits):
            q_items = {item.name: item.value for item in props.qubits[q_idx]}

        # T1 (in seconds)
        try:
            t1_val = props.t1(q_idx)
        except Exception:
            t1_raw = q_items.get("T1", 0.0)
            t1_val = float(t1_raw) * 1e-6 if t1_raw else 0.0

        # T2 (in seconds)
        try:
            t2_val = props.t2(q_idx)
        except Exception:
            t2_raw = q_items.get("T2", 0.0)
            t2_val = float(t2_raw) * 1e-6 if t2_raw else 0.0

        # Readout error
        try:
            ro_err = props.readout_error(q_idx)
        except Exception:
            ro_err = q_items.get("readout_error", 0.0)

        # Readout length (in seconds)
        try:
            ro_len = props.readout_length(q_idx)
        except Exception:
            ro_len_raw = q_items.get("readout_length", 0.0)
            ro_len = float(ro_len_raw) * 1e-9 if ro_len_raw else 0.0

        # SPAM assignment probabilities (prob_meas0_prep1 & prob_meas1_prep0)
        p01 = q_items.get("prob_meas0_prep1")
        if p01 is None and hasattr(props, "prob_meas0_prep1"):
            try:
                p01 = props.prob_meas0_prep1(q_idx)
            except Exception:
                p01 = 0.0

        p10 = q_items.get("prob_meas1_prep0")
        if p10 is None and hasattr(props, "prob_meas1_prep0"):
            try:
                p10 = props.prob_meas1_prep0(q_idx)
            except Exception:
                p10 = 0.0

        init_err = q_items.get("init_error", 0.0)

        qubits_data[str(q_idx)] = {
            "t1": float(t1_val) if t1_val is not None else 0.0,
            "t2": float(t2_val) if t2_val is not None else 0.0,
            "readout_error": float(ro_err) if ro_err is not None else 0.0,
            "readout_length": float(ro_len) if ro_len is not None else 0.0,
            "prob_meas0_prep1": float(p01) if p01 is not None else 0.0,
            "prob_meas1_prep0": float(p10) if p10 is not None else 0.0,
            "init_error": float(init_err) if init_err is not None else 0.0,
        }

    # Two-qubit gate errors and single-qubit gate errors from props.gates
    edges_data: Dict[str, Dict[str, Any]] = {}
    sq_gates_data: Dict[str, Dict[str, Dict[str, float]]] = {str(q): {} for q in range(num_qubits)}

    for gate_record in props.gates:
        g_name = gate_record.gate
        g_qubits = gate_record.qubits
        g_err = None
        g_len = None

        for param in gate_record.parameters:
            if param.name == "gate_error":
                g_err = float(param.value)
            elif param.name == "gate_length":
                # convert to seconds if needed (unit usually ns in raw parameter)
                unit = getattr(param, "unit", "")
                val = float(param.value)
                if unit == "ns":
                    val *= 1e-9
                g_len = val

        if len(g_qubits) == 2:
            u, v = g_qubits[0], g_qubits[1]
            key = f"{u}_{v}"
            edges_data[key] = {
                "qubits": [u, v],
                "gate": g_name,
                "gate_error": g_err if g_err is not None else 0.0,
                "gate_length": g_len if g_len is not None else 0.0,
            }
        elif len(g_qubits) == 1:
            q = str(g_qubits[0])
            if q in sq_gates_data:
                sq_gates_data[q][g_name] = {
                    "gate_error": g_err if g_err is not None else 0.0,
                    "gate_length": g_len if g_len is not None else 0.0,
                }

    timestamp_iso = datetime.now(timezone.utc).isoformat()

    snapshot = {
        "metadata": {
            "backend_name": backend_name,
            "num_qubits": num_qubits,
            "timestamp": timestamp_iso,
            "is_mock": is_mock,
            "extracted_at_unix": datetime.now(timezone.utc).timestamp(),
        },
        "coupling_map": coupling_edges,
        "qubits": qubits_data,
        "edges": edges_data,
        "single_qubit_gates": sq_gates_data,
    }

    return snapshot


def save_calibration_snapshot(
    snapshot: Dict[str, Any],
    output_dir: str = "data/raw/calibration"
) -> Tuple[str, str]:
    """
    Saves snapshot JSON to output_dir with timestamped filename and latest alias.
    Returns (timestamped_filepath, latest_filepath).
    """
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    backend_name = snapshot["metadata"]["backend_name"]
    # File-safe timestamp string
    ts_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    timestamped_file = out_path / f"calibration_{backend_name}_{ts_str}.json"
    latest_file = out_path / f"calibration_{backend_name}_latest.json"

    with open(timestamped_file, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2)

    with open(latest_file, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2)

    logger.info(f"Saved calibration snapshot to: {timestamped_file}")
    logger.info(f"Updated latest snapshot to: {latest_file}")
    return str(timestamped_file), str(latest_file)


def load_calibration_snapshot(filepath: str) -> Dict[str, Any]:
    """Loads a calibration snapshot from a JSON file."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def get_latest_calibration_snapshot(
    dir_path: str = "data/raw/calibration",
    backend_name: Optional[str] = None
) -> Dict[str, Any]:
    """Retrieves the most recent calibration snapshot JSON in dir_path."""
    p = Path(dir_path)
    if not p.exists():
        raise FileNotFoundError(f"Calibration directory not found: {dir_path}")

    # Check for latest file first
    if backend_name:
        latest = p / f"calibration_{backend_name}_latest.json"
        if latest.exists():
            return load_calibration_snapshot(str(latest))

    # Otherwise find latest by timestamp pattern
    pattern = f"calibration_{backend_name}*.json" if backend_name else "calibration_*.json"
    matched_files = sorted(p.glob(pattern), key=os.path.getmtime, reverse=True)
    if not matched_files:
        raise FileNotFoundError(f"No calibration snapshots found matching '{pattern}' in {dir_path}")

    return load_calibration_snapshot(str(matched_files[0]))


def pull_backend_calibration(
    backend_name: str = "ibm_sherbrooke",
    token: Optional[str] = None,
    channel: str = "ibm_quantum",
    fallback_to_mock: bool = True,
    output_dir: str = "data/raw/calibration"
) -> Tuple[Dict[str, Any], str]:
    """
    High-level orchestrator: connects/loads backend, extracts properties,
    and saves timestamped JSON.
    """
    backend, is_mock = get_backend_instance(
        backend_name=backend_name,
        token=token,
        channel=channel,
        fallback_to_mock=fallback_to_mock
    )
    snapshot = extract_calibration_data(backend, is_mock=is_mock)
    ts_path, _ = save_calibration_snapshot(snapshot, output_dir=output_dir)
    return snapshot, ts_path


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Snapshot IBM Quantum Backend Calibration")
    parser.add_argument("--config", type=str, default="configs/default.yaml", help="Path to YAML config")
    parser.add_argument("--backend", type=str, default=None, help="Backend name")
    parser.add_argument("--outdir", type=str, default=None, help="Output directory")
    args = parser.parse_args()

    # Load config if present
    cfg = {}
    if os.path.exists(args.config):
        with open(args.config, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f)

    b_name = args.backend or cfg.get("backend", {}).get("name", "ibm_sherbrooke")
    out_dir = args.outdir or cfg.get("paths", {}).get("raw_calibration_dir", "data/raw/calibration")
    fb = cfg.get("backend", {}).get("fallback_to_mock", True)
    tok = cfg.get("backend", {}).get("token", None)
    chan = cfg.get("backend", {}).get("channel", "ibm_quantum")

    logger.info(f"Extracting calibration snapshot for backend: {b_name}...")
    snap, path = pull_backend_calibration(
        backend_name=b_name,
        token=tok,
        channel=chan,
        fallback_to_mock=fb,
        output_dir=out_dir
    )
    logger.info(f"Snapshot extraction complete! Saved {snap['metadata']['num_qubits']} qubits, {len(snap['edges'])} edges to {path}")
