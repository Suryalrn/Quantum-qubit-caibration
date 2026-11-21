"""
Fidelity Proxy Calculator for CaliRoute.

================================================================================
CRITICAL ARCHITECTURAL PRINCIPLE: ZERO QUANTUM-STATE SIMULATION
================================================================================
This module strictly computes an algebraic fidelity proxy using closed-form
arithmetic directly over measured, empirical hardware calibration numbers:
- Product of gate survival probabilities: Prod(1 - error_rate)
- Product of readout survival probabilities: Prod(1 - readout_error)
- Accumulated idle decoherence survival: exp(-sum(t_idle / T1) - sum(t_idle / T2))

At NO POINT does this module simulate quantum statevectors, density matrices,
or execute Qiskit Aer simulators. This ensures:
1. Exact conformance with the project's non-simulation hard constraint.
2. Computational efficiency: Runs in O(N_gates) time.
3. Scalability: Evaluates circuits on 127+ qubit hardware topologies without
   the 2^N exponential memory explosion of statevector simulation.
================================================================================
"""

import os
import math
import json
import logging
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List, Set

import pandas as pd
import networkx as nx
from qiskit import QuantumCircuit, qpy

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("caliroute.scoring.proxy")


@dataclass
class ProxyScore:
    """Structured container for the algebraic fidelity proxy components."""
    circuit_name: str
    fidelity_proxy: float
    log_fidelity: float
    p_gate_survival: float
    p_readout_survival: float
    p_decoherence_survival: float
    makespan_seconds: float
    total_idle_time_seconds: float
    active_qubits: List[int]
    two_qubit_gate_count: int
    total_gate_count: int
    depth: int
    faulty_gate_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _get_coupling_graph(coupling_map: List[List[int]]) -> nx.Graph:
    """Builds an undirected NetworkX graph from a directed coupling edge list."""
    G = nx.Graph()
    for edge in coupling_map:
        if len(edge) >= 2:
            G.add_edge(int(edge[0]), int(edge[1]))
    return G


def compute_fidelity_proxy_for_transpiled(
    transpiled_circuit: QuantumCircuit,
    snapshot: Dict[str, Any]
) -> ProxyScore:
    """
    Computes the algebraic fidelity proxy for an already transpiled physical circuit.

    Math formulation:
        P_gate = Prod_{g in gates} (1 - error(g))
        P_readout = Prod_{q in measured} (1 - readout_error(q))
        P_decoherence = Prod_{q in used} exp(- t_idle(q) * (1/T1(q) + 1/T2(q)))
        Fidelity_Proxy = P_gate * P_readout * P_decoherence
    """
    qubits_calib = snapshot.get("qubits", {})
    edges_calib = snapshot.get("edges", {})
    sq_calib = snapshot.get("single_qubit_gates", {})

    p_gate = 1.0
    p_readout = 1.0
    two_q_count = 0
    total_gate_count = 0
    faulty_gate_count = 0

    # Physical qubit scheduling trackers for idle decoherence calculation
    t_avail: Dict[int, float] = {}
    t_idle: Dict[int, float] = {}
    t_active: Dict[int, float] = {}
    used_qubits: Set[int] = set()

    for inst in transpiled_circuit.data:
        op_name = inst.operation.name
        if op_name in ("barrier", "delay"):
            continue

        total_gate_count += 1
        q_indices = [transpiled_circuit.find_bit(q).index for q in inst.qubits]

        for q in q_indices:
            used_qubits.add(q)
            if q not in t_avail:
                t_avail[q] = 0.0
                t_idle[q] = 0.0
                t_active[q] = 0.0

        # 1. Gate Error and Duration Extraction
        if len(q_indices) == 1:
            q = q_indices[0]
            if op_name == "measure":
                ro_err = float(qubits_calib.get(str(q), {}).get("readout_error", 0.01))
                ro_len = float(qubits_calib.get(str(q), {}).get("readout_length", 1.2e-6))
                if ro_err >= 0.5:
                    faulty_gate_count += 1
                p_readout *= max(1e-7, 1.0 - ro_err)
                dur = ro_len
            else:
                sq_info = sq_calib.get(str(q), {}).get(op_name, {})
                # Virtual RZ gates have zero error and zero duration
                if op_name == "rz":
                    err = 0.0
                    dur = 0.0
                else:
                    err = float(sq_info.get("gate_error", 0.0003))
                    dur = float(sq_info.get("gate_length", 5.68e-8))
                if err >= 0.5:
                    faulty_gate_count += 1
                p_gate *= max(1e-7, 1.0 - err)
        elif len(q_indices) == 2:
            two_q_count += 1
            u, v = q_indices[0], q_indices[1]
            edge_key = f"{u}_{v}"
            rev_key = f"{v}_{u}"
            edge_info = edges_calib.get(edge_key) or edges_calib.get(rev_key) or {}
            err = float(edge_info.get("gate_error", 0.01))
            dur = float(edge_info.get("gate_length", 5.33e-7))
            if err >= 0.5:
                faulty_gate_count += 1
            p_gate *= max(1e-7, 1.0 - err)
        else:
            dur = 0.0

        # 2. ASAP Layer Scheduling & Idle Time Tracking
        t_start = max(t_avail[q] for q in q_indices)
        t_end = t_start + dur
        for q in q_indices:
            t_idle[q] += (t_start - t_avail[q])
            t_active[q] += dur
            t_avail[q] = t_end

    # 3. Accumulated Idle Time (including tail makespan latency)
    makespan = max(t_avail.values()) if t_avail else 0.0
    p_decoherence = 1.0
    total_idle_acc = 0.0

    for q in used_qubits:
        qubit_tail_idle = makespan - t_avail[q]
        qubit_total_idle = t_idle[q] + qubit_tail_idle
        total_idle_acc += qubit_total_idle

        t1 = qubits_calib.get(str(q), {}).get("t1", 200e-6)
        t2 = qubits_calib.get(str(q), {}).get("t2", 100e-6)
        # Avoid division by zero
        rate_t1 = 1.0 / max(1e-9, float(t1))
        rate_t2 = 1.0 / max(1e-9, float(t2))

        # Survival probability under combined relaxation and dephasing
        decay_factor = math.exp(-qubit_total_idle * (rate_t1 + rate_t2))
        p_decoherence *= max(1e-12, decay_factor)

    # 4. Total Analytical Proxy Score
    fidelity_proxy = float(p_gate * p_readout * p_decoherence)
    log_fid = math.log(max(1e-30, fidelity_proxy))

    return ProxyScore(
        circuit_name=transpiled_circuit.name or "circuit",
        fidelity_proxy=fidelity_proxy,
        log_fidelity=log_fid,
        p_gate_survival=float(p_gate),
        p_readout_survival=float(p_readout),
        p_decoherence_survival=float(p_decoherence),
        makespan_seconds=float(makespan),
        total_idle_time_seconds=float(total_idle_acc),
        active_qubits=sorted(list(used_qubits)),
        two_qubit_gate_count=two_q_count,
        total_gate_count=total_gate_count,
        depth=transpiled_circuit.depth(),
        faulty_gate_count=faulty_gate_count,
    )


def compute_fidelity_proxy(
    circuit: QuantumCircuit,
    mapping: Dict[int, int],
    snapshot: Dict[str, Any],
) -> ProxyScore:
    """
    Computes estimated fidelity proxy for any arbitrary (circuit, mapping, snapshot) triple.

    If the circuit is already a physical mapped/transpiled circuit with size matching the backend,
    evaluates it directly. Otherwise, models the mapping quality algebraically using graph
    distances, edge errors along routing paths, and qubit coherence.
    """
    num_backend_qubits = snapshot.get("metadata", {}).get("num_qubits", 127)

    # If the circuit is already full physical transpiled circuit
    if circuit.num_qubits >= num_backend_qubits and circuit.layout is not None:
        return compute_fidelity_proxy_for_transpiled(circuit, snapshot)

    # Otherwise, evaluate logical circuit mapped to physical qubits via mapping
    qubits_calib = snapshot.get("qubits", {})
    edges_calib = snapshot.get("edges", {})
    sq_calib = snapshot.get("single_qubit_gates", {})
    coupling_map = snapshot.get("coupling_map", [])
    coupling_graph = _get_coupling_graph(coupling_map)

    p_gate = 1.0
    p_readout = 1.0
    two_q_count = 0
    total_gate_count = 0

    t_avail: Dict[int, float] = {}
    t_idle: Dict[int, float] = {}
    used_phys_qubits: Set[int] = set()

    # Pre-populate used qubits from mapping
    for l_idx, p_idx in mapping.items():
        used_phys_qubits.add(p_idx)
        t_avail[p_idx] = 0.0
        t_idle[p_idx] = 0.0

    for inst in circuit.data:
        op_name = inst.operation.name
        if op_name in ("barrier", "delay"):
            continue

        total_gate_count += 1
        l_indices = [circuit.find_bit(q).index for q in inst.qubits]

        if len(l_indices) == 1:
            l_q = l_indices[0]
            p_q = mapping.get(l_q, l_q)
            used_phys_qubits.add(p_q)
            if p_q not in t_avail:
                t_avail[p_q] = 0.0
                t_idle[p_q] = 0.0

            if op_name == "measure":
                ro_err = qubits_calib.get(str(p_q), {}).get("readout_error", 0.01)
                ro_len = qubits_calib.get(str(p_q), {}).get("readout_length", 1.2e-6)
                p_readout *= max(1e-7, 1.0 - float(ro_err))
                dur = float(ro_len)
            else:
                if op_name == "rz":
                    err = 0.0
                    dur = 0.0
                else:
                    sq_info = sq_calib.get(str(p_q), {}).get(op_name, {})
                    err = sq_info.get("gate_error", 0.0003)
                    dur = sq_info.get("gate_length", 5.68e-8)
                p_gate *= max(1e-7, 1.0 - float(err))

            t_start = t_avail[p_q]
            t_end = t_start + dur
            t_avail[p_q] = t_end

        elif len(l_indices) == 2:
            l1, l2 = l_indices[0], l_indices[1]
            p1, p2 = mapping.get(l1, l1), mapping.get(l2, l2)
            used_phys_qubits.add(p1)
            used_phys_qubits.add(p2)
            for pq in (p1, p2):
                if pq not in t_avail:
                    t_avail[pq] = 0.0
                    t_idle[pq] = 0.0

            # Distance in hardware coupling graph
            try:
                path = nx.shortest_path(coupling_graph, source=p1, target=p2)
                dist = len(path) - 1
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                dist = 5  # penalty if disconnected
                path = [p1, p2]

            # Direct 2Q gate or SWAP-routed gate
            # A distance d requires at least (d - 1) SWAPs. Each SWAP = 3 2Q gates (ECR/CX).
            num_swaps = max(0, dist - 1)
            additional_2q_gates = 3 * num_swaps
            total_2q_for_op = 1 + additional_2q_gates
            two_q_count += total_2q_for_op

            # Accumulate gate errors along the traversed edges
            traversed_edges = []
            for i in range(len(path) - 1):
                traversed_edges.append((path[i], path[i+1]))

            # Primary gate error
            edge_err = 0.01
            for u_e, v_e in traversed_edges:
                e_info = edges_calib.get(f"{u_e}_{v_e}") or edges_calib.get(f"{v_e}_{u_e}") or {}
                edge_err = max(edge_err, e_info.get("gate_error", 0.01))

            p_gate *= max(1e-7, (1.0 - edge_err) ** total_2q_for_op)

            # 2Q gate duration
            dur_2q = 5.33e-7 * total_2q_for_op
            t_start = max(t_avail[p1], t_avail[p2])
            t_end = t_start + dur_2q
            for pq in (p1, p2):
                t_idle[pq] += (t_start - t_avail[pq])
                t_avail[pq] = t_end

    # Decoherence over makespan
    makespan = max(t_avail.values()) if t_avail else 0.0
    p_decoherence = 1.0
    total_idle_acc = 0.0

    for pq in used_phys_qubits:
        qubit_idle = t_idle[pq] + (makespan - t_avail[pq])
        total_idle_acc += qubit_idle
        t1 = qubits_calib.get(str(pq), {}).get("t1", 200e-6)
        t2 = qubits_calib.get(str(pq), {}).get("t2", 100e-6)
        rate = (1.0 / max(1e-9, float(t1))) + (1.0 / max(1e-9, float(t2)))
        p_decoherence *= max(1e-12, math.exp(-qubit_idle * rate))

    fidelity_proxy = float(p_gate * p_readout * p_decoherence)
    log_fid = math.log(max(1e-30, fidelity_proxy))

    return ProxyScore(
        circuit_name=circuit.name or "circuit",
        fidelity_proxy=fidelity_proxy,
        log_fidelity=log_fid,
        p_gate_survival=float(p_gate),
        p_readout_survival=float(p_readout),
        p_decoherence_survival=float(p_decoherence),
        makespan_seconds=float(makespan),
        total_idle_time_seconds=float(total_idle_acc),
        active_qubits=sorted(list(used_phys_qubits)),
        two_qubit_gate_count=two_q_count,
        total_gate_count=total_gate_count,
        depth=circuit.depth(),
        faulty_gate_count=0,
    )


def score_benchmark_suite(
    snapshot: Dict[str, Any],
    sabre_results_path: str = "results/sabre_baseline.json",
    transpiled_dir: str = "data/processed/sabre_transpiled",
    output_csv: str = "results/sabre_proxy_scores.csv",
    output_json: str = "results/sabre_proxy_scores.json"
) -> pd.DataFrame:
    """
    Computes fidelity proxy scores for all SABRE baseline circuits generated in Phase 1.
    Saves results to results/sabre_proxy_scores.csv and JSON.
    """
    with open(sabre_results_path, "r", encoding="utf-8") as f:
        sabre_meta = json.load(f)

    rows = []
    scores_dict = {}

    logger.info(f"Scoring {len(sabre_meta)} SABRE benchmark circuits with fidelity proxy...")

    for cid, meta in sabre_meta.items():
        tc_path = Path(meta["transpiled_circuit_path"])
        if not tc_path.exists():
            tc_path = Path(transpiled_dir) / f"{cid}_sabre.qpy"

        with open(tc_path, "rb") as f:
            tc = qpy.load(f)[0]

        score = compute_fidelity_proxy_for_transpiled(tc, snapshot)
        scores_dict[cid] = score.to_dict()

        rows.append({
            "circuit_id": cid,
            "num_qubits": meta["num_qubits"],
            "two_qubit_gates": score.two_qubit_gate_count,
            "total_gates": score.total_gate_count,
            "depth": score.depth,
            "faulty_gates": score.faulty_gate_count,
            "makespan_us": round(score.makespan_seconds * 1e6, 3),
            "p_gate_survival": score.p_gate_survival,
            "p_readout_survival": round(score.p_readout_survival, 5),
            "p_decoherence_survival": round(score.p_decoherence_survival, 5),
            "fidelity_proxy": score.fidelity_proxy,
            "log_fidelity": round(score.log_fidelity, 4),
        })

    df = pd.DataFrame(rows)
    Path(output_csv).parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_csv, index=False)

    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(scores_dict, f, indent=2)

    logger.info(f"Saved SABRE proxy scores to CSV: {output_csv}")
    logger.info(f"Saved SABRE proxy scores to JSON: {output_json}")
    return df


if __name__ == "__main__":
    import sys
    import argparse
    from pathlib import Path

    REPO_ROOT = Path(__file__).resolve().parent.parent.parent
    if str(REPO_ROOT) not in sys.path:
        sys.path.insert(0, str(REPO_ROOT))

    try:
        from caliroute.src.collect.snapshot_calibration import get_latest_calibration_snapshot
    except ImportError:
        from src.collect.snapshot_calibration import get_latest_calibration_snapshot

    parser = argparse.ArgumentParser(description="Compute Fidelity Proxy for SABRE Baselines")
    parser.add_argument("--snapshot-dir", default="data/raw/calibration")
    parser.add_argument("--sabre-json", default="results/sabre_baseline.json")
    parser.add_argument("--output-csv", default="results/sabre_proxy_scores.csv")
    args = parser.parse_args()

    snap = get_latest_calibration_snapshot(args.snapshot_dir)
    df_scores = score_benchmark_suite(
        snapshot=snap,
        sabre_results_path=args.sabre_json,
        output_csv=args.output_csv
    )
    print("\n" + df_scores.to_string())
