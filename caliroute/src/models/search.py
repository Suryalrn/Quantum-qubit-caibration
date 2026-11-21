"""
Beam Search Router and Layout Optimizer for CaliRoute.

Components:
1. beam_search_layout: Discovers high-fidelity initial qubit layouts on real superconducting
   processors by exploring candidate connected subgraphs guided by the trained classical GNNScorer.
2. route_circuit_caliroute: Produces a fully placed and routed physical circuit compliant with
   the processor coupling map and native basis gates, evaluated by the analytical fidelity proxy.
3. run_caliroute_benchmark: Runs CaliRoute across benchmark circuits and outputs full comparison
   metrics against Qiskit's SABRE baseline.
"""

import sys
import os
import json
import logging
import random
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional, Set

import torch
import networkx as nx
import numpy as np
import pandas as pd
from qiskit import QuantumCircuit, transpile

# Ensure project root is in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

try:
    from caliroute.src.collect.snapshot_calibration import get_latest_calibration_snapshot, get_backend_instance
    from caliroute.src.collect.load_circuits import load_benchmark_circuits
    from caliroute.src.scoring.fidelity_proxy import (
        compute_fidelity_proxy,
        compute_fidelity_proxy_for_transpiled,
        ProxyScore,
    )
    from caliroute.src.graphs.hardware_graph import (
        build_hardware_graph,
        compute_hardware_distance_matrix,
        compute_hardware_error_matrix,
    )
    from caliroute.src.graphs.circuit_graph import build_circuit_graph
    from caliroute.src.models.gnn_scorer import GNNScorer
    from caliroute.src.train.train_scorer import (
        get_operational_physical_qubits,
        get_operational_coupling_map,
        sample_connected_subgraph,
    )
except ImportError:
    from src.collect.snapshot_calibration import get_latest_calibration_snapshot, get_backend_instance
    from src.collect.load_circuits import load_benchmark_circuits
    from src.scoring.fidelity_proxy import (
        compute_fidelity_proxy,
        compute_fidelity_proxy_for_transpiled,
        ProxyScore,
    )
    from src.graphs.hardware_graph import (
        build_hardware_graph,
        compute_hardware_distance_matrix,
        compute_hardware_error_matrix,
    )
    from src.graphs.circuit_graph import build_circuit_graph
    from src.models.gnn_scorer import GNNScorer
    from src.train.train_scorer import (
        get_operational_physical_qubits,
        get_operational_coupling_map,
        sample_connected_subgraph,
    )

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("caliroute.models.search")


def rank_physical_qubit_quality(snapshot: Dict[str, Any], operational_qubits: List[int]) -> List[Tuple[int, float]]:
    """
    Ranks operational physical qubits by a composite hardware calibration score:
    higher T1/T2, lower readout error, and lower average 2Q gate error.
    """
    qubits_calib = snapshot.get("qubits", {})
    edges_calib = snapshot.get("edges", {})

    # Compute averages across operational qubits
    t1_vals = [float(qubits_calib.get(str(q), {}).get("t1", 200e-6)) for q in operational_qubits]
    t2_vals = [float(qubits_calib.get(str(q), {}).get("t2", 100e-6)) for q in operational_qubits]
    ro_vals = [float(qubits_calib.get(str(q), {}).get("readout_error", 0.01)) for q in operational_qubits]

    mean_t1 = max(1e-6, sum(t1_vals) / len(t1_vals))
    mean_t2 = max(1e-6, sum(t2_vals) / len(t2_vals))
    mean_ro = max(1e-4, sum(ro_vals) / len(ro_vals))

    ranked = []
    for q in operational_qubits:
        q_info = qubits_calib.get(str(q), {})
        t1 = float(q_info.get("t1", 200e-6))
        t2 = float(q_info.get("t2", 100e-6))
        ro = float(q_info.get("readout_error", 0.01))

        # Composite score
        score = (t1 / mean_t1) + (t2 / mean_t2) - 2.0 * (ro / mean_ro)
        ranked.append((q, score))

    ranked.sort(key=lambda x: x[1], reverse=True)
    return ranked


def beam_search_layout(
    circuit: QuantumCircuit,
    snapshot: Dict[str, Any],
    model: GNNScorer,
    beam_width: int = 16,
    num_seeds: int = 20,
    refinement_steps: int = 3,
    device: Optional[torch.device] = None
) -> Tuple[Dict[int, int], float, List[Dict[str, Any]]]:
    """
    Finds the optimal initial logical-to-physical qubit layout using GNN-guided beam search.

    Args:
        circuit: Logical quantum circuit.
        snapshot: Hardware calibration dictionary.
        model: Trained GNNScorer model.
        beam_width: Number of top candidate layouts retained in each beam step.
        num_seeds: Number of high-quality physical seeds explored.
        refinement_steps: Number of local swap/subgraph perturbation refinement iterations.
        device: PyTorch device (CPU/CUDA).

    Returns:
        best_mapping: Dict[int, int] mapping logical qubit -> physical qubit.
        best_score: Predicted log-fidelity score.
        search_history: List of top candidate records.
    """
    if device is None:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model.eval()
    n = circuit.num_qubits

    # 1. Hardware and Circuit Graphs & Matrices
    hw_graph = build_hardware_graph(snapshot).to(device)
    circ_graph = build_circuit_graph(circuit).to(device)
    dist_mat = compute_hardware_distance_matrix(snapshot).to(device)
    err_mat = compute_hardware_error_matrix(snapshot).to(device)

    operational = get_operational_physical_qubits(snapshot)
    op_coupling_map = get_operational_coupling_map(snapshot)
    G = nx.Graph()
    for edge in op_coupling_map:
        if len(edge) >= 2:
            G.add_edge(int(edge[0]), int(edge[1]))

    ranked_qubits = rank_physical_qubit_quality(snapshot, operational)
    top_seeds = [q for q, _ in ranked_qubits[:num_seeds]]

    # 2. Precompute GNN node embeddings
    with torch.no_grad():
        h_hw, h_circ = model.encode(hw_graph, circ_graph)

    # 3. Generate initial candidate layouts centered on top seeds
    candidates_set: Set[Tuple[int, ...]] = set()
    candidate_list: List[List[int]] = []

    # Order logical qubits by interaction count (descending)
    circ_degrees = {}
    if circ_graph.edge_index.numel() > 0:
        for u in circ_graph.edge_index[0].tolist():
            circ_degrees[u] = circ_degrees.get(u, 0) + 1
    logical_order = sorted(range(n), key=lambda i: circ_degrees.get(i, 0), reverse=True)

    for seed in top_seeds:
        # Sample connected subgraphs rooted at this seed
        for _ in range(4):
            sub = sample_connected_subgraph(G, operational, n, seed_qubit=seed)
            if len(sub) == n and len(set(sub)) == n:
                # Map logical qubits to physical subgraphs
                mapping_arr = [0] * n
                for l_idx, p_idx in zip(logical_order, sub):
                    mapping_arr[l_idx] = p_idx
                tup = tuple(mapping_arr)
                if tup not in candidates_set:
                    candidates_set.add(tup)
                    candidate_list.append(mapping_arr)

    if not candidate_list:
        fallback = operational[:n]
        candidate_list.append(fallback)
        candidates_set.add(tuple(fallback))

    # Helper function to score a list of candidate mappings in parallel
    def score_batch(m_list: List[List[int]]) -> torch.Tensor:
        m_tensor = torch.tensor(m_list, dtype=torch.long, device=device)
        with torch.no_grad():
            scores = model.score_mappings(
                h_hw=h_hw,
                h_circ=h_circ,
                hw_x=hw_graph.x,
                circ_x=circ_graph.x,
                circ_edge_index=circ_graph.edge_index,
                circ_edge_attr=circ_graph.edge_attr,
                mappings=m_tensor,
                dist_matrix=dist_mat,
                err_matrix=err_mat
            )
        return scores

    # Initial scoring
    scores = score_batch(candidate_list)
    top_k_indices = torch.topk(scores, min(beam_width, len(candidate_list))).indices.cpu().tolist()
    beam: List[Tuple[List[int], float]] = [(candidate_list[idx], float(scores[idx].item())) for idx in top_k_indices]

    # 4. Iterative Beam Refinement (Neighborhood Swaps)
    for step in range(refinement_steps):
        new_candidates: List[List[int]] = []
        for current_mapping, _ in beam:
            # Try pairwise swaps between logical qubits
            for _ in range(3):
                if n >= 2:
                    i1, i2 = random.sample(range(n), 2)
                    swapped = list(current_mapping)
                    swapped[i1], swapped[i2] = swapped[i2], swapped[i1]
                    tup = tuple(swapped)
                    if tup not in candidates_set:
                        candidates_set.add(tup)
                        new_candidates.append(swapped)

            # Try replacing a physical qubit with an adjacent operational physical neighbor
            for l_q in range(min(n, 3)):
                p_q = current_mapping[l_q]
                used_set = set(current_mapping)
                neighbors = [nbr for nbr in G.neighbors(p_q) if nbr in set(operational) and nbr not in used_set]
                if neighbors:
                    new_p = random.choice(neighbors)
                    replaced = list(current_mapping)
                    replaced[l_q] = new_p
                    tup = tuple(replaced)
                    if tup not in candidates_set:
                        candidates_set.add(tup)
                        new_candidates.append(replaced)

        if not new_candidates:
            break

        new_scores = score_batch(new_candidates)
        combined = beam + [(new_candidates[i], float(new_scores[i].item())) for i in range(len(new_candidates))]
        # Sort by score descending and keep beam_width
        combined.sort(key=lambda x: x[1], reverse=True)
        # Deduplicate
        seen_comb = set()
        beam = []
        for m, sc in combined:
            t = tuple(m)
            if t not in seen_comb:
                seen_comb.add(t)
                beam.append((m, sc))
            if len(beam) >= beam_width:
                break

    best_mapping_list, best_score = beam[0]
    best_mapping = {i: best_mapping_list[i] for i in range(n)}

    history = [{"mapping": {i: m[i] for i in range(n)}, "predicted_log_fidelity": sc} for m, sc in beam[:5]]
    return best_mapping, best_score, history


def route_circuit_caliroute(
    circuit: QuantumCircuit,
    snapshot: Dict[str, Any],
    model: GNNScorer,
    backend=None,
    beam_width: int = 16,
    optimization_level: int = 1,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Routes a circuit with CaliRoute:
    1. Discovers optimal initial layout via GNN-guided beam search.
    2. Transpiles against processor coupling map and native basis gates.
    3. Evaluates with analytical closed-form fidelity proxy.
    """
    # 1. Find optimal layout via GNN beam search
    best_layout, predicted_log_fid, _ = beam_search_layout(
        circuit=circuit,
        snapshot=snapshot,
        model=model,
        beam_width=beam_width
    )

    op_coupling_map = get_operational_coupling_map(snapshot)
    basis_gates = ["cz", "sx", "x", "rz", "id"]

    # 2. Physical transpilation preserving the CaliRoute GNN layout
    # Strictly routed on operational couplers to eliminate broken/faulty gates
    initial_layout_list = [best_layout[i] for i in range(circuit.num_qubits)]

    transpiled = transpile(
        circuit,
        coupling_map=op_coupling_map,
        basis_gates=basis_gates,
        initial_layout=initial_layout_list,
        layout_method=None,
        routing_method="sabre",
        optimization_level=optimization_level,
        seed_transpiler=seed
    )

    # 3. Score physical circuit with the analytical fidelity proxy
    proxy_score = compute_fidelity_proxy_for_transpiled(transpiled, snapshot)

    ops = transpiled.count_ops()
    two_q_ops = ["cz", "ecr", "cx", "swap"]
    two_q_count = sum(ops.get(op, 0) for op in two_q_ops)

    return {
        "circuit_name": circuit.name or "circuit",
        "num_qubits": circuit.num_qubits,
        "caliroute_layout": best_layout,
        "predicted_log_fidelity": predicted_log_fid,
        "fidelity_proxy": proxy_score.fidelity_proxy,
        "log_fidelity": proxy_score.log_fidelity,
        "p_gate_survival": proxy_score.p_gate_survival,
        "p_readout_survival": proxy_score.p_readout_survival,
        "p_decoherence_survival": proxy_score.p_decoherence_survival,
        "makespan_us": proxy_score.makespan_seconds * 1e6,
        "two_qubit_gates": two_q_count,
        "total_gates": sum(ops.values()),
        "depth": transpiled.depth(),
        "faulty_gates": proxy_score.faulty_gate_count,
        "transpiled_circuit": transpiled
    }


def run_caliroute_benchmark(
    snapshot: Optional[Dict[str, Any]] = None,
    model_checkpoint: str = "results/gnn_scorer_best.pt",
    sabre_scores_path: str = "results/sabre_proxy_scores.csv",
    output_csv: str = "results/caliroute_vs_sabre.csv",
    output_json: str = "results/caliroute_vs_sabre.json"
) -> pd.DataFrame:
    """
    Runs CaliRoute across all 15 benchmark circuits and compiles full comparison against SABRE.
    """
    if snapshot is None:
        snapshot = get_latest_calibration_snapshot("data/raw/calibration")

    circuits = load_benchmark_circuits("data/circuits")

    # Load trained GNN model
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    checkpoint = torch.load(model_checkpoint, map_location=device)
    model = GNNScorer(
        hidden_dim=checkpoint.get("hidden_dim", 64),
        num_layers=checkpoint.get("num_layers", 2)
    ).to(device)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    logger.info(f"Loaded trained GNNScorer from {model_checkpoint} (trained Spearman rho: {checkpoint.get('val_spearman', 0.0):.4f})")

    # Load SABRE scores for comparison
    sabre_df = None
    if os.path.exists(sabre_scores_path):
        sabre_df = pd.read_csv(sabre_scores_path).set_index("circuit_id")

    results = []
    for c_id, circ in circuits.items():
        logger.info(f"Routing {c_id} with CaliRoute GNN + Beam Search...")
        cr_res = route_circuit_caliroute(
            circuit=circ,
            snapshot=snapshot,
            model=model,
            beam_width=16
        )

        sabre_fid = None
        sabre_log_fid = None
        sabre_2q = None
        fid_ratio = None

        if sabre_df is not None and c_id in sabre_df.index:
            sabre_row = sabre_df.loc[c_id]
            sabre_fid = float(sabre_row["fidelity_proxy"])
            sabre_log_fid = float(sabre_row["log_fidelity"])
            sabre_2q = int(sabre_row["two_qubit_gates"])
            if sabre_fid > 1e-12:
                fid_ratio = cr_res["fidelity_proxy"] / sabre_fid
            else:
                fid_ratio = float("inf") if cr_res["fidelity_proxy"] > 0 else 1.0

        rec = {
            "circuit_id": c_id,
            "num_qubits": circ.num_qubits,
            "caliroute_fidelity": cr_res["fidelity_proxy"],
            "sabre_fidelity": sabre_fid,
            "fidelity_ratio_cr_over_sabre": fid_ratio,
            "caliroute_log_fidelity": cr_res["log_fidelity"],
            "sabre_log_fidelity": sabre_log_fid,
            "caliroute_2q_gates": cr_res["two_qubit_gates"],
            "sabre_2q_gates": sabre_2q,
            "caliroute_total_gates": cr_res["total_gates"],
            "caliroute_depth": cr_res["depth"],
            "caliroute_faulty_gates": cr_res["faulty_gates"],
            "caliroute_p_gate": cr_res["p_gate_survival"],
            "caliroute_p_readout": cr_res["p_readout_survival"],
            "caliroute_p_decoherence": cr_res["p_decoherence_survival"],
            "caliroute_layout": cr_res["caliroute_layout"],
        }
        results.append(rec)

    df = pd.DataFrame(results)
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    df.to_csv(output_csv, index=False)

    json_records = [
        {k: (v if not isinstance(v, (np.integer, np.floating)) else float(v)) for k, v in r.items()}
        for r in results
    ]
    with open(output_json, "w") as f:
        json.dump(json_records, f, indent=2)

    logger.info(f"CaliRoute vs SABRE benchmark saved to {output_csv} and {output_json}")
    return df


if __name__ == "__main__":
    snap = get_latest_calibration_snapshot("data/raw/calibration")
    df = run_caliroute_benchmark(snapshot=snap)
    print(df[["circuit_id", "num_qubits", "caliroute_fidelity", "sabre_fidelity", "fidelity_ratio_cr_over_sabre"]])
