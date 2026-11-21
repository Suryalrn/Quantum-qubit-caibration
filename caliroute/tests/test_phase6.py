"""
Phase 6 Test Suite for CaliRoute: Evaluation, Benchmarking & Visualizations.

Tests:
1. Multi-Regime Benchmark Results: Verifies that results/caliroute_full_benchmark.csv
   and results/caliroute_full_benchmark.json contain all 15 benchmark circuits,
   0 faulty gates for CaliRoute across all regimes, and positive fidelities.
2. Publication Figures: Verifies that high-resolution visualization figures
   are generated in results/figures/.
3. Demonstration Notebook: Verifies notebooks/demo.ipynb exists and is valid JSON.
"""

import os
import json
import pytest
import pandas as pd


def test_full_benchmark_csv_integrity():
    """Verifies that full benchmark CSV exists and has all 15 circuits."""
    csv_path = "results/caliroute_full_benchmark.csv"
    assert os.path.exists(csv_path), "Full benchmark CSV must exist."

    df = pd.read_csv(csv_path)
    assert len(df) == 15, f"Expected 15 circuits, got {len(df)}"

    # Check zero faulty gates
    assert (df["caliroute_faulty_gates"] == 0).all()

    # Check that CaliRoute maintains strictly positive fidelity
    assert (df["caliroute_drift_aware_fidelity"] > 0.0).all()

    # Check that CaliRoute beats SABRE on qft_12q (preventing catastrophic failure)
    qft_row = df[df["circuit_id"] == "qft_12q"].iloc[0]
    assert qft_row["sabre_fidelity"] == 0.0
    assert qft_row["caliroute_drift_aware_fidelity"] > 0.01


def test_publication_figures_exist():
    """Verifies that all publication figures exist and are non-empty."""
    fig1 = "results/figures/fig1_fidelity_comparison.png"
    fig2 = "results/figures/fig2_drift_forecaster_performance.png"
    fig3 = "results/figures/fig3_gnn_rank_correlation.png"

    for fig_path in [fig1, fig2, fig3]:
        assert os.path.exists(fig_path), f"Figure {fig_path} must exist."
        assert os.path.getsize(fig_path) > 1000, f"Figure {fig_path} must not be empty."


def test_demo_notebook_validity():
    """Verifies that notebooks/demo.ipynb exists and has valid cells."""
    nb_path = "notebooks/demo.ipynb"
    assert os.path.exists(nb_path), "demo.ipynb notebook must exist."

    with open(nb_path, "r", encoding="utf-8") as f:
        nb = json.load(f)

    assert "cells" in nb
    assert len(nb["cells"]) >= 3
