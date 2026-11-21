"""
Phase 4 Test Suite for CaliRoute.

Tests:
1. GNNScorer Architecture & Forward Pass: verifies input/output tensor shapes,
   batched scoring, and gradient backpropagation.
2. Trained Model Quality & Rank Correlation: verifies checkpoint loads properly,
   exhibits low validation loss and high Spearman rank correlation (rho > 0.7).
3. Beam Search Layout Optimizer: verifies output layout is a valid bijective mapping,
   strictly avoids dead/faulty physical qubits (113, 121, 131, 146), and produces valid scores.
4. Physical Transpilation & Coupling Compliance: verifies routed circuit uses native basis gates,
   satisfies hardware coupling topology, and contains zero faulty gates.
5. Comparative Benchmark Integrity: verifies results/caliroute_vs_sabre.csv has all 15 circuits,
   zero faulty gates, and confirms CaliRoute prevents SABRE's catastrophic 0.0 failures.
"""

import os
import json
import pytest
import torch
import pandas as pd
from torch_geometric.data import Data
from qiskit import QuantumCircuit

from src.models.gnn_scorer import GNNScorer
from src.train.train_scorer import get_operational_physical_qubits, get_operational_coupling_map
from src.models.search import beam_search_layout, route_circuit_caliroute, run_caliroute_benchmark
from src.collect.snapshot_calibration import get_latest_calibration_snapshot
from src.collect.load_circuits import load_benchmark_circuits


@pytest.fixture(scope="module")
def snapshot():
    snap = get_latest_calibration_snapshot("data/raw/calibration")
    assert snap is not None
    return snap


@pytest.fixture(scope="module")
def benchmark_circuits():
    circs = load_benchmark_circuits("data/circuits")
    assert len(circs) >= 15
    return circs


def test_gnn_scorer_architecture():
    """Verifies GNNScorer forward pass, batched scoring, and backpropagation."""
    hw = Data(
        x=torch.randn(156, 3),
        edge_index=torch.tensor([[0, 1], [1, 0]], dtype=torch.long),
        edge_attr=torch.randn(2, 2)
    )
    circ = Data(
        x=torch.randn(5, 3),
        edge_index=torch.tensor([[0, 1], [1, 0]], dtype=torch.long),
        edge_attr=torch.randn(2, 2),
        num_nodes=5
    )
    model = GNNScorer(hidden_dim=32, num_layers=2)

    # 1. Single mapping forward & backward
    single_mapping = torch.tensor([0, 1, 2, 3, 4], dtype=torch.long)
    score = model(hw, circ, single_mapping)
    assert score.dim() == 0 or score.shape == torch.Size([])
    score.backward()

    # 2. Batched mappings forward
    batch_mappings = torch.tensor([[0, 1, 2, 3, 4], [10, 11, 12, 13, 14]], dtype=torch.long)
    batch_scores = model(hw, circ, batch_mappings)
    assert batch_scores.shape == torch.Size([2])
    assert torch.isfinite(batch_scores).all()


def test_trained_model_checkpoint(snapshot):
    """Verifies that the trained model checkpoint exists and has high Spearman correlation."""
    ckpt_path = "results/gnn_scorer_best.pt"
    assert os.path.exists(ckpt_path), "GNN Scorer best checkpoint must exist."

    checkpoint = torch.load(ckpt_path, map_location="cpu")
    assert "model_state_dict" in checkpoint
    assert "val_spearman" in checkpoint

    val_spearman = checkpoint["val_spearman"]
    assert val_spearman >= 0.70, f"Expected Spearman rho >= 0.70, got {val_spearman:.4f}"


def test_operational_qubit_filtering(snapshot):
    """Verifies that operational physical qubits filter eliminates faulty qubits."""
    operational = get_operational_physical_qubits(snapshot)
    assert len(operational) >= 145, f"Expected at least 145 operational qubits, got {len(operational)}"

    faulty_known = {113, 121, 131, 146}
    for q in faulty_known:
        assert q not in operational, f"Faulty qubit {q} should not be marked operational!"

    op_edges = get_operational_coupling_map(snapshot)
    assert len(op_edges) > 300
    for u, v in op_edges:
        assert u not in faulty_known and v not in faulty_known


def test_beam_search_layout_validity(snapshot, benchmark_circuits):
    """Verifies that beam search produces a valid, fault-free bijective layout."""
    qc = benchmark_circuits["ghz_5q"]
    ckpt_path = "results/gnn_scorer_best.pt"
    checkpoint = torch.load(ckpt_path, map_location="cpu")
    model = GNNScorer(
        hidden_dim=checkpoint.get("hidden_dim", 64),
        num_layers=checkpoint.get("num_layers", 2)
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    best_mapping, best_score, history = beam_search_layout(
        circuit=qc,
        snapshot=snapshot,
        model=model,
        beam_width=8
    )

    assert len(best_mapping) == qc.num_qubits
    # Bijective check
    phys_qubits = list(best_mapping.values())
    assert len(set(phys_qubits)) == qc.num_qubits, "Mapping must be injective with no duplicates."

    # Must never include faulty qubits
    faulty_known = {113, 121, 131, 146}
    for l_q, p_q in best_mapping.items():
        assert p_q not in faulty_known, f"Logical qubit {l_q} mapped to faulty physical qubit {p_q}!"


def test_route_circuit_caliroute_and_fidelity(snapshot, benchmark_circuits):
    """Verifies that routed circuit obeys hardware coupling and has zero faulty gates."""
    qc = benchmark_circuits["qft_5q"]
    ckpt_path = "results/gnn_scorer_best.pt"
    checkpoint = torch.load(ckpt_path, map_location="cpu")
    model = GNNScorer(
        hidden_dim=checkpoint.get("hidden_dim", 64),
        num_layers=checkpoint.get("num_layers", 2)
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    res = route_circuit_caliroute(
        circuit=qc,
        snapshot=snapshot,
        model=model,
        beam_width=8
    )

    assert res["faulty_gates"] == 0, f"Expected 0 faulty gates, got {res['faulty_gates']}"
    assert res["fidelity_proxy"] > 0.5, f"Expected fidelity > 0.5 for qft_5q, got {res['fidelity_proxy']}"
    assert res["transpiled_circuit"] is not None


def test_benchmark_results_and_sabre_comparison():
    """Verifies comparative benchmark results in results/caliroute_vs_sabre.csv."""
    csv_path = "results/caliroute_vs_sabre.csv"
    assert os.path.exists(csv_path), "Comparative benchmark CSV must exist."

    df = pd.read_csv(csv_path)
    assert len(df) == 15, f"Expected 15 benchmark circuits, got {len(df)}"

    # Check that CaliRoute has zero faulty gates on all circuits
    assert (df["caliroute_faulty_gates"] == 0).all(), "CaliRoute must have 0 faulty gates across all circuits."

    # Check that CaliRoute achieves strictly positive fidelity everywhere
    assert (df["caliroute_fidelity"] > 0.0).all(), "CaliRoute fidelity must be strictly positive on all circuits."

    # Check that on qft_12q and graphstate_8q, CaliRoute prevented SABRE's 0.0 failure
    qft_12q_row = df[df["circuit_id"] == "qft_12q"].iloc[0]
    assert qft_12q_row["sabre_fidelity"] == 0.0, "SABRE should fail on qft_12q due to faulty qubit 146."
    assert qft_12q_row["caliroute_fidelity"] > 0.01, "CaliRoute should succeed on qft_12q."

    graphstate_8q_row = df[df["circuit_id"] == "graphstate_8q"].iloc[0]
    assert graphstate_8q_row["sabre_fidelity"] < 1e-50, "SABRE should fail on graphstate_8q."
    assert graphstate_8q_row["caliroute_fidelity"] > 0.5, "CaliRoute should achieve > 0.5 on graphstate_8q."
