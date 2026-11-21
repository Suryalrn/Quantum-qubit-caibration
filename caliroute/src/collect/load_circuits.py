"""
Benchmark Circuit Loader for CaliRoute.

Loads and saves a fixed benchmark circuit suite using MQT Bench across multiple
qubit-count tiers (e.g., 5, 8, 12 qubits). Circuits are serialized to QASM/QPY
in data/circuits/ to ensure exact reproducibility across experiments and offline testing.
"""

import os
import logging
from pathlib import Path
from typing import Dict, List, Optional
import yaml

from qiskit import QuantumCircuit, qpy
import mqt.bench as mb

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("caliroute.collect.circuits")

DEFAULT_ALGORITHMS = ["ghz", "dj", "qft", "graphstate", "wstate"]
DEFAULT_TIERS = [5, 8, 12]


def generate_benchmark_circuit(algorithm: str, num_qubits: int) -> QuantumCircuit:
    """
    Fetches an algorithm-independent benchmark circuit from MQT Bench.
    """
    try:
        qc = mb.get_benchmark(algorithm, mb.BenchmarkLevel.INDEP, num_qubits)
        qc.name = f"{algorithm}_{num_qubits}q"
        return qc
    except Exception as e:
        logger.error(f"Failed to generate benchmark for {algorithm} with {num_qubits} qubits: {e}")
        raise


def get_benchmark_set(
    algorithms: Optional[List[str]] = None,
    qubit_tiers: Optional[List[int]] = None
) -> Dict[str, QuantumCircuit]:
    """
    Generates dictionary mapping circuit_id (e.g. 'qft_5q') to QuantumCircuit.
    """
    algs = algorithms or DEFAULT_ALGORITHMS
    tiers = qubit_tiers or DEFAULT_TIERS
    circuits = {}

    for alg in algs:
        for n_q in tiers:
            circuit_id = f"{alg}_{n_q}q"
            qc = generate_benchmark_circuit(alg, n_q)
            circuits[circuit_id] = qc

    return circuits


def save_benchmark_circuits(
    circuits: Dict[str, QuantumCircuit],
    output_dir: str = "data/circuits",
    save_qasm: bool = True
) -> Dict[str, str]:
    """
    Saves circuits to output_dir in QPY (fast binary) and optionally OpenQASM format.
    Returns mapping of circuit_id to file path.
    """
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    saved_paths = {}

    for circuit_id, qc in circuits.items():
        # Save as QPY binary
        qpy_file = out_path / f"{circuit_id}.qpy"
        with open(qpy_file, "wb") as f:
            qpy.dump(qc, f)
        saved_paths[circuit_id] = str(qpy_file)

        # Save as OpenQASM if requested
        if save_qasm:
            qasm_file = out_path / f"{circuit_id}.qasm"
            try:
                from qiskit import qasm2
                with open(qasm_file, "w", encoding="utf-8") as f:
                    qasm2.dump(qc, f)
            except Exception:
                try:
                    with open(qasm_file, "w", encoding="utf-8") as f:
                        f.write(qc.qasm())
                except Exception as e:
                    logger.warning(f"Could not dump QASM for {circuit_id}: {e}")

    logger.info(f"Saved {len(saved_paths)} benchmark circuits to {output_dir}")
    return saved_paths


def load_benchmark_circuits(
    circuits_dir: str = "data/circuits",
    algorithms: Optional[List[str]] = None,
    qubit_tiers: Optional[List[int]] = None,
    auto_generate: bool = True
) -> Dict[str, QuantumCircuit]:
    """
    Loads benchmark circuits from circuits_dir. If files don't exist and auto_generate is True,
    generates and saves them.
    """
    path = Path(circuits_dir)
    algs = algorithms or DEFAULT_ALGORITHMS
    tiers = qubit_tiers or DEFAULT_TIERS
    expected_ids = [f"{alg}_{t}q" for alg in algs for t in tiers]

    circuits: Dict[str, QuantumCircuit] = {}
    missing_ids = []

    if path.exists():
        for cid in expected_ids:
            qpy_path = path / f"{cid}.qpy"
            if qpy_path.exists():
                with open(qpy_path, "rb") as f:
                    qcs = qpy.load(f)
                    circuits[cid] = qcs[0] if isinstance(qcs, list) else qcs
            else:
                missing_ids.append(cid)
    else:
        missing_ids = expected_ids

    if missing_ids:
        if auto_generate:
            logger.info(f"{len(missing_ids)} circuits missing from {circuits_dir}; generating from MQT Bench...")
            # Generate only missing or full set
            for cid in missing_ids:
                # parse alg and tier
                parts = cid.rsplit("_", 1)
                alg = parts[0]
                n_q = int(parts[1].replace("q", ""))
                qc = generate_benchmark_circuit(alg, n_q)
                circuits[cid] = qc
            save_benchmark_circuits(circuits, output_dir=circuits_dir)
        else:
            raise FileNotFoundError(f"Missing circuits in {circuits_dir}: {missing_ids}")

    return circuits


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate and Save MQT Bench Circuits")
    parser.add_argument("--config", type=str, default="configs/default.yaml", help="Path to config file")
    parser.add_argument("--outdir", type=str, default=None, help="Output directory")
    args = parser.parse_args()

    cfg = {}
    if os.path.exists(args.config):
        with open(args.config, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f)

    circuits_cfg = cfg.get("circuits", {})
    algs = circuits_cfg.get("algorithms", DEFAULT_ALGORITHMS)
    tiers = circuits_cfg.get("qubit_tiers", DEFAULT_TIERS)
    out_dir = args.outdir or cfg.get("paths", {}).get("circuits_dir", "data/circuits")
    save_qasm = circuits_cfg.get("save_qasm", True)

    logger.info(f"Generating benchmarks for algorithms={algs}, tiers={tiers}...")
    benchmarks = get_benchmark_set(algorithms=algs, qubit_tiers=tiers)
    saved = save_benchmark_circuits(benchmarks, output_dir=out_dir, save_qasm=save_qasm)
    logger.info(f"Done! Created {len(saved)} benchmark circuits in {out_dir}")
