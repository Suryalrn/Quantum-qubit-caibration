"use client";

import React, { useState, useEffect } from "react";
import { Cpu, Search, Filter, ShieldAlert, Info, Layers, Network, Activity } from "lucide-react";
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold text-text-primary flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan shadow-cyan-glow/40">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="quantum-gradient-text">Quantum Hardware Explorer</span>
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1 font-mono">
            Physical topology, resonance couplers, and real-time calibration diagnostics of superconducting QPUs.
          </p>
        </div>

        {/* Backend Selector Tabs */}
        <div className="flex items-center gap-2 bg-[#0B0F19]/80 p-1 rounded-xl border border-white/[0.06] shadow-card-cryo">
          {backends.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBackendId(b.id)}
              className={`px-3.5 py-1.5 rounded-lg font-mono text-xs transition-all ${
                selectedBackendId === b.id
                  ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/40 shadow-cyan-glow font-bold"
                  : "text-text-secondary hover:text-white hover:bg-white/[0.04]"
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
          <div className="h-[580px] rounded-xl glass-panel relative overflow-hidden border border-white/[0.08] shadow-card-cryo">
            {/* View Mode Toggle Controls */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <div className="flex bg-[#080D18]/90 rounded-lg border border-white/[0.08] p-0.5 text-xs font-mono shadow-card-cryo backdrop-blur-md">
                <button
                  onClick={() => setViewMode("3d")}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    viewMode === "3d" ? "bg-accent-cyan/20 text-accent-cyan font-bold shadow-cyan-glow/30" : "text-text-secondary hover:text-white"
                  }`}
                >
                  3D Orbit
                </button>
                <button
                  onClick={() => setViewMode("2d")}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    viewMode === "2d" ? "bg-accent-cyan/20 text-accent-cyan font-bold shadow-cyan-glow/30" : "text-text-secondary hover:text-white"
                  }`}
                >
                  2D Lattice
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-2 bg-[#080D18]/90 rounded-lg border border-white/[0.08] px-3 py-1 text-xs font-mono text-text-secondary backdrop-blur-md shadow-card-cryo">
                <span className="text-accent-gold font-medium">{selectedBackend.family} Heavy-Hex</span>
                <span className="text-white/20">•</span>
                <span>{topology?.edges.length ?? selectedBackend.couplers} Directed Couplers</span>
                <span className="text-white/20">•</span>
                <span className="text-accent-cyan font-medium">{topology?.nodes.length ?? selectedBackend.qubits} Qubits</span>
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
          <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-3.5 rounded-xl border border-white/[0.08] text-xs shadow-card-cryo">
            <div className="flex items-center gap-2 flex-1 max-w-xs bg-[#080D18]/80 border border-white/[0.08] rounded-lg px-3 py-1.5 font-mono focus-within:border-accent-cyan/40 transition-colors">
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
              <Filter className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Filter Quality:</span>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="bg-[#080D18] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-text-primary outline-none focus:border-accent-cyan transition-colors"
              >
                <option value="all">All Qubits ({topology?.nodes.length ?? selectedBackend.qubits})</option>
                <option value="optimal">Optimal (Cryogenic Gold)</option>
                <option value="warning">Degraded (Drift Amber)</option>
                <option value="dead">Dead / Defective (Laser Red)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Qubit & Coupler Inspector (1 col) */}
        <div className="space-y-4">
          {/* Qubit Inspector */}
          <div className="glass-panel p-5 rounded-xl border border-white/[0.08] space-y-4 shadow-card-cryo">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="font-mono font-bold text-sm text-text-primary flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan shadow-[0_0_8px_#00F0FF]"></span>
                Qubit Telemetry Inspector
              </div>
              {selectedQubit && (
                <span className="font-mono text-xs text-accent-cyan font-bold bg-accent-cyan/10 px-2 py-0.5 rounded border border-accent-cyan/30 shadow-cyan-glow/20">
                  Q{selectedQubit.id}
                </span>
              )}
            </div>

            {selectedQubit ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#080D18]/80 border border-white/[0.04]">
                  <span className="text-text-secondary">Physical Status:</span>
                  <span className={`px-2.5 py-0.5 rounded uppercase font-bold text-[10px] ${
                    selectedQubit.status === "dead" ? "bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]" :
                    selectedQubit.error_tier === "warning" ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" : "bg-cyan-500/15 text-accent-cyan border border-cyan-500/30"
                  }`}>
                    {selectedQubit.status}
                  </span>
                </div>

                <div className="space-y-2 text-text-secondary">
                  <div className="flex justify-between py-1 border-b border-white/[0.04]">
                    <span>T₁ Relaxation Time:</span>
                    <span className="text-text-primary font-bold">{selectedQubit.t1_us} µs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.04]">
                    <span>T₂ Dephasing Time:</span>
                    <span className="text-text-primary font-bold">{selectedQubit.t2_us} µs</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.04]">
                    <span>Readout Error:</span>
                    <span className="text-text-primary font-bold">{selectedQubit.readout_error_pct}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.04]">
                    <span>Readout Duration:</span>
                    <span className="text-text-primary font-bold">{selectedQubit.readout_length_ns} ns</span>
                  </div>
                </div>

                {selectedQubit.status === "dead" && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 space-y-1 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      Hardware Defect Identified
                    </div>
                    <p className="leading-tight text-text-secondary">
                      Dead transmon line (T₁ = 0 µs). CaliRoute automatically isolates this node during candidate layout generation.
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
          <div className="glass-panel p-5 rounded-xl border border-white/[0.08] space-y-3 font-mono text-xs shadow-card-cryo">
            <div className="font-bold text-text-primary pb-2 border-b border-white/[0.08] uppercase text-xs flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-accent-cyan" />
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
                <span className="text-text-primary font-bold">{topology?.nodes.length ?? selectedBackend.qubits} Physical Qubits</span>
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
                <span className={deadQubits.length > 0 ? "text-red-400 font-bold" : "text-accent-cyan font-bold"}>
                  {deadQubits.length > 0 ? deadQubits.join(", ") : "0 (None Detected)"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Physical Hardware Architecture Guide */}
      <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-white/10 gap-2">
          <div className="font-mono font-bold text-xs sm:text-sm text-text-primary flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-gold" />
            <span>Physical QPU Architecture — Reading the Hardware Chip</span>
          </div>
          <span className="font-mono text-[11px] text-text-muted">
            High-Resistivity Silicon • Dilution Cryostat 15 mK
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          {/* Card 1: Spheres / Transmons */}
          <div className="p-3.5 rounded-lg bg-[#141110]/70 border border-white/5 space-y-1.5 hover:border-accent-gold/30 transition-colors">
            <div className="flex items-center gap-2 text-accent-gold font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-gold shadow-gold-glow"></span>
              <span>Spheres = Transmon Qubits</span>
            </div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Superconducting niobium capacitor pads coupled to a sub-micron Al/AlOₓ Josephson junction operating at 15 mK near absolute zero.
            </p>
          </div>

          {/* Card 2: Edges / Couplers */}
          <div className="p-3.5 rounded-lg bg-[#141110]/70 border border-white/5 space-y-1.5 hover:border-accent-gold/30 transition-colors">
            <div className="flex items-center gap-2 text-[#E0B87A] font-bold">
              <Network className="w-3.5 h-3.5 text-accent-gold" />
              <span>Lines = Microwave Couplers</span>
            </div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Coplanar waveguide (CPW) microwave resonators enabling native 2-qubit entangling gates ({selectedBackend.native_2q_gate?.toUpperCase() || "CZ"}) between physically adjacent qubits.
            </p>
          </div>

          {/* Card 3: Heavy-Hex */}
          <div className="p-3.5 rounded-lg bg-[#141110]/70 border border-white/5 space-y-1.5 hover:border-accent-gold/30 transition-colors">
            <div className="flex items-center gap-2 text-text-primary font-bold">
              <Layers className="w-3.5 h-3.5 text-accent-gold" />
              <span>Heavy-Hexagonal Layout</span>
            </div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Sparse honeycomb connectivity (degree 2–3) suppresses microwave frequency collisions and crosstalk while maintaining surface-code error correction.
            </p>
          </div>

          {/* Card 4: Colors & Defects */}
          <div className="p-3.5 rounded-lg bg-[#141110]/70 border border-white/5 space-y-1.5 hover:border-accent-gold/30 transition-colors">
            <div className="flex items-center gap-2 text-text-primary font-bold">
              <Activity className="w-3.5 h-3.5 text-status-warning" />
              <span>Telemetry Health Tiers</span>
            </div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Gold = High coherence (T₁ &gt; 200 µs), Amber = Degraded readout, Wine Burgundy = Defective dead line automatically isolated by CaliRoute.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
