"""
Unit & Integration Tests for Quantum Calibration Intelligence FastAPI Server.
"""

import pytest
from fastapi.testclient import TestClient

from src.api.server import app, initialize_state


@pytest.fixture(scope="module")
def client():
    initialize_state()
    c = TestClient(app)
    return c


def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["backend"] == "ibm_kingston"
    assert data["qubit_count"] == 156


def test_api_backends(client):
    res = client.get("/api/backends")
    assert res.status_code == 200
    data = res.json()
    assert "backends" in data
    assert any(b["id"] == "ibm_kingston" for b in data["backends"])


def test_api_backend_topology(client):
    res = client.get("/api/backends/ibm_kingston/topology")
    assert res.status_code == 200
    data = res.json()
    assert data["total_qubits"] == 156
    assert data["total_edges"] > 300
    assert len(data["nodes"]) == 156
    # Check node structure
    n0 = data["nodes"][0]
    assert "x2d" in n0 and "y2d" in n0
    assert "x3d" in n0 and "y3d" in n0 and "z3d" in n0
    assert "t1_us" in n0 and "t2_us" in n0
    assert "error_tier" in n0


def test_api_calibration_analytics(client):
    res = client.get("/api/calibration/analytics")
    assert res.status_code == 200
    data = res.json()
    assert "kpis" in data
    assert "distributions" in data
    assert "rankings" in data
    assert data["kpis"]["total_qubits"] == 156
    assert data["kpis"]["avg_t1_us"] > 100.0


def test_api_calibration_history(client):
    res = client.get("/api/calibration/history")
    assert res.status_code == 200
    data = res.json()
    assert data["time_span_days"] == 30
    assert len(data["trajectories"]) == 30


def test_api_calibration_drift(client):
    res = client.get("/api/calibration/drift")
    assert res.status_code == 200
    data = res.json()
    assert data["is_trained"] is True
    assert data["qubit_branch"]["accuracy_gain_pct"] > 0
    assert data["coupler_branch"]["accuracy_gain_pct"] > 0


def test_api_models_status(client):
    res = client.get("/api/models/status")
    assert res.status_code == 200
    data = res.json()
    assert data["gnn_scorer"]["is_trained"] is True
    assert data["gnn_scorer"]["spearman_rank_correlation"] > 0.7
    assert data["drift_forecaster"]["is_trained"] is True


def test_api_circuits(client):
    res = client.get("/api/circuits")
    assert res.status_code == 200
    data = res.json()
    assert len(data["circuits"]) == 15


def test_api_routing_optimize(client):
    req_payload = {
        "circuit_id": "ghz_5q",
        "method": "caliroute_drift_aware",
        "beam_width": 4
    }
    res = client.post("/api/routing/optimize", json=req_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["circuit_id"] == "ghz_5q"
    assert data["caliroute_fidelity"] > 0.5
    assert data["caliroute_faulty_gates"] == 0
    assert len(data["initial_layout"]) == 5


def test_api_routing_benchmark(client):
    res = client.get("/api/routing/benchmark")
    assert res.status_code == 200
    data = res.json()
    assert data["total_circuits"] == 15
    assert "suite_means" in data
