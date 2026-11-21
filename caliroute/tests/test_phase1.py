"""
Test suite for Phase 1: Data Pipeline Checkpoint.

Verifies:
1. Real/authentic hardware calibration snapshot is extracted, saved, and contains
   per-qubit T1, T2, readout error, and per-edge gate errors and lengths.
2. Benchmark circuits across algorithms and qubit-count tiers are loaded.
3. Qiskit's SABRE baseline layout and routing transpilation outputs are recorded
   (layouts, two-qubit gate counts, depth) for all benchmark circuits.
"""

import os
import json
from pathlib import Path
import pytest
import pandas as pd
from qiskit import QuantumCircuit, qpy

try:
    from caliroute.src.collect.snapshot_calibration import (
        load_calibration_snapshot,
        get_latest_calibration_snapshot,
    )
    from caliroute.src.collect.load_circuits import (
        load_benchmark_circuits,
        DEFAULT_ALGORITHMS,
        DEFAULT_TIERS,
    )
    from caliroute.src.baselines.sabre_baseline import (
        load_sabre_baseline_results,
    )
except ImportError:
    from src.collect.snapshot_calibration import (
        load_calibration_snapshot,
        get_latest_calibration_snapshot,
    )
    from src.collect.load_circuits import (
        load_benchmark_circuits,
        DEFAULT_ALGORITHMS,
        DEFAULT_TIERS,
    )
    from src.baselines.sabre_baseline import (
        load_sabre_baseline_results,
    )


def test_calibration_snapshot_saved_and_valid():
    """Asserts that at least one valid calibration snapshot is saved with required fields."""
    calib_dir = Path("data/raw/calibration")
    assert calib_dir.exists(), f"Calibration directory {calib_dir} does not exist"

    # Load latest snapshot
    snapshot = get_latest_calibration_snapshot(str(calib_dir))
    assert snapshot is not None
    assert "metadata" in snapshot
    assert "qubits" in snapshot
    assert "edges" in snapshot
    assert "coupling_map" in snapshot

    meta = snapshot["metadata"]
    assert meta["num_qubits"] > 0
    assert "timestamp" in meta
    assert len(snapshot["qubits"]) == meta["num_qubits"]

    # Verify per-qubit calibration numbers (T1, T2, readout error)
    positive_t1_count = 0
    for q_idx_str, q_data in snapshot["qubits"].items():
        assert "t1" in q_data
        assert "t2" in q_data
        assert "readout_error" in q_data
        assert q_data["t1"] >= 0.0, f"Qubit {q_idx_str} has negative T1"
        assert q_data["t2"] >= 0.0, f"Qubit {q_idx_str} has negative T2"
        assert 0.0 <= q_data["readout_error"] <= 1.0, f"Qubit {q_idx_str} readout error out of range"
        if q_data["t1"] > 0.0:
            positive_t1_count += 1

    # In real quantum processors, at least 95% of qubits must be active and calibrated
    assert positive_t1_count >= 0.95 * meta["num_qubits"]

    # Verify per-edge gate errors
    assert len(snapshot["edges"]) > 0
    for edge_id, edge_data in snapshot["edges"].items():
        assert "gate_error" in edge_data
        assert "gate_length" in edge_data
        assert 0.0 <= edge_data["gate_error"] <= 1.0


def test_benchmark_circuits_loaded_across_tiers():
    """Asserts that benchmark circuits across tiers are loaded and valid."""
    circ_dir = Path("data/circuits")
    assert circ_dir.exists(), f"Circuits directory {circ_dir} does not exist"

    circuits = load_benchmark_circuits(str(circ_dir), DEFAULT_ALGORITHMS, DEFAULT_TIERS)
    expected_total = len(DEFAULT_ALGORITHMS) * len(DEFAULT_TIERS)
    assert len(circuits) == expected_total, f"Expected {expected_total} circuits, found {len(circuits)}"

    for cid, qc in circuits.items():
        assert isinstance(qc, QuantumCircuit)
        parts = cid.rsplit("_", 1)
        tier = int(parts[1].replace("q", ""))
        assert qc.num_qubits == tier, f"Circuit {cid} expected {tier} qubits, got {qc.num_qubits}"
        assert qc.size() > 0


def test_sabre_baseline_outputs_recorded_for_all():
    """Asserts that SABRE baseline outputs (mapping, 2Q gates, depth) are recorded for all benchmarks."""
    json_path = Path("results/sabre_baseline.json")
    csv_path = Path("results/sabre_baseline.csv")

    assert json_path.exists(), "results/sabre_baseline.json does not exist"
    assert csv_path.exists(), "results/sabre_baseline.csv does not exist"

    results = load_sabre_baseline_results(str(json_path))
    df = pd.read_csv(csv_path)

    expected_total = len(DEFAULT_ALGORITHMS) * len(DEFAULT_TIERS)
    assert len(results) == expected_total
    assert len(df) == expected_total

    for cid, res in results.items():
        assert "num_qubits" in res
        assert "initial_layout" in res
        assert "two_qubit_gate_count" in res
        assert "depth" in res
        assert "transpiled_circuit_path" in res

        # Initial layout must map every logical qubit
        init_layout = res["initial_layout"]
        assert len(init_layout) == res["num_qubits"], f"Circuit {cid} has incomplete layout mapping"

        # Check transpiled file exists and loads
        tc_path = Path(res["transpiled_circuit_path"])
        assert tc_path.exists(), f"Transpiled circuit file {tc_path} does not exist"
        with open(tc_path, "rb") as f:
            tc = qpy.load(f)[0]
            assert isinstance(tc, QuantumCircuit)
            assert tc.depth() == res["depth"]
