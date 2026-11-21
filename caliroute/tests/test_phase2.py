"""
Test suite for Phase 2: Fidelity Proxy (NOT Quantum Simulation).

Verifies:
1. Fidelity proxy computes closed-form arithmetic over calibration numbers without simulation.
2. All probability factors (P_gate, P_readout, P_decoherence, Fidelity_Proxy) are bounded in [0, 1].
3. Any (circuit, mapping, snapshot) triple can be scored.
4. Coherence and idle time model correctly penalizes idle durations (T1, T2 decoherence).
5. Calibration-aware quality difference: High-error or faulty physical qubits yield lower scores
   than high-fidelity qubits.
6. SABRE baseline proxy scores are recorded for all 15 benchmark circuits in results/.
"""

import os
import json
import math
from pathlib import Path
import pytest
import pandas as pd
from qiskit import QuantumCircuit, qpy

try:
    from caliroute.src.scoring.fidelity_proxy import (
        compute_fidelity_proxy,
        compute_fidelity_proxy_for_transpiled,
        ProxyScore,
    )
    from caliroute.src.collect.snapshot_calibration import get_latest_calibration_snapshot
    from caliroute.src.collect.load_circuits import load_benchmark_circuits
except ImportError:
    from src.scoring.fidelity_proxy import (
        compute_fidelity_proxy,
        compute_fidelity_proxy_for_transpiled,
        ProxyScore,
    )
    from src.collect.snapshot_calibration import get_latest_calibration_snapshot
    from src.collect.load_circuits import load_benchmark_circuits


@pytest.fixture
def snapshot():
    """Loads latest calibration snapshot."""
    snap_dir = Path("data/raw/calibration")
    return get_latest_calibration_snapshot(str(snap_dir))


@pytest.fixture
def sample_transpiled_circuit():
    """Loads a transpiled circuit from Phase 1."""
    tc_path = Path("data/processed/sabre_transpiled/dj_5q_sabre.qpy")
    assert tc_path.exists(), "Sample transpiled circuit not found"
    with open(tc_path, "rb") as f:
        return qpy.load(f)[0]


def test_fidelity_proxy_for_transpiled_bounds(sample_transpiled_circuit, snapshot):
    """Asserts that all probability outputs are bounded in [0, 1] and log_fidelity is non-positive."""
    score = compute_fidelity_proxy_for_transpiled(sample_transpiled_circuit, snapshot)

    assert isinstance(score, ProxyScore)
    assert 0.0 <= score.fidelity_proxy <= 1.0
    assert 0.0 <= score.p_gate_survival <= 1.0
    assert 0.0 <= score.p_readout_survival <= 1.0
    assert 0.0 <= score.p_decoherence_survival <= 1.0
    assert score.log_fidelity <= 0.0
    assert score.makespan_seconds > 0.0
    assert score.total_idle_time_seconds >= 0.0
    assert score.two_qubit_gate_count > 0
    assert score.total_gate_count > 0
    assert len(score.active_qubits) > 0


def test_score_any_circuit_mapping_snapshot_triple(snapshot):
    """Asserts that compute_fidelity_proxy can score an arbitrary (circuit, mapping, snapshot) triple."""
    # Build a simple 3-qubit logical test circuit
    qc = QuantumCircuit(3, name="test_ghz3")
    qc.h(0)
    qc.cx(0, 1)
    qc.cx(1, 2)
    qc.measure_all()

    # Candidate mapping 1: contiguous healthy qubits [0, 1, 2]
    mapping_healthy = {0: 0, 1: 1, 2: 2}
    score_healthy = compute_fidelity_proxy(qc, mapping_healthy, snapshot)

    assert isinstance(score_healthy, ProxyScore)
    assert 0.0 <= score_healthy.fidelity_proxy <= 1.0
    assert score_healthy.circuit_name == "test_ghz3"
    assert score_healthy.makespan_seconds > 0.0


def test_calibration_sensitivity_penalizes_faulty_subgraph(snapshot):
    """
    Asserts that mapping to an edge known to have high/faulty gate error
    results in a lower score than mapping to a healthy low-error edge.
    """
    qc = QuantumCircuit(2, name="test_bell")
    qc.h(0)
    qc.cx(0, 1)
    qc.measure_all()

    # Dynamically select lowest error edge and highest error edge from live hardware snapshot
    edges = snapshot.get("edges", {})
    sorted_edges = sorted(edges.values(), key=lambda e: e.get("gate_error", 0))
    healthy_pair = tuple(sorted_edges[0]["qubits"])
    faulty_pair = tuple(sorted_edges[-1]["qubits"])

    score_healthy = compute_fidelity_proxy(qc, {0: healthy_pair[0], 1: healthy_pair[1]}, snapshot)
    score_faulty = compute_fidelity_proxy(qc, {0: faulty_pair[0], 1: faulty_pair[1]}, snapshot)

    assert score_healthy.fidelity_proxy > score_faulty.fidelity_proxy, (
        f"Healthy mapping ({score_healthy.fidelity_proxy}) must outperform "
        f"faulty mapping ({score_faulty.fidelity_proxy})"
    )


def test_decoherence_idle_penalty_model(snapshot):
    """
    Asserts that longer idle times strictly decrease decoherence survival factor.
    """
    qc_short = QuantumCircuit(2, name="short_circ")
    qc_short.x(0)
    qc_short.cx(0, 1)

    # Longer circuit with same initial operations plus idle delay on qubit 1
    qc_long = QuantumCircuit(2, name="long_circ")
    qc_long.x(0)
    # Series of 1Q gates on qubit 0 while qubit 1 sits idle
    for _ in range(20):
        qc_long.x(0)
    qc_long.cx(0, 1)

    mapping = {0: 0, 1: 1}
    score_short = compute_fidelity_proxy(qc_short, mapping, snapshot)
    score_long = compute_fidelity_proxy(qc_long, mapping, snapshot)

    assert score_long.makespan_seconds > score_short.makespan_seconds
    assert score_long.total_idle_time_seconds > score_short.total_idle_time_seconds
    assert score_long.p_decoherence_survival < score_short.p_decoherence_survival


def test_sabre_proxy_scores_recorded_for_all_circuits():
    """Asserts that SABRE proxy scores are recorded for all 15 benchmark circuits."""
    csv_path = Path("results/sabre_proxy_scores.csv")
    json_path = Path("results/sabre_proxy_scores.json")

    assert csv_path.exists(), "results/sabre_proxy_scores.csv does not exist"
    assert json_path.exists(), "results/sabre_proxy_scores.json does not exist"

    df = pd.read_csv(csv_path)
    assert len(df) == 15, f"Expected 15 rows in proxy scores CSV, found {len(df)}"

    required_cols = [
        "circuit_id",
        "num_qubits",
        "two_qubit_gates",
        "total_gates",
        "depth",
        "makespan_us",
        "p_gate_survival",
        "p_readout_survival",
        "p_decoherence_survival",
        "fidelity_proxy",
        "log_fidelity",
    ]
    for col in required_cols:
        assert col in df.columns, f"Missing required column {col} in CSV"

    # Ensure no NaN values
    assert not df[required_cols].isna().any().any(), "Found NaN values in proxy scores table"
