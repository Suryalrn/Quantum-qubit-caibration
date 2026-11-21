"""
Test suite for Phase 3: Graph Representations Checkpoint.

Verifies:
1. Hardware calibration graph is created as a PyTorch Geometric Data object
   with physical qubit node features (T1, T2, readout error) and coupling edge features (gate error, length).
2. Circuit interaction graph is created as a PyTorch Geometric Data object
   with logical qubit node features (gate counts) and interaction edge features (weights, frequencies).
3. Both graphs are successfully produced as a paired tuple for any (snapshot, circuit) pair.
4. Edge cases (e.g. circuits with 0 two-qubit gates) handle gracefully.
"""

from pathlib import Path
import pytest
import torch
from torch_geometric.data import Data
from qiskit import QuantumCircuit

try:
    from caliroute.src.graphs.hardware_graph import (
        build_hardware_graph,
        HardwareGraphFeatures,
    )
    from caliroute.src.graphs.circuit_graph import (
        build_circuit_graph,
        CircuitGraphFeatures,
        build_graph_pair,
    )
    from caliroute.src.collect.snapshot_calibration import get_latest_calibration_snapshot
    from caliroute.src.collect.load_circuits import load_benchmark_circuits
except ImportError:
    from src.graphs.hardware_graph import (
        build_hardware_graph,
        HardwareGraphFeatures,
    )
    from src.graphs.circuit_graph import (
        build_circuit_graph,
        CircuitGraphFeatures,
        build_graph_pair,
    )
    from src.collect.snapshot_calibration import get_latest_calibration_snapshot
    from src.collect.load_circuits import load_benchmark_circuits


@pytest.fixture
def snapshot():
    """Loads latest calibration snapshot."""
    return get_latest_calibration_snapshot("data/raw/calibration")


@pytest.fixture
def sample_circuits():
    """Loads benchmark circuits from Phase 1."""
    return load_benchmark_circuits("data/circuits")


def test_hardware_graph_creation(snapshot):
    """Asserts that hardware graph is a valid PyG Data object with expected dimensions."""
    hw_graph = build_hardware_graph(snapshot, normalize=True, bidirectional=True)

    assert isinstance(hw_graph, Data)
    num_qubits = snapshot["metadata"]["num_qubits"]
    assert hw_graph.num_nodes == num_qubits
    assert hw_graph.x.shape == (num_qubits, HardwareGraphFeatures.NODE_DIM)
    assert hw_graph.edge_index.shape[0] == 2
    assert hw_graph.edge_index.shape[1] > 0
    assert hw_graph.edge_attr.shape[1] == HardwareGraphFeatures.EDGE_DIM

    # Check node feature values (T1, T2, readout_error)
    # On real quantum hardware, non-negative with >=95% active calibrated qubits
    assert (hw_graph.x[:, 0] >= 0).all()  # T1 non-negative
    assert (hw_graph.x[:, 0] > 0).sum().item() >= 0.95 * hw_graph.num_nodes  # >= 95% calibrated
    assert (hw_graph.x[:, 1] >= 0).all()  # T2 non-negative
    assert (hw_graph.x[:, 2] >= 0).all() and (hw_graph.x[:, 2] <= 1.0).all()  # Readout error in [0, 1]

    # Check edge features: gate error in [0, 1]
    gate_errors = hw_graph.edge_attr[:, 0]
    assert (gate_errors >= 0).all() and (gate_errors <= 1.0).all()


def test_circuit_graph_creation(sample_circuits):
    """Asserts that circuit graph is a valid PyG Data object across multiple benchmark circuits."""
    for cid, qc in sample_circuits.items():
        circ_graph = build_circuit_graph(qc, bidirectional=True)

        assert isinstance(circ_graph, Data)
        assert circ_graph.num_nodes == qc.num_qubits
        assert circ_graph.x.shape == (qc.num_qubits, CircuitGraphFeatures.NODE_DIM)
        assert circ_graph.edge_index.shape[0] == 2
        assert circ_graph.edge_attr.shape[1] == CircuitGraphFeatures.EDGE_DIM

        # Qubit counts and gate statistics should be non-negative
        assert (circ_graph.x >= 0).all()

        # If there are interaction edges, frequencies should be in (0, 1]
        if circ_graph.edge_attr.shape[0] > 0:
            freqs = circ_graph.edge_attr[:, 1]
            assert (freqs > 0).all() and (freqs <= 1.0).all()


def test_build_graph_pair(snapshot, sample_circuits):
    """Asserts that build_graph_pair produces both graphs as a valid tuple for any (snapshot, circuit)."""
    qc = sample_circuits["qft_5q"]
    hw_graph, circ_graph = build_graph_pair(snapshot, qc)

    assert isinstance(hw_graph, Data)
    assert isinstance(circ_graph, Data)
    assert hw_graph.num_nodes == snapshot["metadata"]["num_qubits"]
    assert circ_graph.num_nodes == 5
    assert circ_graph.circuit_name == "qft_5q"


def test_circuit_graph_zero_2q_gates():
    """Asserts that circuit with only 1Q gates builds an interaction graph with 0 edges gracefully."""
    qc = QuantumCircuit(4, name="single_qubit_only")
    qc.h(0)
    qc.x(1)
    qc.y(2)
    qc.z(3)
    qc.measure_all()

    circ_graph = build_circuit_graph(qc)
    assert isinstance(circ_graph, Data)
    assert circ_graph.num_nodes == 4
    assert circ_graph.x.shape == (4, 3)
    assert circ_graph.edge_index.shape == (2, 0)
    assert circ_graph.edge_attr.shape == (0, 2)
    assert circ_graph.total_2q_gates == 0
