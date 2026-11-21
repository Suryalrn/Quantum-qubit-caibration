# INSIDE THE QUANTUM (CaliRoute Platform)

> **Beyond Classical. Into Quantum.**  
> A production-grade research platform integrating a **cinematic scroll-driven 3D landing page** and the **CaliRoute** intelligent hardware-aware quantum circuit routing simulator.

---

## 🔬 System Overview

Inside The Quantum bridges theoretical quantum computing and real-world noisy quantum hardware. The platform models real-time calibration drift, physical qubit defect isolation, and deep-learning-assisted circuit compilation across superconducting architectures (IBM Kingston 156Q, Hummingbird, Eagle).

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                 SYSTEM TOPOLOGY                                   │
├──────────────────────────────────────┬────────────────────────────────────────────┤
│  Frontend (Next.js 14 / Three.js)    │  Backend (FastAPI / PyTorch / SABRE)       │
├──────────────────────────────────────┼────────────────────────────────────────────┤
│  • Continuous 6-Scene 3D Flight      │  • Dual-Encoder Graph Neural Network (GNN) │
│  • Photorealistic Dilution Cryostat  │  • LSTM 30-Day Calibration Drift Predictor │
│  • Interactive QPU Topology Explorer │  • SABRE vs. CaliRoute A/B Compiler Engine │
│  • Real-time OpenQASM 2.0 Studio     │  • Noise-Adaptive Qubit Layout Routing     │
└──────────────────────────────────────┴────────────────────────────────────────────┘
```

---

## 🌌 1. Cinematic 3D Journey (Frontend)

Built with **Next.js 14 (App Router)**, **React Three Fiber**, **Three.js**, and **Tailwind CSS**:
1. **Scene 01 — Dilution Refrigerator**: Full 3.4m golden cryostat chandelier with CNC-machined OFHC copper stages, knurled gold standoffs, and semi-rigid coaxial microwave cabling.
2. **Scene 02 — Cryogenic Chamber**: 304 stainless steel vacuum vessel cutaway, 50K gold radiation shield with fluid tracer piping, and braided copper thermal links.
3. **Scene 03 — Superconducting Chip**: High-resistivity silicon die with micro-lithographic ground plane vias, CPW transmission resonators, 48 arched pure gold wire bonds, and SMP RF launchers.
4. **Scene 04 — Qubit Topology (Heavy-Hex)**: Planar transmon capacitor crosses with sub-micron Josephson junction SQUID loops and traveling coherent wave packets.
5. **Scene 05 — State Tomography & Calibration**: Holographic Bloch sphere with Larmor state vector $|\psi\rangle$ precession, microwave Gaussian DRAG pulse waveforms, and cavity resonance transmission dip $|S_{21}(f)|$.
6. **Scene 06 — Distributed Quantum Ecosystem**: 6 orbiting satellite QPU modules linked by photonic quantum channels and ambient quantum fluctuation particles.

### Interactive Tools:
- **Routing Simulator** (`/routing`): Interactive circuit routing comparison with custom OpenQASM 2.0 code editor, AST visualization, and gate-level execution fidelity metrics.
- **QPU Explorer** (`/explorer`): 3D and 2D topology visualizer for IBM Kingston (156Q), Sherbrooke (127Q), and Brisbane (127Q) with real-time error tiers.
- **Analytics & Benchmarks** (`/analytics`): Calibration distributions, $T_1 / T_2$ coherence rankings, and SABRE benchmark suites.
- **ML & Dual-Encoder GNN** (`/ml`): Deep graph neural network embedding hardware coupling graphs and circuit DAGs.
- **Drift Forecaster** (`/drift`): 30-day temporal LSTM predicting two-qubit gate degradation.

---

## ⚡ 2. CaliRoute Optimization Engine (Backend)

Built with **Python 3.11**, **FastAPI**, **PyTorch**, and **NetworkX**:
- **Dual-Encoder GNN**: Simultaneously embeds directed acyclic graphs (DAGs) of quantum operations and physical heavy-hex hardware topologies to score candidate SWAP paths.
- **Temporal Drift Engine**: Predicts time-dependent $T_1$, $T_2^*$, and CNOT error rate fluctuations to steer circuit gates away from emerging physical two-level system (TLS) defects.
- **OpenQASM Parser**: Custom Lexer, Parser, and AST compiler supporting parameterized single-qubit rotations (`u3`, `rx`, `ry`, `rz`) and multi-qubit entangling gates (`cx`, `cz`, `swap`).

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js**: >= 18.x
- **Python**: >= 3.10
- **Git**

### 1. Backend Setup (FastAPI)
```bash
# Navigate to backend directory
cd caliroute

# Install dependencies (or activate existing virtualenv)
pip install -r requirements.txt

# Run the FastAPI server
python run_server.py
# API is now live at http://localhost:8000 (Swagger docs at /docs)
```

### 2. Frontend Setup (Next.js)
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Web application is live at http://localhost:3000
```

---

## 🧪 Testing Suite

### Backend Tests
```bash
cd caliroute
pytest
# Runs 36 unit & integration tests covering API endpoints, routing algorithms, and AST compilation.
```

### Frontend Typecheck & Build
```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## 📄 License
MIT License. Developed for advanced quantum computing research and intelligent hardware-aware circuit optimization.
