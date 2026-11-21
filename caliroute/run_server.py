"""
Quantum Calibration Intelligence API Server Runner.

Usage:
    python run_server.py
"""

import sys
from pathlib import Path

# Add project root to sys.path
REPO_ROOT = Path(__file__).resolve().parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import uvicorn

if __name__ == "__main__":
    uvicorn.run("src.api.server:app", host="127.0.0.1", port=8000, log_level="info")
