"""
Training Pipeline for GNN Fidelity Scorer in CaliRoute.

Pipelines:
1. generate_training_dataset: Samples diverse candidate layouts (connected subgraphs,
   SABRE baseline, local perturbations, random placements, adversarial dead-qubit inclusions)
   and evaluates ground-truth algebraic fidelity proxy targets with zero simulation.
2. train_gnn_scorer: Trains GNNScorer using PyTorch & PyG with Huber Loss, evaluates
   validation loss and Spearman rank correlation, and persists the best model checkpoint.
"""

import sys
import os
import json
import math
import random
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import networkx as nx
import numpy as np
from scipy.stats import spearmanr
from qiskit import QuantumCircuit

# Ensure project root is in sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

try:
    from caliroute.src.collect.snapshot_calibration import get_latest_calibration_snapshot
    from caliroute.src.collect.load_circuits import load_benchmark_circuits
    from caliroute.src.scoring.fidelity_proxy import compute_fidelity_proxy
    from caliroute.src.graphs.hardware_graph import (
        build_hardware_graph,
        compute_hardware_distance_matrix,
        compute_hardware_error_matrix,
    )
    from caliroute.src.graphs.circuit_graph import build_circuit_graph
    from caliroute.src.models.gnn_scorer import GNNScorer
except ImportError:
    from src.collect.snapshot_calibration import get_latest_calibration_snapshot
    from src.collect.load_circuits import load_benchmark_circuits
    from src.scoring.fidelity_proxy import compute_fidelity_proxy
    from src.graphs.hardware_graph import (
        build_hardware_graph,
        compute_hardware_distance_matrix,
        compute_hardware_error_matrix,
    )
    from src.graphs.circuit_graph import build_circuit_graph
    from src.models.gnn_scorer import GNNScorer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("caliroute.train.scorer")


def get_operational_physical_qubits(snapshot: Dict[str, Any]) -> List[int]:
    """
    Identifies operational physical qubits on the backend, filtering out
    uncalibrated (e.g. T1 <= 0), broken readout (ro >= 0.5), or broken
    single-qubit pulse drive lines (error >= 0.5).
    """
    qubits_calib = snapshot.get("qubits", {})
    sq_calib = snapshot.get("single_qubit_gates", {})
    num_qubits = snapshot.get("metadata", {}).get("num_qubits", len(qubits_calib))
    operational = []
    for q in range(num_qubits):
        q_info = qubits_calib.get(str(q), {})
        t1 = float(q_info.get("t1", 0.0))
        ro_err = float(q_info.get("readout_error", 1.0))
        sq = sq_calib.get(str(q), {})
        has_broken_1q = any(float(g_info.get("gate_error", 0.0)) >= 0.5 for g_info in sq.values())
        if t1 > 1e-6 and ro_err < 0.5 and not has_broken_1q:
            operational.append(q)
    return operational


def get_operational_coupling_map(snapshot: Dict[str, Any]) -> List[List[int]]:
    """
    Filters coupling map to only operational couplers between operational qubits.
    """
    operational = set(get_operational_physical_qubits(snapshot))
    edges_calib = snapshot.get("edges", {})
    coupling_map = snapshot.get("coupling_map", [])
    op_map = []
    for e in coupling_map:
        if len(e) >= 2:
            u, v = int(e[0]), int(e[1])
            if u in operational and v in operational:
                e_info = edges_calib.get(f"{u}_{v}") or edges_calib.get(f"{v}_{u}") or {}
                if float(e_info.get("gate_error", 0.0)) < 0.5:
                    op_map.append([u, v])
    return op_map



def sample_connected_subgraph(
    coupling_graph: nx.Graph,
    operational_qubits: List[int],
    size: int,
    seed_qubit: Optional[int] = None
) -> List[int]:
    """
    Samples a connected subgraph of physical qubits of the given size.
    """
    op_set = set(operational_qubits)
    subgraph = coupling_graph.subgraph(op_set)

    # Find connected components with at least `size` nodes
    valid_components = [c for c in nx.connected_components(subgraph) if len(c) >= size]
    if not valid_components:
        # Fallback to random operational qubits
        return random.sample(operational_qubits, min(size, len(operational_qubits)))

    chosen_comp = random.choice(valid_components)
    comp_graph = subgraph.subgraph(chosen_comp)

    # Start BFS from seed or random node in component
    start_node = seed_qubit if (seed_qubit is not None and seed_qubit in chosen_comp) else random.choice(list(chosen_comp))
    selected = [start_node]
    frontier = set(comp_graph.neighbors(start_node)) - set(selected)

    while len(selected) < size and frontier:
        next_node = random.choice(list(frontier))
        selected.append(next_node)
        frontier.remove(next_node)
        frontier.update(set(comp_graph.neighbors(next_node)) - set(selected))

    if len(selected) < size:
        remaining = list(chosen_comp - set(selected))
        selected.extend(random.sample(remaining, size - len(selected)))

    return selected


def generate_candidate_mappings_for_circuit(
    circuit: QuantumCircuit,
    snapshot: Dict[str, Any],
    coupling_graph: nx.Graph,
    operational_qubits: List[int],
    sabre_layout: Optional[Dict[int, int]] = None,
    num_samples: int = 40,
    seed: int = 42
) -> List[Dict[str, Any]]:
    """
    Generates a diverse set of candidate layouts and scores them with the fidelity proxy.
    """
    random.seed(seed)
    n = circuit.num_qubits
    all_hw_qubits = list(range(snapshot.get("metadata", {}).get("num_qubits", 156)))
    faulty_qubits = [q for q in all_hw_qubits if q not in set(operational_qubits)]

    candidates = []
    seen_layouts = set()

    def add_mapping(m_dict: Dict[int, int], tag: str):
        key = tuple(m_dict[i] for i in range(n))
        if key not in seen_layouts and len(set(key)) == n:
            seen_layouts.add(key)
            score = compute_fidelity_proxy(circuit, m_dict, snapshot)
            candidates.append({
                "mapping": m_dict,
                "strategy": tag,
                "log_fidelity": score.log_fidelity,
                "fidelity_proxy": score.fidelity_proxy,
                "p_gate": score.p_gate_survival,
                "p_readout": score.p_readout_survival,
                "p_decoherence": score.p_decoherence_survival,
                "two_q_count": score.two_qubit_gate_count,
            })

    # 1. Baseline SABRE layout if provided
    if sabre_layout and len(sabre_layout) >= n:
        add_mapping({i: sabre_layout[i] for i in range(n)}, "sabre_baseline")

    # 2. Connected subgraph layouts (high-quality local connectivity)
    for _ in range(num_samples // 3):
        sub = sample_connected_subgraph(coupling_graph, operational_qubits, n)
        if len(sub) == n:
            random.shuffle(sub)
            m = {i: sub[i] for i in range(n)}
            add_mapping(m, "connected_subgraph")

    # 3. Perturbations of connected layouts (swap 1 or 2 logical qubits)
    connected_pool = [c["mapping"] for c in candidates if c["strategy"] == "connected_subgraph"]
    for _ in range(num_samples // 4):
        if connected_pool:
            base = dict(random.choice(connected_pool))
            if n >= 2:
                i1, i2 = random.sample(range(n), 2)
                base[i1], base[i2] = base[i2], base[i1]
                add_mapping(base, "perturbed_swap")

    # 4. Random operational placements (dispersed across the processor)
    for _ in range(num_samples // 4):
        if len(operational_qubits) >= n:
            chosen = random.sample(operational_qubits, n)
            m = {i: chosen[i] for i in range(n)}
            add_mapping(m, "random_operational")

    # 5. Adversarial / Faulty placements (must include dead or high-error qubits)
    if faulty_qubits:
        for _ in range(max(2, num_samples // 10)):
            chosen_op = random.sample(operational_qubits, max(0, n - 1))
            dead_q = random.choice(faulty_qubits)
            combined = chosen_op + [dead_q]
            random.shuffle(combined)
            m = {i: combined[i] for i in range(n)}
            add_mapping(m, "adversarial_faulty")

    return candidates


def generate_training_dataset(
    snapshot: Dict[str, Any],
    circuits: Optional[Dict[str, QuantumCircuit]] = None,
    sabre_results_path: str = "results/sabre_baseline.json",
    samples_per_circuit: int = 40,
    output_path: str = "data/processed/mapping_dataset.json",
    seed: int = 42
) -> List[Dict[str, Any]]:
    """
    Generates candidate mapping dataset across all benchmark circuits.
    """
    if circuits is None:
        circuits = load_benchmark_circuits("data/circuits")

    # Load SABRE layouts if available
    sabre_layouts: Dict[str, Dict[int, int]] = {}
    if os.path.exists(sabre_results_path):
        try:
            with open(sabre_results_path, "r") as f:
                sabre_data = json.load(f)
            if isinstance(sabre_data, dict):
                for c_id, item in sabre_data.items():
                    if isinstance(item, dict):
                        init_m = item.get("initial_layout", {})
                        if init_m:
                            sabre_layouts[c_id] = {int(k): int(v) for k, v in init_m.items()}
            elif isinstance(sabre_data, list):
                for item in sabre_data:
                    c_id = item.get("circuit_id")
                    init_m = item.get("initial_layout", {})
                    if c_id and init_m:
                        sabre_layouts[c_id] = {int(k): int(v) for k, v in init_m.items()}
        except Exception as e:
            logger.warning(f"Failed to load SABRE baseline layouts: {e}")

    # Build hardware coupling graph for subgraph sampling
    coupling_map = snapshot.get("coupling_map", [])
    G = nx.Graph()
    for edge in coupling_map:
        if len(edge) >= 2:
            G.add_edge(int(edge[0]), int(edge[1]))

    operational = get_operational_physical_qubits(snapshot)
    logger.info(f"Operational physical qubits for candidate sampling: {len(operational)}")

    dataset = []
    for c_id, circ in circuits.items():
        sabre_m = sabre_layouts.get(c_id)
        candidates = generate_candidate_mappings_for_circuit(
            circuit=circ,
            snapshot=snapshot,
            coupling_graph=G,
            operational_qubits=operational,
            sabre_layout=sabre_m,
            num_samples=samples_per_circuit,
            seed=seed
        )
        for c in candidates:
            c["circuit_id"] = c_id
            c["num_qubits"] = circ.num_qubits
            dataset.append(c)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(dataset, f, indent=2)

    logger.info(f"Generated candidate dataset with {len(dataset)} samples saved to {output_path}")
    return dataset


class MappingDataset(Dataset):
    """PyTorch Dataset container for candidate layout samples."""

    def __init__(self, data_list: List[Dict[str, Any]]):
        self.samples = data_list

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Dict[str, Any]:
        return self.samples[idx]


def train_gnn_scorer(
    snapshot: Optional[Dict[str, Any]] = None,
    dataset: Optional[List[Dict[str, Any]]] = None,
    epochs: int = 50,
    lr: float = 1e-3,
    hidden_dim: int = 64,
    num_layers: int = 2,
    batch_size: int = 32,
    val_split: float = 0.2,
    model_save_path: str = "results/gnn_scorer_best.pt",
    history_save_path: str = "results/scorer_training_history.json",
    seed: int = 42
) -> Dict[str, Any]:
    """
    Trains the classical GNNScorer model on candidate layout dataset.
    """
    torch.manual_seed(seed)
    np.random.seed(seed)
    random.seed(seed)

    if snapshot is None:
        snapshot = get_latest_calibration_snapshot("data/raw/calibration")

    circuits = load_benchmark_circuits("data/circuits")

    if dataset is None:
        dataset_path = "data/processed/mapping_dataset.json"
        if os.path.exists(dataset_path):
            with open(dataset_path, "r") as f:
                dataset = json.load(f)
        else:
            dataset = generate_training_dataset(snapshot, circuits, samples_per_circuit=40, seed=seed)

    # 1. Precompute hardware graph & distance/error matrices
    hw_graph = build_hardware_graph(snapshot)
    dist_mat = compute_hardware_distance_matrix(snapshot)
    err_mat = compute_hardware_error_matrix(snapshot)

    # 2. Precompute circuit graphs
    circ_graphs = {c_id: build_circuit_graph(c) for c_id, c in circuits.items()}

    # 3. Train/Val Split
    random.shuffle(dataset)
    val_size = int(len(dataset) * val_split)
    train_data = dataset[val_size:]
    val_data = dataset[:val_size]

    logger.info(f"Training dataset: {len(train_data)} train, {len(val_data)} validation samples.")

    # 4. Model, Optimizer, Loss
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = GNNScorer(
        hidden_dim=hidden_dim,
        num_layers=num_layers,
        dropout=0.1
    ).to(device)

    hw_graph = hw_graph.to(device)
    dist_mat = dist_mat.to(device)
    err_mat = err_mat.to(device)
    for c_id in circ_graphs:
        circ_graphs[c_id] = circ_graphs[c_id].to(device)

    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    criterion = nn.SmoothL1Loss(beta=0.5)

    best_val_loss = float("inf")
    best_spearman = -1.0
    history = []

    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    os.makedirs(os.path.dirname(history_save_path), exist_ok=True)

    # Helper function to evaluate loss and rank correlation on a dataset
    def evaluate(samples: List[Dict[str, Any]]) -> Tuple[float, float, float]:
        model.eval()
        total_loss = 0.0
        preds_all = []
        targets_all = []

        # Group by circuit_id for fast parallel scoring
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for s in samples:
            grouped.setdefault(s["circuit_id"], []).append(s)

        with torch.no_grad():
            # Compute hardware node embeddings once
            h_hw = model.hw_encoder(hw_graph.x, hw_graph.edge_index, hw_graph.edge_attr)

            for c_id, group in grouped.items():
                c_graph = circ_graphs[c_id]
                h_circ = model.circ_encoder(c_graph.x, c_graph.edge_index, c_graph.edge_attr)

                # Batch mappings
                n = c_graph.num_nodes
                mappings_list = [[g["mapping"][str(i) if str(i) in g["mapping"] else i] for i in range(n)] for g in group]
                mappings_tensor = torch.tensor(mappings_list, dtype=torch.long, device=device)
                targets = torch.tensor([g["log_fidelity"] for g in group], dtype=torch.float32, device=device)

                # Clamp targets to avoid extreme outlier penalties skewing regression
                targets_clamped = torch.clamp(targets, min=-10.0, max=0.0)

                pred_scores = model.score_mappings(
                    h_hw=h_hw,
                    h_circ=h_circ,
                    hw_x=hw_graph.x,
                    circ_x=c_graph.x,
                    circ_edge_index=c_graph.edge_index,
                    circ_edge_attr=c_graph.edge_attr,
                    mappings=mappings_tensor,
                    dist_matrix=dist_mat,
                    err_matrix=err_mat
                )

                loss = criterion(pred_scores, targets_clamped)
                total_loss += loss.item() * len(group)
                preds_all.extend(pred_scores.cpu().tolist())
                targets_all.extend(targets_clamped.cpu().tolist())

        mean_loss = total_loss / len(samples)
        mae = float(np.mean(np.abs(np.array(preds_all) - np.array(targets_all))))
        corr, _ = spearmanr(preds_all, targets_all)
        return mean_loss, mae, float(corr if not np.isnan(corr) else 0.0)

    # 5. Training Loop
    for epoch in range(1, epochs + 1):
        model.train()
        random.shuffle(train_data)
        grouped_train: Dict[str, List[Dict[str, Any]]] = {}
        for s in train_data:
            grouped_train.setdefault(s["circuit_id"], []).append(s)

        epoch_loss = 0.0
        optimizer.zero_grad()

        # Compute hardware node embeddings for this epoch pass
        h_hw = model.hw_encoder(hw_graph.x, hw_graph.edge_index, hw_graph.edge_attr)
        total_loss_tensor = torch.tensor(0.0, device=device)

        for c_id, group in grouped_train.items():
            c_graph = circ_graphs[c_id]
            h_circ = model.circ_encoder(c_graph.x, c_graph.edge_index, c_graph.edge_attr)

            n = c_graph.num_nodes
            mappings_list = [[g["mapping"][str(i) if str(i) in g["mapping"] else i] for i in range(n)] for g in group]
            mappings_tensor = torch.tensor(mappings_list, dtype=torch.long, device=device)
            targets = torch.tensor([g["log_fidelity"] for g in group], dtype=torch.float32, device=device)
            targets_clamped = torch.clamp(targets, min=-10.0, max=0.0)

            pred_scores = model.score_mappings(
                h_hw=h_hw,
                h_circ=h_circ,
                hw_x=hw_graph.x,
                circ_x=c_graph.x,
                circ_edge_index=c_graph.edge_index,
                circ_edge_attr=c_graph.edge_attr,
                mappings=mappings_tensor,
                dist_matrix=dist_mat,
                err_matrix=err_mat
            )

            loss = criterion(pred_scores, targets_clamped)
            weight = len(group) / len(train_data)
            total_loss_tensor = total_loss_tensor + loss * weight
            epoch_loss += loss.item() * len(group)

        total_loss_tensor.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()

        train_loss = epoch_loss / len(train_data)
        val_loss, val_mae, val_spearman = evaluate(val_data)

        history.append({
            "epoch": epoch,
            "train_loss": train_loss,
            "val_loss": val_loss,
            "val_mae": val_mae,
            "val_spearman": val_spearman
        })

        if val_loss < best_val_loss or (val_loss <= best_val_loss * 1.05 and val_spearman > best_spearman):
            best_val_loss = val_loss
            best_spearman = val_spearman
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_loss": val_loss,
                "val_spearman": val_spearman,
                "hidden_dim": hidden_dim,
                "num_layers": num_layers,
            }, model_save_path)

        if epoch % 10 == 0 or epoch == 1 or epoch == epochs:
            logger.info(
                f"Epoch {epoch:02d}/{epochs:02d} | "
                f"Train Loss: {train_loss:.4f} | "
                f"Val Loss: {val_loss:.4f} | "
                f"Val MAE: {val_mae:.4f} | "
                f"Spearman rho: {val_spearman:.4f}"
            )

    with open(history_save_path, "w") as f:
        json.dump(history, f, indent=2)

    logger.info(f"Training complete. Best checkpoint saved to {model_save_path}")
    return {
        "best_val_loss": best_val_loss,
        "best_spearman": best_spearman,
        "checkpoint_path": model_save_path,
        "history_path": history_save_path
    }


if __name__ == "__main__":
    snap = get_latest_calibration_snapshot("data/raw/calibration")
    train_gnn_scorer(snapshot=snap, epochs=30)
