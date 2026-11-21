"""
SABRE Baseline Transpiler Runner for CaliRoute.

Executes Qiskit's standard default transpiler (SABRE layout + SABRE routing)
on benchmark circuits against the hardware backend's coupling map.
Records:
- Logical-to-physical initial qubit mapping
- Final qubit placement
- Two-qubit gate count (e.g., ECR, CX)
- Total gate count and circuit depth
- Transpiled quantum circuit artifacts
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

import pandas as pd
import yaml
from qiskit import QuantumCircuit, transpile, qpy

import sys
from pathlib import Path

# Add project root to sys.path if not present
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

try:
    from caliroute.src.collect.snapshot_calibration import get_backend_instance
    from caliroute.src.collect.load_circuits import load_benchmark_circuits
except ImportError:
    from src.collect.snapshot_calibration import get_backend_instance
    from src.collect.load_circuits import load_benchmark_circuits

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("caliroute.baselines.sabre")


def extract_initial_layout_mapping(transpiled_circuit: QuantumCircuit, original_circuit: QuantumCircuit) -> Dict[int, int]:
    """
    Extracts the mapping from original circuit's logical qubit index -> backend physical qubit index.
    """
    if transpiled_circuit.layout is None or transpiled_circuit.layout.initial_layout is None:
        return {}

    init_layout = transpiled_circuit.layout.initial_layout
    mapping = {}
    for idx, orig_q in enumerate(original_circuit.qubits):
        try:
            phys_q = init_layout[orig_q]
            mapping[idx] = int(phys_q)
        except Exception:
            pass
    return mapping


def extract_final_layout_mapping(transpiled_circuit: QuantumCircuit) -> Dict[int, int]:
    """
    Extracts the physical qubit positions at circuit termination.
    """
    if transpiled_circuit.layout is None or transpiled_circuit.layout.final_layout is None:
        return {}

    final_layout = transpiled_circuit.layout.final_layout
    mapping = {}
    try:
        for phys_idx, virt_q in final_layout.get_physical_bits().items():
            mapping[int(phys_idx)] = getattr(virt_q, "_index", int(phys_idx))
    except Exception:
        pass
    return mapping


def run_sabre_baseline_single(
    circuit: QuantumCircuit,
    backend,
    seed: int = 42,
    optimization_level: int = 1
) -> Dict[str, Any]:
    """
    Transpiles a single circuit with SABRE layout and routing.
    Returns structured metrics and the transpiled circuit.
    """
    tc = transpile(
        circuit,
        backend=backend,
        layout_method="sabre",
        routing_method="sabre",
        seed_transpiler=seed,
        optimization_level=optimization_level
    )

    ops = tc.count_ops()
    two_q_ops = ["ecr", "cx", "cz", "swap"]
    two_q_count = sum(ops.get(op, 0) for op in two_q_ops)
    total_count = sum(ops.values())
    depth = tc.depth()

    init_mapping = extract_initial_layout_mapping(tc, circuit)
    final_mapping = extract_final_layout_mapping(tc)

    return {
        "circuit_name": circuit.name or "circuit",
        "num_qubits": circuit.num_qubits,
        "initial_layout": init_mapping,
        "final_layout": final_mapping,
        "two_qubit_gate_count": two_q_count,
        "total_gate_count": total_count,
        "depth": depth,
        "ops_breakdown": dict(ops),
        "transpiled_circuit": tc,
    }


def run_sabre_baseline_suite(
    circuits: Dict[str, QuantumCircuit],
    backend,
    seed: int = 42,
    optimization_level: int = 1,
    output_dir: str = "results",
    save_circuits_dir: str = "data/processed/sabre_transpiled"
) -> Dict[str, Any]:
    """
    Runs SABRE baseline across a dictionary of benchmark circuits.
    Saves results to JSON and CSV, and stores transpiled QPY circuits.
    """
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    qpy_path = Path(save_circuits_dir)
    qpy_path.mkdir(parents=True, exist_ok=True)

    records = {}
    table_rows = []

    backend_name = getattr(backend, "name", "unknown")
    logger.info(f"Running SABRE baseline for {len(circuits)} circuits on backend '{backend_name}'...")

    for cid, qc in circuits.items():
        logger.info(f"Transpiling {cid} ({qc.num_qubits} qubits)...")
        res = run_sabre_baseline_single(
            circuit=qc,
            backend=backend,
            seed=seed,
            optimization_level=optimization_level
        )

        # Save transpiled circuit to disk
        tc_file = qpy_path / f"{cid}_sabre.qpy"
        with open(tc_file, "wb") as f:
            qpy.dump(res["transpiled_circuit"], f)

        # Remove transpiled_circuit object from JSON-serializable output dict
        serializable = {k: v for k, v in res.items() if k != "transpiled_circuit"}
        serializable["transpiled_circuit_path"] = str(tc_file)
        records[cid] = serializable

        table_rows.append({
            "circuit_id": cid,
            "num_qubits": res["num_qubits"],
            "two_qubit_gates": res["two_qubit_gate_count"],
            "total_gates": res["total_gate_count"],
            "depth": res["depth"],
            "initial_layout": str(res["initial_layout"]),
        })

    # Save JSON summary
    json_path = out_path / "sabre_baseline.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)

    # Save CSV table
    df = pd.DataFrame(table_rows)
    csv_path = out_path / "sabre_baseline.csv"
    df.to_csv(csv_path, index=False)

    logger.info(f"Saved SABRE baseline JSON to: {json_path}")
    logger.info(f"Saved SABRE baseline CSV to: {csv_path}")

    return records


def load_sabre_baseline_results(json_path: str = "results/sabre_baseline.json") -> Dict[str, Any]:
    """Loads recorded SABRE baseline results from JSON."""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Run SABRE Baseline Transpiler on Benchmark Circuits")
    parser.add_argument("--config", type=str, default="configs/default.yaml", help="Path to YAML config")
    args = parser.parse_args()

    cfg = {}
    if os.path.exists(args.config):
        with open(args.config, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f)

    b_name = cfg.get("backend", {}).get("name", "ibm_sherbrooke")
    tok = cfg.get("backend", {}).get("token", None)
    chan = cfg.get("backend", {}).get("channel", "ibm_quantum_platform")
    fb = cfg.get("backend", {}).get("fallback_to_mock", True)

    circ_dir = cfg.get("paths", {}).get("circuits_dir", "data/circuits")
    res_dir = cfg.get("paths", {}).get("results_dir", "results")
    sabre_cfg = cfg.get("sabre", {})
    seed = sabre_cfg.get("seed_transpiler", 42)
    opt = sabre_cfg.get("optimization_level", 1)

    backend, _ = get_backend_instance(
        backend_name=b_name,
        token=tok,
        channel=chan,
        fallback_to_mock=fb
    )

    circuits = load_benchmark_circuits(circuits_dir=circ_dir)
    results = run_sabre_baseline_suite(
        circuits=circuits,
        backend=backend,
        seed=seed,
        optimization_level=opt,
        output_dir=res_dir
    )
    logger.info(f"SABRE baseline run completed for {len(results)} circuits.")
