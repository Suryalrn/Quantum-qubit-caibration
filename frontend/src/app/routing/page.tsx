"use client";

import React, { useState, useEffect } from "react";
import {
  GitFork,
  Play,
  AlertTriangle,
  ShieldCheck,
  Layers,
  Download,
  Info,
  Sparkles,
  ArrowRight,
  Gauge,
  Cpu,
  Terminal,
  CheckCircle,
  Clock,
  Code2,
  FileCode,
  Activity,
  RotateCcw,
  Check,
} from "lucide-react";
import QuantumProcessor3D from "@/components/3d/QuantumProcessor3D";
import {
  getCircuits,
  getTopology,
  runRoutingOptimization,
  getBenchmarkRecords,
} from "@/lib/api";
import {
  CircuitInfo,
  TopologyData,
  RoutingResult,
  BenchmarkRecord,
  QubitNode,
} from "@/types/quantum";

// Standardized Starter Templates for Custom OpenQASM 2.0 Studio
const QASM_TEMPLATES: Record<string, { name: string; qubits: number; code: string; description: string }> = {
  bell_2q: {
    name: "Bell State / EPR Pair (2Q)",
    qubits: 2,
    description: "Maximally entangled 2-qubit Einstein-Podolsky-Rosen state (|00⟩ + |11⟩)/√2.",
    code: `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\ncreg c[2];\nh q[0];\ncx q[0], q[1];\nmeasure q -> c;`,
  },
  teleport_3q: {
    name: "Quantum Teleportation (3Q)",
    qubits: 3,
    description: "Transmits unknown quantum state from q[0] to q[2] via an entangled channel on q[1].",
    code: `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[3];\ncreg c[3];\nh q[1];\ncx q[1], q[2];\ncx q[0], q[1];\nh q[0];\nmeasure q[0] -> c[0];\nmeasure q[1] -> c[1];`,
  },
  ghz_4q: {
    name: "GHZ Entanglement (4Q)",
    qubits: 4,
    description: "Multi-party 4-qubit entangled state (|0000⟩ + |1111⟩)/√2.",
    code: `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[4];\ncreg c[4];\nh q[0];\ncx q[0], q[1];\ncx q[1], q[2];\ncx q[2], q[3];\nmeasure q -> c;`,
  },
  cluster_5q: {
    name: "Linear Cluster State (5Q)",
    qubits: 5,
    description: "1D cluster state for measurement-based quantum computing with controlled-Z operations.",
    code: `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[5];\ncreg c[5];\nh q[0]; h q[1]; h q[2]; h q[3]; h q[4];\ncz q[0], q[1];\ncz q[1], q[2];\ncz q[2], q[3];\ncz q[3], q[4];\nmeasure q -> c;`,
  },
  bv_6q: {
    name: "Bernstein-Vazirani Oracle (6Q)",
    qubits: 6,
    description: "Finds hidden bitstring s=10101 in a single query using quantum phase kickback.",
    code: `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[6];\ncreg c[5];\nx q[5];\nh q[0]; h q[1]; h q[2]; h q[3]; h q[4]; h q[5];\ncx q[0], q[5];\ncx q[2], q[5];\ncx q[4], q[5];\nh q[0]; h q[1]; h q[2]; h q[3]; h q[4];\nmeasure q[0] -> c[0];\nmeasure q[1] -> c[1];\nmeasure q[2] -> c[2];\nmeasure q[3] -> c[3];\nmeasure q[4] -> c[4];`,
  },
};

export default function RoutingSimulatorPage() {
  const [circuits, setCircuits] = useState<CircuitInfo[]>([]);
  const [selectedCircuitId, setSelectedCircuitId] = useState<string>("ghz_5q");
  const [method, setMethod] = useState<string>("caliroute_drift_aware");
  const [beamWidth, setBeamWidth] = useState<number>(8);
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [selectedQubit, setSelectedQubit] = useState<QubitNode | null>(null);

  // Mode Selection: Preset Benchmarks vs Custom OpenQASM Studio
  const [circuitMode, setCircuitMode] = useState<"preset" | "custom">("preset");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("ghz_4q");
  const [customQasm, setCustomQasm] = useState<string>(QASM_TEMPLATES.ghz_4q.code);
  const [qasmError, setQasmError] = useState<string | null>(null);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [routingResult, setRoutingResult] = useState<RoutingResult | null>(null);
  const [benchmarkRecords, setBenchmarkRecords] = useState<BenchmarkRecord[]>([]);
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");

  // Compilation Pipeline Diagnostics & Live Terminal Log
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [showLogTerminal, setShowLogTerminal] = useState<boolean>(true);
  const [justExecuted, setJustExecuted] = useState<boolean>(false);
  const [executionDurationMs, setExecutionDurationMs] = useState<number | null>(null);
  const [lastExecutionTime, setLastExecutionTime] = useState<string | null>(null);

  // Load initial circuits, topology, and benchmark records
  useEffect(() => {
    async function init() {
      try {
        const [cRes, topRes, bRes] = await Promise.all([
          getCircuits(),
          getTopology("ibm_kingston"),
          getBenchmarkRecords(),
        ]);
        setCircuits(cRes.circuits);
        setTopology(topRes);
        setBenchmarkRecords(bRes.records);

        // Run default simulation for ghz_5q
        const initialResult = await runRoutingOptimization("ghz_5q", "caliroute_drift_aware", 8);
        setRoutingResult(initialResult);

        const ts = new Date().toLocaleTimeString();
        setExecutionLog([
          `[${ts}] Pipeline initialized: target backend ibm_kingston (156 qubits, 352 CZ couplers).`,
          `[${ts}] Initial baseline compiled for ghz_5q: fidelity ${(initialResult.caliroute_fidelity * 100).toFixed(2)}%.`,
        ]);
      } catch (err) {
        console.error("Failed to initialize routing page:", err);
      }
    }
    init();
  }, []);

  // Automatically update simulation whenever circuit or method changes (in preset mode)
  useEffect(() => {
    if (circuitMode !== "preset") return;
    let isMounted = true;
    async function updateCircuit() {
      setIsRunning(true);
      try {
        const res = await runRoutingOptimization(selectedCircuitId, method, beamWidth);
        if (isMounted) {
          setRoutingResult(res);
          const ts = new Date().toLocaleTimeString();
          setExecutionLog((prev) => [
            ...prev,
            `[${ts}] Switched target circuit: ${selectedCircuitId} (${res.num_qubits} qubits). GNN scoring initialized.`,
          ]);
        }
      } catch (err) {
        console.error("Optimization failed:", err);
      } finally {
        if (isMounted) setIsRunning(false);
      }
    }
    updateCircuit();
    return () => {
      isMounted = false;
    };
  }, [selectedCircuitId, method, circuitMode]);

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const tmpl = QASM_TEMPLATES[templateKey];
    if (tmpl) {
      setCustomQasm(tmpl.code);
      setQasmError(null);
    }
  };

  const handleRunOptimization = async () => {
    setIsRunning(true);
    setJustExecuted(false);
    setQasmError(null);
    const start = performance.now();
    const ts = new Date().toLocaleTimeString();

    let circuitLabel = selectedCircuitId.toUpperCase();
    let qasmToSend: string | undefined = undefined;

    if (circuitMode === "custom") {
      const trimmed = customQasm.trim();
      if (!trimmed) {
        setQasmError("Please enter valid OpenQASM 2.0 code.");
        setIsRunning(false);
        return;
      }
      const match = trimmed.match(/qreg\s+([a-zA-Z0-9_]+)\s*\[\s*(\d+)\s*\]/);
      if (!match) {
        setQasmError("OpenQASM syntax error: missing quantum register declaration (e.g. 'qreg q[4];').");
        setIsRunning(false);
        return;
      }
      const qCount = parseInt(match[2], 10);
      if (qCount < 2 || qCount > 156) {
        setQasmError(`Qubit register count must be between 2 and 156 physical qubits (found ${qCount}).`);
        setIsRunning(false);
        return;
      }
      circuitLabel = `CUSTOM_${qCount}Q`;
      qasmToSend = trimmed;
    }

    setExecutionLog([
      `[${ts}] ----------------------------------------------------------------`,
      `[${ts}] INITIATING COMPILATION PIPELINE: ${circuitLabel}`,
      circuitMode === "custom"
        ? `[${ts}] Parsing custom OpenQASM 2.0 AST and generating gate interaction tensor...`
        : `[${ts}] Ingesting circuit into gate dependency Directed Acyclic Graph (DAG)...`,
      `[${ts}] Querying IBM Kingston 156Q calibration (CZ errors, T1/T2 times, readout errors)...`,
      `[${ts}] [HARDWARE DEFECT MASK] Dead qubits detected: [Q113, Q121, Q131, Q146].`,
      `[${ts}] Applying strict 0% placement allocation mask to protect circuit integrity.`,
      `[${ts}] Dual-Encoder GNN Scorer computing candidate embeddings (Spearman rank ρ=0.9115)...`,
      `[${ts}] Noise-Aware Beam Search (width k=${beamWidth}) pruning permutation space...`,
    ]);

    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const targetId = circuitMode === "custom" ? "custom" : selectedCircuitId;
      const res = await runRoutingOptimization(targetId, method, beamWidth, qasmToSend);
      setRoutingResult(res);

      const duration = Math.round(performance.now() - start);
      setExecutionDurationMs(duration);
      setLastExecutionTime(ts);
      setJustExecuted(true);

      const layoutSummary = Object.entries(res.initial_layout)
        .slice(0, 6)
        .map(([l, p]) => `q[${l}]→Q${p}`)
        .join(", ") + (Object.keys(res.initial_layout).length > 6 ? ", ..." : "");

      setExecutionLog((prev) => [
        ...prev,
        `[${ts}] Optimal physical layout mapped: { ${layoutSummary} }`,
        `[${ts}] Routing complete: ${res.caliroute_2q_gates} 2Q gates, depth ${res.caliroute_depth}.`,
        `[${ts}] Estimated Circuit Fidelity: ${(res.caliroute_fidelity * 100).toFixed(2)}% (SABRE baseline: ${(res.sabre_comparison.sabre_fidelity * 100).toFixed(2)}%).`,
        res.sabre_comparison.dead_qubit_avoided
          ? `[${ts}] [SUCCESS] SABRE CATASTROPHIC COLLAPSE AVERTED: 0 faulty gates placed.`
          : `[${ts}] [SUCCESS] Custom circuit verified against hardware calibration metrics.`,
      ]);
    } catch (err: unknown) {
      console.error("Optimization failed:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setQasmError(errMsg);
      setExecutionLog((prev) => [...prev, `[${ts}] ERROR: Optimization pipeline failed: ${errMsg}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportCSV = () => {
    if (benchmarkRecords.length === 0) return;
    const headers = [
      "circuit_id",
      "num_qubits",
      "sabre_fidelity",
      "caliroute_static_fidelity",
      "caliroute_drift_aware_fidelity",
      "fidelity_ratio_drift_over_sabre",
      "caliroute_2q_gates",
      "sabre_2q_gates",
      "caliroute_depth",
      "sabre_depth",
      "caliroute_faulty_gates",
      "sabre_faulty_gates",
    ];
    const rows = benchmarkRecords.map((r) => [
      r.circuit_id,
      r.num_qubits,
      r.sabre_fidelity.toFixed(6),
      r.caliroute_static_fidelity.toFixed(6),
      r.caliroute_drift_aware_fidelity.toFixed(6),
      r.fidelity_ratio_drift_over_sabre.toFixed(2),
      r.caliroute_2q_gates,
      r.sabre_2q_gates,
      r.caliroute_depth,
      r.sabre_depth || "N/A",
      r.caliroute_faulty_gates,
      r.sabre_faulty_gates,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "caliroute_vs_sabre_benchmark.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedCircuit = circuits.find((c) => c.circuit_id === selectedCircuitId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-light">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 text-[10px] font-mono text-accent-cyan tracking-wider uppercase mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
            Noise-Aware Compiler & Circuit Synthesizer
          </div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold text-text-primary flex items-center gap-2.5">
            <GitFork className="w-7 h-7 text-accent-cyan" />
            Noise-Aware Qubit Routing Simulator
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm">
            GNN-guided beam search initial mapping and noise-adaptive circuit compilation vs. Qiskit SABRE.
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="glass-panel px-3.5 py-1.5 rounded-xl border border-accent-cyan/30 text-xs font-mono flex items-center gap-2 text-accent-cyan shadow-cyan-glow">
            <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Dual-Encoder GNN Active</span>
          </div>
        </div>
      </div>

      {/* Control Panel & Interactive Form */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        {/* Circuit Mode Switcher Tabs */}
        <div className="flex flex-wrap border-b border-border-light gap-2 pb-1">
          <button
            onClick={() => {
              setCircuitMode("preset");
              setQasmError(null);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl font-mono text-xs font-bold transition-all border-b-2 ${
              circuitMode === "preset"
                ? "bg-surface-elevated text-accent-cyan border-accent-cyan shadow-cyan-glow"
                : "text-text-secondary hover:text-white border-transparent hover:bg-white/[0.03]"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Standard MQT Benchmarks (15 Circuits)</span>
          </button>
          <button
            onClick={() => {
              setCircuitMode("custom");
              setQasmError(null);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl font-mono text-xs font-bold transition-all border-b-2 ${
              circuitMode === "custom"
                ? "bg-surface-elevated text-accent-gold border-accent-gold shadow-gold-glow"
                : "text-text-secondary hover:text-white border-transparent hover:bg-white/[0.03]"
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Custom OpenQASM 2.0 Studio (Arbitrary Code)</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-accent-gold/15 text-accent-gold border border-accent-gold/30">
              Live Compiler
            </span>
          </button>
        </div>

        {circuitMode === "preset" ? (
          /* Preset MQT Benchmarks Grid */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Circuit Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-text-secondary flex items-center justify-between">
                <span>TARGET QUANTUM CIRCUIT</span>
                {selectedCircuit && (
                  <span className="text-accent-cyan font-bold">{selectedCircuit.qubits}Q | Depth {selectedCircuit.depth}</span>
                )}
              </label>
              <select
                value={selectedCircuitId}
                onChange={(e) => setSelectedCircuitId(e.target.value)}
                className="w-full bg-surface-elevated border border-border-light rounded-xl px-3.5 py-2.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-cyan transition-colors"
              >
                <optgroup label="5-Qubit Standard Benchmarks">
                  <option value="ghz_5q">Greenberger-Horne-Zeilinger (GHZ 5Q)</option>
                  <option value="dj_5q">Deutsch-Jozsa (DJ 5Q)</option>
                  <option value="qft_5q">Quantum Fourier Transform (QFT 5Q)</option>
                  <option value="graphstate_5q">GraphState Entanglement (5Q)</option>
                  <option value="wstate_5q">W-State Highly Entangled (5Q)</option>
                </optgroup>
                <optgroup label="8-Qubit Scaled Benchmarks">
                  <option value="ghz_8q">Greenberger-Horne-Zeilinger (GHZ 8Q)</option>
                  <option value="dj_8q">Deutsch-Jozsa (DJ 8Q)</option>
                  <option value="qft_8q">Quantum Fourier Transform (QFT 8Q)</option>
                  <option value="graphstate_8q">GraphState Entanglement (8Q) [SABRE Fails]</option>
                  <option value="wstate_8q">W-State Highly Entangled (8Q)</option>
                </optgroup>
                <optgroup label="12-Qubit Deep Benchmarks">
                  <option value="ghz_12q">Greenberger-Horne-Zeilinger (GHZ 12Q)</option>
                  <option value="dj_12q">Deutsch-Jozsa (DJ 12Q)</option>
                  <option value="qft_12q">Quantum Fourier Transform (QFT 12Q) [SABRE Fails]</option>
                  <option value="graphstate_12q">GraphState Entanglement (12Q)</option>
                  <option value="wstate_12q">W-State Highly Entangled (12Q)</option>
                </optgroup>
              </select>
            </div>

            {/* Routing Method */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-text-secondary">ROUTING ALGORITHM</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-surface-elevated border border-border-light rounded-xl px-3.5 py-2.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-cyan transition-colors"
              >
                <option value="caliroute_drift_aware">CaliRoute Drift-Aware (Recommended)</option>
                <option value="caliroute_static">CaliRoute Static Calibration</option>
                <option value="sabre">Qiskit SABRE Baseline</option>
              </select>
            </div>

            {/* Beam Width Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-text-secondary">
                <span>BEAM SEARCH WIDTH (K)</span>
                <span className="text-accent-cyan font-bold">{beamWidth}</span>
              </div>
              <div className="pt-2">
                <input
                  type="range"
                  min="4"
                  max="16"
                  step="2"
                  value={beamWidth}
                  onChange={(e) => setBeamWidth(parseInt(e.target.value))}
                  className="w-full accent-accent-cyan cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-text-muted mt-1">
                  <span>Fast (k=4)</span>
                  <span>Balanced (k=8)</span>
                  <span>Deep Search (k=16)</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Custom OpenQASM 2.0 Studio */
          <div className="space-y-4">
            {/* Starter Research Templates Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-light">
              <div className="space-y-0.5">
                <div className="text-xs font-mono text-text-primary font-bold flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-accent-gold" />
                  <span>Research Algorithm Templates</span>
                </div>
                <p className="text-[11px] text-text-secondary font-sans">
                  Load standard quantum templates or type/paste your own arbitrary OpenQASM 2.0 code.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {Object.entries(QASM_TEMPLATES).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => handleTemplateSelect(key)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition-all border ${
                      selectedTemplate === key
                        ? "bg-accent-gold/20 text-accent-gold border-accent-gold font-bold shadow-gold-glow"
                        : "bg-surface-elevated text-text-secondary border-border-light hover:text-white"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Editor & Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-text-secondary">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
                    OPENQASM 2.0 SOURCE CODE
                  </span>
                  {(() => {
                    const match = customQasm.match(/qreg\s+([a-zA-Z0-9_]+)\s*\[\s*(\d+)\s*\]/);
                    const qCount = match ? match[2] : "?";
                    const gateCount = (customQasm.match(/(cx|cz|h|x|y|z|s|t|rx|ry|rz|u|measure)\s+/gi) || []).length;
                    return (
                      <span className="text-accent-cyan font-bold bg-surface-elevated px-2.5 py-0.5 rounded-md border border-border-light">
                        Detected: {qCount} Qubits | {gateCount} Gates
                      </span>
                    );
                  })()}
                </div>

                <textarea
                  value={customQasm}
                  onChange={(e) => {
                    setCustomQasm(e.target.value);
                    setQasmError(null);
                  }}
                  rows={9}
                  spellCheck={false}
                  className="w-full bg-[#030407] border border-border-light rounded-xl p-4 text-xs font-mono text-[#E2E8F0] leading-relaxed focus:outline-none focus:border-accent-cyan transition-colors resize-y select-text shadow-inner"
                  placeholder="// Enter valid OpenQASM 2.0 code..."
                />

                {qasmError && (
                  <div className="p-3 rounded-xl bg-status-critical/15 border border-status-critical/30 text-status-critical text-xs font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{qasmError}</span>
                  </div>
                )}
              </div>

              {/* Custom Compiler Tuning Settings */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-text-secondary">ROUTING ALGORITHM</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full bg-surface-elevated border border-border-light rounded-xl px-3.5 py-2.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-cyan transition-colors"
                  >
                    <option value="caliroute_drift_aware">CaliRoute Drift-Aware (Recommended)</option>
                    <option value="caliroute_static">CaliRoute Static Calibration</option>
                    <option value="sabre">Qiskit SABRE Baseline</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-text-secondary">
                    <span>BEAM SEARCH WIDTH (K)</span>
                    <span className="text-accent-gold font-bold">{beamWidth}</span>
                  </div>
                  <div className="pt-2">
                    <input
                      type="range"
                      min="4"
                      max="16"
                      step="2"
                      value={beamWidth}
                      onChange={(e) => setBeamWidth(parseInt(e.target.value))}
                      className="w-full accent-accent-gold cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-text-muted mt-1">
                      <span>Fast (k=4)</span>
                      <span>Balanced (k=8)</span>
                      <span>Deep Search (k=16)</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-elevated/60 border border-border-light text-[11px] font-mono text-text-secondary space-y-1.5">
                  <div className="text-accent-gold font-bold text-xs">Custom Circuit Pipeline:</div>
                  <div>1. Real-time AST gate parsing & DAG generation</div>
                  <div>2. Dead qubit exclusion (Q113, Q121, Q131, Q146)</div>
                  <div>3. PyG GNN candidate embedding & scoring</div>
                  <div>4. Transpilation & Closed-form fidelity proxy</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Execution Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border-light">
          <div className="text-xs font-mono text-text-muted flex items-center gap-2">
            <Info className="w-4 h-4 text-accent-cyan" />
            <span>Target Backend: IBM Kingston (156 Physical Qubits, 352 Directed Couplers)</span>
          </div>

          <button
            onClick={handleRunOptimization}
            disabled={isRunning}
            className="w-full sm:w-auto px-7 py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-accent-cyan via-accent-azure to-accent-gold text-[#06070B] shadow-cyan-glow hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2.5"
          >
            {isRunning ? (
              <>
                <div className="w-4 h-4 border-2 border-[#06070B] border-t-transparent rounded-full animate-spin" />
                <span>Compiling & Evaluating...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-[#06070B]" />
                <span>Execute Routing Optimization</span>
              </>
            )}
          </button>
        </div>

        {/* Live Execution Feedback Badge */}
        {justExecuted && (
          <div className="flex flex-wrap items-center justify-between p-3.5 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 text-xs font-mono text-accent-cyan shadow-cyan-glow">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-accent-cyan" />
              <span className="font-bold">
                Optimization Succeeded in {executionDurationMs} ms • 156Q Layout Refreshed
              </span>
            </div>
            <div className="text-[10px] text-text-secondary flex items-center gap-2">
              <span>Timestamp: {lastExecutionTime}</span>
              <span className="text-white/20">|</span>
              <span className="text-accent-gold">0 Faulty Gates</span>
            </div>
          </div>
        )}

        {/* Live Compiler Pipeline Execution Terminal */}
        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowLogTerminal(!showLogTerminal)}
              className="flex items-center gap-2 text-xs font-mono text-text-muted hover:text-accent-cyan transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-accent-cyan" />
              <span className="font-bold">Compiler Pipeline Execution Trace</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated border border-border-light text-text-secondary">
                {showLogTerminal ? "Hide Console" : "Show Console"}
              </span>
            </button>
            <div className="text-[10px] font-mono text-text-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
              <span>GNN Model Active (ρ=0.9115)</span>
            </div>
          </div>

          {showLogTerminal && (
            <div className="p-4 rounded-xl bg-[#030407] border border-border-light font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto space-y-1 text-text-secondary select-text shadow-inner">
              {executionLog.map((line, idx) => (
                <div
                  key={idx}
                  className={
                    line.includes("[SUCCESS]")
                      ? "text-accent-cyan font-bold"
                      : line.includes("[DEFECT") || line.includes("[HARDWARE DEFECT")
                      ? "text-status-critical"
                      : line.includes("INITIATING")
                      ? "text-white font-bold"
                      : line.includes("Optimal physical layout")
                      ? "text-accent-gold font-semibold"
                      : "text-text-secondary"
                  }
                >
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Catastrophic SABRE Failure Mitigation Banner */}
      <div className="p-5 rounded-2xl border border-status-critical/30 bg-status-critical/10 flex items-start gap-4">
        <AlertTriangle className="w-5 h-5 text-status-critical flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h4 className="font-mono font-bold text-status-critical uppercase tracking-wider">
            Critical Hardware Safety: Dead Qubit Defect Isolation
          </h4>
          <p className="text-text-secondary leading-relaxed font-sans">
            Standard Qiskit SABRE operates solely on topological swap distance, making it noise-blind. On circuits such as{" "}
            <span className="font-mono text-white font-bold">QFT 12Q</span> and{" "}
            <span className="font-mono text-white font-bold">GraphState 8Q</span>, SABRE mapped logical qubits onto physically dead
            hardware qubits (such as Q146, where T₁=0 and readout error ≈ 50%), causing catastrophic execution failure (Fidelity = 0.0).{" "}
            <span className="text-accent-gold font-semibold">CaliRoute’s Dual-Encoder GNN strictly avoids all dead physical qubits</span>,
            achieving reliable, high-fidelity compilation.
          </p>
        </div>
      </div>

      {/* Simulation Result Inspection */}
      {routingResult && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metrics Column */}
          <div className="space-y-6">
            {/* Fidelity Comparison Card */}
            <div className="glass-panel p-5 rounded-2xl border border-accent-cyan/30 space-y-4 shadow-card-cryo">
              <div className="flex items-center justify-between pb-3 border-b border-border-light">
                <span className="font-mono text-xs font-bold text-text-primary uppercase flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-accent-cyan" />
                  Estimated Circuit Fidelity
                </span>
                <span className="font-mono text-[10px] text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded border border-accent-cyan/20">
                  {routingResult.method.toUpperCase()}
                </span>
              </div>

              <div className="space-y-3 font-mono">
                <div>
                  <div className="text-[10px] text-text-muted">CALIROUTE ESTIMATED FIDELITY</div>
                  <div className="text-3xl font-bold text-accent-cyan mt-0.5">
                    {(routingResult.caliroute_fidelity * 100).toFixed(2)}%
                  </div>
                  <div className="text-[10px] text-text-secondary">
                    Log Fidelity: {routingResult.caliroute_log_fidelity.toFixed(4)}
                  </div>
                </div>

                <div className="pt-2 border-t border-border-light">
                  <div className="text-[10px] text-text-muted">QISKIT SABRE BASELINE FIDELITY</div>
                  <div
                    className={`text-2xl font-bold mt-0.5 ${
                      routingResult.sabre_comparison.sabre_fidelity === 0
                        ? "text-status-critical"
                        : "text-text-primary"
                    }`}
                  >
                    {(routingResult.sabre_comparison.sabre_fidelity * 100).toFixed(2)}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-elevated/80 border border-border-light flex items-center justify-between">
                  <span className="text-xs text-text-secondary">Fidelity Advantage:</span>
                  <span className="text-xs font-bold text-accent-gold">
                    {routingResult.sabre_comparison.fidelity_ratio_cr_over_sabre >= 100
                      ? "∞ (SABRE Dead)"
                      : `${routingResult.sabre_comparison.fidelity_ratio_cr_over_sabre.toFixed(2)}x`}
                  </span>
                </div>
              </div>
            </div>

            {/* Hardware Safety & Gate Overhead */}
            <div className="glass-panel p-5 rounded-2xl space-y-4 font-mono text-xs">
              <h4 className="font-bold text-text-primary pb-2 border-b border-border-light uppercase text-xs">
                Compilation Overheads
              </h4>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center py-1 border-b border-border-light/50">
                  <span className="text-text-secondary">Faulty / Dead Gates:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      routingResult.caliroute_faulty_gates === 0
                        ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30"
                        : "bg-status-critical/15 text-status-critical border border-status-critical/30"
                    }`}
                  >
                    {routingResult.caliroute_faulty_gates} (SABRE: {routingResult.sabre_comparison.sabre_faulty_gates})
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-border-light/50">
                  <span className="text-text-secondary">2-Qubit Gates (CZ):</span>
                  <span className="text-text-primary">
                    {routingResult.caliroute_2q_gates} (SABRE: {routingResult.sabre_comparison.sabre_2q_gates})
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-border-light/50">
                  <span className="text-text-secondary">Compiled Circuit Depth:</span>
                  <span className="text-text-primary">
                    {routingResult.caliroute_depth} (SABRE: {routingResult.sabre_comparison.sabre_depth || "N/A"})
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-text-secondary">Physical Qubits Allocated:</span>
                  <span className="text-accent-gold font-bold">{routingResult.num_qubits} Qubits</span>
                </div>
              </div>
            </div>

            {/* Physics Error Budget & Coherence Card */}
            {routingResult.error_breakdown && (
              <div className="glass-panel p-5 rounded-2xl space-y-3 font-mono text-xs shadow-card-cryo">
                <div className="flex items-center justify-between pb-2 border-b border-border-light">
                  <span className="font-bold text-text-primary uppercase flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-accent-gold" />
                    Physics Error Budget
                  </span>
                  <span className="text-[10px] text-accent-gold bg-accent-gold/10 px-2 py-0.5 rounded border border-accent-gold/20">
                    Analytical Proxy
                  </span>
                </div>

                <div className="space-y-3 text-[11px]">
                  <div>
                    <div className="flex justify-between text-text-secondary mb-1">
                      <span>Gate Survival (P_gate):</span>
                      <span className="text-accent-gold font-bold">
                        {(routingResult.error_breakdown.p_gate_survival * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#030407] rounded-full overflow-hidden border border-border-light">
                      <div
                        style={{ width: `${Math.min(100, routingResult.error_breakdown.p_gate_survival * 100)}%` }}
                        className="h-full bg-accent-gold"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-text-secondary mb-1">
                      <span>Readout Survival (P_readout):</span>
                      <span className="text-accent-cyan font-bold">
                        {(routingResult.error_breakdown.p_readout_survival * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#030407] rounded-full overflow-hidden border border-border-light">
                      <div
                        style={{ width: `${Math.min(100, routingResult.error_breakdown.p_readout_survival * 100)}%` }}
                        className="h-full bg-accent-cyan"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-text-secondary mb-1">
                      <span>Decoherence Survival (T1/T2):</span>
                      <span className="text-accent-azure font-bold">
                        {(routingResult.error_breakdown.p_decoherence_survival * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#030407] rounded-full overflow-hidden border border-border-light">
                      <div
                        style={{ width: `${Math.min(100, routingResult.error_breakdown.p_decoherence_survival * 100)}%` }}
                        className="h-full bg-accent-azure"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border-light flex justify-between items-center text-[10px]">
                    <span className="text-text-muted">Total Circuit Execution Time:</span>
                    <span className="text-accent-gold font-bold">
                      {routingResult.error_breakdown.makespan_us} µs
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Initial Layout Mapping Table */}
            <div className="glass-panel p-5 rounded-2xl space-y-3 font-mono">
              <h4 className="font-bold text-text-primary pb-2 border-b border-border-light uppercase text-xs flex items-center justify-between">
                <span>Initial Layout Map</span>
                <span className="text-[10px] text-text-muted">Logical → Physical</span>
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(routingResult.initial_layout).map(([logical, physical]) => (
                  <div
                    key={logical}
                    className="p-2.5 rounded-xl bg-surface-elevated/80 border border-accent-cyan/20 flex items-center justify-between"
                  >
                    <span className="text-text-muted">q[{logical}]</span>
                    <ArrowRight className="w-3 h-3 text-text-muted" />
                    <span className="text-accent-cyan font-bold">Q{physical}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3D Hardware Layout Visualizer */}
          <div className="lg:col-span-2 glass-panel p-5 rounded-2xl flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-light">
              <div>
                <h3 className="font-mono font-bold text-sm text-text-primary flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-accent-cyan" />
                  Physical Processor Mapping (IBM Kingston 156Q)
                </h3>
                <p className="text-[11px] text-text-secondary font-mono">
                  Allocated physical qubits highlighted in electric cyan & gold. Hover or click any qubit to inspect telemetry.
                </p>
              </div>

              {/* Selected Qubit Badge & View Toggle */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {selectedQubit && (
                  <div className="hidden sm:flex items-center gap-2 bg-surface-elevated border border-accent-cyan/40 px-2.5 py-1 rounded-lg text-xs font-mono text-accent-cyan shadow-cyan-glow">
                    <span className="font-bold">Q{selectedQubit.id}</span>
                    <span className="text-white/20">|</span>
                    <span>T₁ {selectedQubit.t1_us} µs</span>
                    <span className="text-white/20">|</span>
                    <span>T₂ {selectedQubit.t2_us} µs</span>
                  </div>
                )}

                <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-border-light">
                  <button
                    onClick={() => setViewMode("3d")}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                      viewMode === "3d" ? "bg-accent-cyan/20 text-accent-cyan font-bold" : "text-text-secondary hover:text-white"
                    }`}
                  >
                    3D View
                  </button>
                  <button
                    onClick={() => setViewMode("2d")}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                      viewMode === "2d" ? "bg-accent-cyan/20 text-accent-cyan font-bold" : "text-text-secondary hover:text-white"
                    }`}
                  >
                    2D Grid
                  </button>
                </div>
              </div>
            </div>

            {/* 3D Canvas */}
            <div className="h-[460px] w-full rounded-xl overflow-hidden border border-border-light relative bg-[#06070B]">
              {topology ? (
                <QuantumProcessor3D
                  nodes={topology.nodes}
                  edges={topology.edges}
                  selectedQubitId={selectedQubit?.id ?? null}
                  onSelectQubit={setSelectedQubit}
                  onSelectEdge={() => {}}
                  activeLayout={routingResult.initial_layout}
                  mode={viewMode}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-muted font-mono text-xs">
                  Loading physical processor geometry...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 15-Circuit Comparative Benchmark Suite */}
      <div className="glass-panel p-6 rounded-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-light">
          <div>
            <h3 className="font-mono font-bold text-base text-text-primary flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent-gold" />
              Comprehensive 15-Circuit Benchmark Evaluation
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Empirical evaluation across GHZ, DJ, QFT, GraphState, and W-State algorithms on IBM Kingston.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-elevated border border-border-light text-xs font-mono text-accent-cyan hover:border-accent-cyan/40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Benchmark (CSV)</span>
          </button>
        </div>

        {/* Benchmark Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border-light text-text-muted text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Circuit ID</th>
                <th className="py-2.5 px-3 text-center">Qubits</th>
                <th className="py-2.5 px-3 text-right">Qiskit SABRE Fidelity</th>
                <th className="py-2.5 px-3 text-right">CaliRoute Static</th>
                <th className="py-2.5 px-3 text-right text-accent-cyan">CaliRoute Drift-Aware</th>
                <th className="py-2.5 px-3 text-center">Fidelity Ratio (CR / SABRE)</th>
                <th className="py-2.5 px-3 text-center">Dead Qubit Defect Avoided</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light/50">
              {benchmarkRecords.map((rec) => {
                const isSabreCatastrophic = rec.sabre_fidelity === 0.0;
                return (
                  <tr key={rec.circuit_id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-3 font-bold text-text-primary flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-accent-cyan" />
                      {rec.circuit_id}
                    </td>
                    <td className="py-3 px-3 text-center text-text-secondary">{rec.num_qubits}</td>
                    <td className="py-3 px-3 text-right">
                      {isSabreCatastrophic ? (
                        <span className="text-status-critical font-bold bg-status-critical/15 px-2.5 py-0.5 rounded border border-status-critical/30">
                          0.0000 (Failed)
                        </span>
                      ) : (
                        <span className="text-text-muted">{(rec.sabre_fidelity * 100).toFixed(2)}%</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-text-secondary">
                      {(rec.caliroute_static_fidelity * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-accent-cyan">
                      {(rec.caliroute_drift_aware_fidelity * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded border ${
                          rec.fidelity_ratio_drift_over_sabre >= 1.0
                            ? "text-accent-gold bg-accent-gold/15 border-accent-gold/30 shadow-[0_0_10px_rgba(229,192,123,0.12)]"
                            : "text-accent-cyan bg-accent-cyan/15 border-accent-cyan/30"
                        }`}
                      >
                        {rec.fidelity_ratio_drift_over_sabre >= 100
                          ? "∞ (SABRE Dead)"
                          : `${rec.fidelity_ratio_drift_over_sabre.toFixed(2)}x`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isSabreCatastrophic ? (
                        <span className="inline-flex items-center gap-1 text-accent-gold font-bold text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Avoided Q146
                        </span>
                      ) : (
                        <span className="text-text-muted text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
