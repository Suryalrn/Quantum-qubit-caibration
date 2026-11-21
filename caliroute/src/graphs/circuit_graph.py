"""
Circuit Interaction Graph Builder for CaliRoute.

Constructs a PyTorch Geometric (PyG) Data object representing a quantum circuit's
interaction graph:
- Nodes: Logical qubits of the quantum circuit
- Node Features: [1-qubit gate count, 2-qubit interaction count, measurement flag]
- Edges: Interaction connectivity between logical qubits that execute two-qubit gates
- Edge Features: [Interaction count (weight), Normalized interaction frequency]
"""

import sys
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List

import torch
from torch_geometric.data import Data
from qiskit import QuantumCircuit

# Ensure project root is in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

try:
    from caliroute.src.graphs.hardware_graph import build_hardware_graph
except ImportError:
    try:
        from src.graphs.hardware_graph import build_hardware_graph
    except ImportError:
        from hardware_graph import build_hardware_graph


class CircuitGraphFeatures:
    """Metadata describing the feature dimensions of the circuit graph."""
    NODE_FEATURE_NAMES = ["single_qubit_gate_count", "two_qubit_gate_count", "is_measured"]
    EDGE_FEATURE_NAMES = ["interaction_count", "interaction_frequency"]
    NODE_DIM = 3
    EDGE_DIM = 2


def _flatten_composite_gates(circuit: QuantumCircuit, max_depth: int = 5) -> QuantumCircuit:
    """
    Decomposes composite gates (such as MQT Bench oracles) into elementary gates
    so all multi-qubit interactions are exposed.
    """
    current = circuit
    for _ in range(max_depth):
        has_composite = any(
            getattr(inst.operation, "definition", None) is not None
            for inst in current.data
            if inst.operation.name not in (
                "measure", "barrier", "cx", "cz", "swap", "ecr",
                "h", "x", "y", "z", "s", "t", "rz", "sx", "id", "delay"
            )
        )
        if has_composite:
            try:
                current = current.decompose()
            except Exception:
                break
        else:
            break
    return current


def build_circuit_graph(
    circuit: QuantumCircuit,
    bidirectional: bool = True
) -> Data:
    """
    Constructs a PyTorch Geometric Data object from a QuantumCircuit.

    Args:
        circuit: Qiskit QuantumCircuit.
        bidirectional: If True, adds both (u, v) and (v, u) directed edges
                       so GNN message passing operates symmetrically.

    Returns:
        torch_geometric.data.Data object with:
            - x: [num_logical_qubits, 3] node feature tensor
            - edge_index: [2, num_interaction_edges] long tensor
            - edge_attr: [num_interaction_edges, 2] float tensor
            - num_nodes: int (logical qubit count)
    """
    num_qubits = circuit.num_qubits
    flat_circuit = _flatten_composite_gates(circuit)

    # 1. Track Node Statistics
    sq_counts = [0] * num_qubits
    tq_counts = [0] * num_qubits
    is_measured = [0.0] * num_qubits

    # 2. Track 2-Qubit Interactions
    interaction_counts: Dict[Tuple[int, int], int] = {}
    total_2q_gates = 0

    for inst in flat_circuit.data:
        op_name = inst.operation.name
        if op_name in ("barrier", "delay"):
            continue

        q_indices = [flat_circuit.find_bit(q).index for q in inst.qubits]

        if len(q_indices) == 1:
            q = q_indices[0]
            if op_name == "measure":
                is_measured[q] = 1.0
            else:
                sq_counts[q] += 1
        elif len(q_indices) == 2:
            u, v = q_indices[0], q_indices[1]
            tq_counts[u] += 1
            tq_counts[v] += 1
            total_2q_gates += 1

            pair = (min(u, v), max(u, v))
            interaction_counts[pair] = interaction_counts.get(pair, 0) + 1

    # Build Node Feature Tensor [num_qubits, 3]
    node_features = []
    for q in range(num_qubits):
        node_features.append([
            float(sq_counts[q]),
            float(tq_counts[q]),
            float(is_measured[q]),
        ])
    x = torch.tensor(node_features, dtype=torch.float32)

    # 3. Build Edge Index and Edge Features
    edge_sources = []
    edge_targets = []
    edge_attributes = []

    norm_divisor = max(1, total_2q_gates)

    for (u, v), count in sorted(interaction_counts.items()):
        freq = float(count) / float(norm_divisor)
        # Forward edge (u, v)
        edge_sources.append(u)
        edge_targets.append(v)
        edge_attributes.append([float(count), freq])

        # Reverse edge (v, u) if bidirectional
        if bidirectional:
            edge_sources.append(v)
            edge_targets.append(u)
            edge_attributes.append([float(count), freq])

    if edge_sources:
        edge_index = torch.tensor([edge_sources, edge_targets], dtype=torch.long)
        edge_attr = torch.tensor(edge_attributes, dtype=torch.float32)
    else:
        # Empty graph (circuits with 0 two-qubit gates)
        edge_index = torch.empty((2, 0), dtype=torch.long)
        edge_attr = torch.empty((0, 2), dtype=torch.float32)

    circ_graph = Data(
        x=x,
        edge_index=edge_index,
        edge_attr=edge_attr,
        num_nodes=num_qubits
    )
    circ_graph.circuit_name = circuit.name or "circuit"
    circ_graph.total_2q_gates = total_2q_gates
    circ_graph.depth = flat_circuit.depth()

    return circ_graph


def build_graph_pair(
    snapshot: Dict[str, Any],
    circuit: QuantumCircuit,
    normalize_hw: bool = True,
    bidirectional: bool = True
) -> Tuple[Data, Data]:
    """
    Builds both Hardware Graph and Circuit Graph as PyG Data objects
    for any (snapshot, circuit) pair.
    """
    hw_graph = build_hardware_graph(snapshot, normalize=normalize_hw, bidirectional=bidirectional)
    circ_graph = build_circuit_graph(circuit, bidirectional=bidirectional)
    return hw_graph, circ_graph


if __name__ == "__main__":
    import mqt.bench as mb

    qc = mb.get_benchmark("dj", mb.BenchmarkLevel.INDEP, 5)
    circ_graph = build_circuit_graph(qc)
    print("Constructed Circuit Interaction Graph:")
    print(circ_graph)
    print("Logical Qubits (nodes):", circ_graph.num_nodes)
    print("Node feature shape (x):", circ_graph.x.shape)
    print("Edge index shape:", circ_graph.edge_index.shape)
    print("Edge attr shape:", circ_graph.edge_attr.shape)
    print("Sample node 0 [1Q gates, 2Q gates, measured]:", circ_graph.x[0].tolist())
    if circ_graph.edge_attr.shape[0] > 0:
        print("Sample edge 0 [count, frequency]:", circ_graph.edge_attr[0].tolist())
