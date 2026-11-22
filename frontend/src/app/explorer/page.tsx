"use client";

import React, { useState, useEffect } from "react";
import { Cpu, Search, Filter, ShieldAlert, Info, Layers } from "lucide-react";
import QuantumProcessor3D from "@/components/3d/QuantumProcessor3D";
import { getBackends, getTopology } from "@/lib/api";
import { BackendMetadata, TopologyData, QubitNode } from "@/types/quantum";

export default function HardwareExplorerPage() {
  const [backends, setBackends] = useState<BackendMetadata[]>([]);
  const [selectedBackendId, setSelectedBackendId] = useState<string>("ibm_kingston");
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [selectedQubit, setSelectedQubit] = useState<QubitNode | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");

  const selectedBackend = backends.find((b) => b.id === selectedBackendId) || {
    id: selectedBackendId,
    name: selectedBackendId === "ibm_sherbrooke" ? "IBM Sherbrooke" : selectedBackendId === "ibm_brisbane" ? "IBM Brisbane" : "IBM Kingston",
    family: selectedBackendId === "ibm_kingston" ? "Heron r1" : "Eagle r3",
    qubits: selectedBackendId === "ibm_kingston" ? 156 : 127,
    couplers: selectedBackendId === "ibm_kingston" ? 352 : 288,
    native_2q_gate: selectedBackendId === "ibm_kingston" ? "cz" : "ecr",
  };

  useEffect(() => {
    async function loadData() {
      try {
        const bRes = await getBackends();
        if (bRes.backends && bRes.backends.length > 0) {
          setBackends(bRes.backends);
        }
        const topRes = await getTopology(selectedBackendId);
        setTopology(topRes);
        // Default select an optimal qubit for this backend
        if (topRes.nodes && topRes.nodes.length > 0) {
          const optimalNode = topRes.nodes.find((n) => n.status === "operational" && n.error_tier === "optimal") || topRes.nodes[0];
          setSelectedQubit(optimalNode);
        }
      } catch (err) {
        console.error("Failed to load topology:", err);
      }
    }
    loadData();
  }, [selectedBackendId]);

  // Highlight search target if user types a qubit number
  useEffect(() => {
    if (!topology) return;
    const queryNum = parseInt(searchQuery);
    if (!isNaN(queryNum) && queryNum >= 0 && queryNum < topology.nodes.length) {
      setSelectedQubit(topology.nodes[queryNum]);
    }
  }, [searchQuery, topology]);

  const deadQubits = React.useMemo(() => {
    if (!topology) return [];
    return topology.nodes.filter((n) => n.status === "dead" || n.error_tier === "critical").map((n) => n.id);
  }, [topology]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header & Backend Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold text-text-primary flex items-center gap-2.5">
            <Cpu className="w-7 h-7 text-accent-gold" />
            Quantum Hardware Explorer
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            Real physical topology and calibration metrics of superconducting quantum processors.
          </p>
        </div>

        {/* Backend Selector Tabs */}
        <div className="flex items-center gap-2">
          {backends.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBackendId(b.id)}
              className={`px-3.5 py-1.5 rounded-lg font-mono text-xs transition-all ${selectedBackendId === b.id
                ? "bg-accent-gold/15 text-accent-gold border border-accent-gold/40 shadow-gold-glow font-bold"
                : "glass-panel text-text-secondary hover:text-white border-white/10"
                }`}
            >
              {b.name} ({b.qubits}Q)
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: 3D Visualization + Right Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: 3D Canvas (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="h-[580px] rounded-xl glass-panel relative overflow-hidden border border-white/10">
            {/* View Mode Toggle Controls */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <div className="flex bg-[#141110]/90 rounded border border-white/10 p-0.5 text-xs font-mono">
                <button
                  onClick={() => setViewMode("3d")}
                  className={`px-3 py-1 rounded transition-colors ${viewMode === "3d" ? "bg-accent-gold/20 text-accent-gold font-bold" : "text-text-secondary hover:text-white"
                    }`}
                >
                  3D Orbit
                </button>
                <button
                  onClick={() => setViewMode("2d")}
                  className={`px-3 py-1 rounded transition-colors ${viewMode === "2d" ? "bg-accent-gold/20 text-accent-gold font-bold" : "text-text-secondary hover:text-white"
                    }`}
                >
                  2D Lattice
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 bg-[#141110]/90 rounded border border-white/10 px-3 py-1 text-xs font-mono text-text-muted">
                <span className="text-accent-gold font-medium">{selectedBackend.family} Heavy-Hex</span>
                <span>•</span>
                <span>{topology?.edges.length ?? selectedBackend.couplers} Directed Couplers</span>
                <span>•</span>
                <span>{topology?.nodes.length ?? selectedBackend.qubits} Qubits</span>
              </div>
            </div>

            {topology ? (
              <QuantumProcessor3D
                nodes={topology.nodes}
                edges={topology.edges}
                selectedQubitId={selectedQubit ? selectedQubit.id : null}
                onSelectQubit={setSelectedQubit}
                onSelectEdge={() => { }}
                mode={viewMode}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-mono text-xs text-text-secondary">
                Loading Hardware Topology...
              </div>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-3.5 rounded-xl border border-white/10 text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-xs bg-[#141110]/80 border border-white/10 rounded-lg px-3 py-1.5 font-mono">
              <Search className="w-3.5 h-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Search Qubit ID (e.g. 67, 146)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-text-primary text-xs outline-none w-full placeholder:text-text-muted"
              />
            </div>

            <div className="flex items-center gap-2 font-mono text-xs text-text-secondary">
              <Filter className="w-3.5 h-3.5 text-accent-gold" />
              <span>Filter Quality:</span>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="bg-[#141110] border border-white/10 rounded px-2.5 py-1 text-xs text-text-primary outline-none focus:border-accent-gold"
              >
                <option value="all">All Qubits ({topology?.nodes.length ?? selectedBackend.qubits})</option>
                <option value="optimal">Optimal (Champagne Gold)</option>
                <option value="warning">Degraded (Warm Amber)</option>
                <option value="dead">Dead / Defective (Wine Burgundy)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Qubit & Coupler Inspector (1 col) */}
        <div className="space-y-4">
          {/* Qubit Inspector */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="font-mono font-bold text-sm text-text-primary flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-accent-gold"></span>
                Qubit Telemetry Inspector
              </div>
              {selectedQubit && (
                <span className="font-mono text-xs text-accent-gold font-bold bg-accent-gold/10 px-2 py-0.5 rounded border border-accent-gold/20">
                  Q{selectedQubit.id}
                </span>
              )}
            </div>

            {selectedQubit ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded bg-[#141110]/70 border border-white/5">
                  <span className="text-text-secondary">Physical Status:</span>
                  <span className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] ${selectedQubit.status === "dead" ? "bg-status-dead/30 text-[#D98282]" :
                    selectedQubit.error_tier === "warning" ? "bg-status-warning/20 text-status-warning" : "bg-status-optimal/20 text-status-optimal"
                    }`}>
                    {selectedQubit.status}
                  </span>
                </div>

                <div className="space-y-2 text-text-secondary">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span>T₁ Relaxation Time:</span>
                    <span className="text-text-primary font-bold">{selectedQubit.t1_us} µs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span>T₂ Dephasing Time:</span>
                    <span className="text-text-primary font-bold">{selectedQubit.t2_us} µs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span>Readout Error:</span>
                    <span className="text-text-primary font-bold">{selectedQubit.readout_error_pct}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span>Readout Duration:</span>
                    <span className="text-text-primary font-bold">{selectedQubit.readout_length_ns} ns</span>
                  </div>
                </div>

                {selectedQubit.status === "dead" && (
                  <div className="p-3 rounded bg-status-dead/20 border border-status-dead/40 text-[11px] text-[#D98282] space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#D98282]" />
                      Hardware Defect Identified
                    </div>
                    <p className="leading-tight text-text-secondary">
                      Dead qubit line (T₁ = 0 µs). CaliRoute automatically isolates this node during candidate layout generation.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-text-muted text-xs font-mono py-8 text-center">
                Click any sphere in the 3D lattice to inspect its telemetry.
              </div>
            )}
          </div>

          {/* Processor Architecture Specs */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-3 font-mono text-xs">
            <div className="font-bold text-text-primary pb-2 border-b border-white/10 uppercase text-xs flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-accent-gold" />
              {selectedBackend.family} Architecture Specs
            </div>
            <div className="space-y-2 text-text-secondary">
              <div className="flex justify-between">
                <span>Processor:</span>
                <span className="text-text-primary font-bold">{selectedBackend.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Lattice Type:</span>
                <span className="text-text-primary">Heavy-Hexagonal</span>
              </div>
              <div className="flex justify-between">
                <span>Total Nodes:</span>
                <span className="text-text-primary">{topology?.nodes.length ?? selectedBackend.qubits} Physical Qubits</span>
              </div>
              <div className="flex justify-between">
                <span>Coupling Map:</span>
                <span className="text-text-primary">{topology?.edges.length ?? selectedBackend.couplers} Directed Edges</span>
              </div>
              <div className="flex justify-between">
                <span>Native 2Q Gate:</span>
                <span className="text-accent-gold font-bold">
                  {selectedBackend.native_2q_gate?.toUpperCase() === "CZ" ? "CZ (Control-Z)" : "ECR (Echoed Cross-Resonance)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Dead Physical Qubits:</span>
                <span className={deadQubits.length > 0 ? "text-[#D98282] font-bold" : "text-status-optimal font-bold"}>
                  {deadQubits.length > 0 ? deadQubits.join(", ") : "0 (None Detected)"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
