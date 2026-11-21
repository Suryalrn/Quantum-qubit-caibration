"""
Hardware Calibration Graph Builder for CaliRoute.

Constructs a PyTorch Geometric (PyG) Data object representing the physical
superconducting quantum processor topology annotated with measured calibration
metrics from real IBM hardware:
- Node Features: [T1 relaxation time, T2 dephasing time, Readout error]
- Edge Features: [Two-qubit gate error, Gate duration]
- Edge Index: Physical processor coupling map topology (directed or bidirectional)
"""

import sys
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

import torch
from torch_geometric.data import Data

# Ensure project root is in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


class HardwareGraphFeatures:
    """Metadata describing the feature dimensions of the hardware graph."""
    NODE_FEATURE_NAMES = ["T1", "T2", "readout_error"]
    EDGE_FEATURE_NAMES = ["gate_error", "gate_length_us"]
    NODE_DIM = 3
    EDGE_DIM = 2


def build_hardware_graph(
    snapshot: Dict[str, Any],
    normalize: bool = True,
    bidirectional: bool = True
) -> Data:
    """
    Constructs a PyTorch Geometric Data object from a calibration snapshot.

    Args:
        snapshot: Dictionary containing 'metadata', 'qubits', 'edges', 'coupling_map'.
        normalize: If True, scales T1 and T2 by 1e4 (converting ~100-400 us to ~1-4)
                   for well-behaved gradient flow in classical GNNs.
        bidirectional: If True, adds reverse edges for coupling links so that
                       graph message passing propagates in both directions.

    Returns:
        torch_geometric.data.Data object with:
            - x: [num_qubits, 3] node feature tensor (T1, T2, readout_error)
            - edge_index: [2, num_edges] long tensor
            - edge_attr: [num_edges, 2] float tensor (gate_error, gate_length_us)
            - num_nodes: int (total physical qubits)
    """
    meta = snapshot.get("metadata", {})
    num_qubits = meta.get("num_qubits", len(snapshot.get("qubits", {})))
    qubits_data = snapshot.get("qubits", {})
    edges_data = snapshot.get("edges", {})
    coupling_map = snapshot.get("coupling_map", [])

    # 1. Build Node Feature Tensor [num_qubits, 3]
    # Features: [T1, T2, readout_error]
    node_features = []
    scale = 1e4 if normalize else 1.0

    for q_idx in range(num_qubits):
        q_info = qubits_data.get(str(q_idx), {})
        t1 = float(q_info.get("t1", 200e-6))
        t2 = float(q_info.get("t2", 100e-6))
        ro_err = float(q_info.get("readout_error", 0.01))

        t1_feat = t1 * scale
        t2_feat = t2 * scale
        node_features.append([t1_feat, t2_feat, ro_err])

    x = torch.tensor(node_features, dtype=torch.float32)

    # 2. Build Edge Index and Edge Features
    # Directed coupling edges from snapshot
    edge_sources = []
    edge_targets = []
    edge_attributes = []
    seen_edges = set()

    # Iterate over coupling map edges or snapshot edges
    candidate_edges = list(coupling_map) if coupling_map else [
        [int(k.split("_")[0]), int(k.split("_")[1])] for k in edges_data.keys()
    ]

    for edge in candidate_edges:
        u, v = int(edge[0]), int(edge[1])
        if (u, v) not in seen_edges:
            seen_edges.add((u, v))
            edge_sources.append(u)
            edge_targets.append(v)

            # Retrieve edge calibration data
            e_key = f"{u}_{v}"
            rev_key = f"{v}_{u}"
            e_info = edges_data.get(e_key) or edges_data.get(rev_key) or {}
            g_err = float(e_info.get("gate_error", 0.01))
            g_len = float(e_info.get("gate_length", 5.33e-7))
            edge_attributes.append([g_err, g_len * 1e6])  # duration in us

        # Add reverse edge if bidirectional is requested
        if bidirectional and (v, u) not in seen_edges:
            seen_edges.add((v, u))
            edge_sources.append(v)
            edge_targets.append(u)

            e_key = f"{v}_{u}"
            rev_key = f"{u}_{v}"
            e_info = edges_data.get(e_key) or edges_data.get(rev_key) or {}
            g_err = float(e_info.get("gate_error", 0.01))
            g_len = float(e_info.get("gate_length", 5.33e-7))
            edge_attributes.append([g_err, g_len * 1e6])

    edge_index = torch.tensor([edge_sources, edge_targets], dtype=torch.long)
    edge_attr = torch.tensor(edge_attributes, dtype=torch.float32)

    # 3. Assemble PyTorch Geometric Data Object
    hw_graph = Data(
        x=x,
        edge_index=edge_index,
        edge_attr=edge_attr,
        num_nodes=num_qubits
    )
    hw_graph.backend_name = meta.get("backend_name", "unknown")
    hw_graph.is_mock = meta.get("is_mock", True)
    hw_graph.timestamp = meta.get("timestamp", "")

    return hw_graph


def compute_hardware_distance_matrix(snapshot: Dict[str, Any]) -> torch.Tensor:
    """
    Computes [num_qubits, num_qubits] all-pairs shortest path distance matrix in the coupling graph.
    Disconnected or unreachable pairs default to a penalty distance of 20.0.
    """
    import networkx as nx

    meta = snapshot.get("metadata", {})
    num_qubits = meta.get("num_qubits", len(snapshot.get("qubits", {})))
    coupling_map = snapshot.get("coupling_map", [])

    G = nx.Graph()
    G.add_nodes_from(range(num_qubits))
    for edge in coupling_map:
        if len(edge) >= 2:
            G.add_edge(int(edge[0]), int(edge[1]))

    dist_mat = torch.full((num_qubits, num_qubits), 20.0, dtype=torch.float32)
    for src in range(num_qubits):
        dist_mat[src, src] = 0.0
        try:
            lengths = nx.single_source_shortest_path_length(G, src)
            for dst, d in lengths.items():
                dist_mat[src, dst] = float(d)
        except Exception:
            pass
    return dist_mat


def compute_hardware_error_matrix(snapshot: Dict[str, Any]) -> torch.Tensor:
    """
    Computes [num_qubits, num_qubits] direct coupling 2Q gate error lookup matrix.
    Non-adjacent pairs default to 0.05.
    """
    meta = snapshot.get("metadata", {})
    num_qubits = meta.get("num_qubits", len(snapshot.get("qubits", {})))
    edges_data = snapshot.get("edges", {})

    err_mat = torch.full((num_qubits, num_qubits), 0.05, dtype=torch.float32)
    for q in range(num_qubits):
        err_mat[q, q] = 0.0

    for k, info in edges_data.items():
        parts = k.split("_")
        if len(parts) == 2:
            u, v = int(parts[0]), int(parts[1])
            err = float(info.get("gate_error", 0.01))
            err_mat[u, v] = err
            err_mat[v, u] = min(err_mat[v, u].item(), err)

    return err_mat


if __name__ == "__main__":
    import json
    try:
        from caliroute.src.collect.snapshot_calibration import get_latest_calibration_snapshot
    except ImportError:
        from src.collect.snapshot_calibration import get_latest_calibration_snapshot

    snap = get_latest_calibration_snapshot("data/raw/calibration")
    graph = build_hardware_graph(snap)
    print("Constructed Hardware Graph:")
    print(graph)
    print("Node feature shape (x):", graph.x.shape)
    print("Edge index shape:", graph.edge_index.shape)
    print("Edge attr shape:", graph.edge_attr.shape)
    print("Sample node 0 [T1, T2, readout_error]:", graph.x[0].tolist())
    print("Sample edge 0 [gate_error, gate_length_us]:", graph.edge_attr[0].tolist())

