"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  Activity,
  Layers,
  Zap,
  Clock,
  Compass,
  Terminal,
  ExternalLink,
} from "lucide-react";
import Lenis from "lenis";
import InsideQuantumCanvas from "@/components/3d/inside-quantum/InsideQuantumCanvas";
import { getTopology, getAnalytics, getModelsStatus } from "@/lib/api";
import { AnalyticsData, ModelsStatus } from "@/types/quantum";

/**
 * INSIDE THE QUANTUM — Master Cinematic 3D Experience
 * Coordinated 6-Scene Journey:
 * Scene 01 — Dilution Refrigerator (Beyond Classical. Into Quantum.)
 * Scene 02 — Cryogenic Chamber (Inside the Architecture)
 * Scene 03 — Superconducting Processor (Where Quantum States Begin)
 * Scene 04 — Qubit Architecture (Every Connection Matters)
 * Scene 05 — State Tomography and Calibration (Precision at the Quantum Level)
 * Scene 06 — Quantum Ecosystem (Making Quantum Computing More Intelligent)
 */

const SCENE_STAGES = [
  { id: 1, label: "I • CHANDELIER", name: "Dilution Refrigerator", target: 0.0 },
  { id: 2, label: "II • CRYOSTAT", name: "Cryogenic Chamber", target: 0.20 },
  { id: 3, label: "III • PROCESSOR", name: "Superconducting Chip", target: 0.42 },
  { id: 4, label: "IV • TOPOLOGY", name: "Qubit Architecture", target: 0.62 },
  { id: 5, label: "V • CALIBRATION", name: "State Tomography", target: 0.80 },
  { id: 6, label: "VI • ECOSYSTEM", name: "Quantum Network", target: 1.0 },
];

export default function InsideTheQuantumLanding() {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [orbitMode, setOrbitMode] = useState<boolean>(false);
  const lenisRef = useRef<Lenis | null>(null);

  // Initialize Lenis Smooth Scroll & Synchronized Progress
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    const onScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollY / maxScroll)) : 0;
      setScrollProgress(progress);

      if (progress < 0.16) setActiveSceneIndex(0);
      else if (progress < 0.36) setActiveSceneIndex(1);
      else if (progress < 0.54) setActiveSceneIndex(2);
      else if (progress < 0.72) setActiveSceneIndex(3);
      else if (progress < 0.88) setActiveSceneIndex(4);
      else setActiveSceneIndex(5);
    };

    lenis.on("scroll", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Smooth jump to any scene
  const scrollToScene = (targetProgress: number) => {
    if (!lenisRef.current) return;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    lenisRef.current.scrollTo(targetProgress * maxScroll, { duration: 1.6 });
  };

  return (
    <div className="relative bg-[#06070B] text-[#F8FAFC] selection:bg-[#00F0FF]/30 selection:text-[#00F0FF] font-sans antialiased min-h-screen">
      {/* =========================================================================
          1. FIXED 3D BACKGROUND CANVAS (SCROLL-CHOREOGRAPHED)
          ========================================================================= */}
      <div
        className={`fixed inset-0 w-full h-full z-0 transition-opacity duration-700 ${
          orbitMode ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <InsideQuantumCanvas scrollProgress={scrollProgress} interactive={orbitMode} />
      </div>

      {/* Atmospheric Vignette Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-radial-gradient from-transparent via-[#06070B]/30 to-[#06070B]/85" />
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-[#06070B]/70 via-transparent to-[#06070B]/90" />

      {/* =========================================================================
          2. COMPACT, EDITORIAL NAVIGATION BAR
          ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-40 px-6 py-3.5 flex items-center justify-between border-b border-border-light bg-[#06070B]/80 backdrop-blur-xl">
        {/* Brand & Project Identity */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center p-[1px] shadow-sm shadow-accent-cyan/20">
            <div className="w-full h-full bg-[#06070B] rounded-[7px] flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5 text-accent-cyan" />
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold tracking-wider text-[#F8FAFC] uppercase">
              INSIDE THE QUANTUM
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] text-text-muted font-mono">
              Research Platform
            </span>
          </div>
        </div>

        {/* Scene Waypoint Quick Links */}
        <nav className="hidden md:flex items-center gap-1 bg-[#0B0F19]/70 border border-border-light rounded-full px-2.5 py-1">
          {SCENE_STAGES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => scrollToScene(s.target)}
              className={`px-3 py-1 text-[11px] rounded-full transition-all font-mono ${
                activeSceneIndex === idx
                  ? "bg-accent-cyan text-[#06070B] font-semibold shadow-sm shadow-accent-cyan/30"
                  : "text-text-secondary hover:text-[#F8FAFC]"
              }`}
            >
              {s.name}
            </button>
          ))}
        </nav>

        {/* Action CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/routing"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent-cyan via-accent-azure to-accent-gold text-[#06070B] font-semibold text-xs tracking-wide shadow-sm shadow-accent-cyan/20 hover:brightness-110 transition-all"
          >
            <Zap className="w-3 h-3" />
            <span>Routing Simulator</span>
          </Link>
          <Link
            href="/explorer"
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0B0F19]/80 border border-border-light text-text-secondary hover:text-[#F8FAFC] text-xs font-mono transition-all hover:border-accent-cyan/30"
          >
            <span>QPU Explorer</span>
            <ExternalLink className="w-3 h-3 text-text-muted" />
          </Link>
        </div>
      </header>

      {/* =========================================================================
          3. FLOATING STAGE TELEMETRY & CONTROLS DOCK (DOCK TO RIGHT CORNER)
          ========================================================================= */}
      <div className="fixed right-6 bottom-8 z-30 flex flex-col items-end gap-3 pointer-events-auto">
        {/* Scene Telemetry Mini-Card */}
        <div className="hidden sm:block p-3 rounded-xl bg-[#0B0F19]/85 backdrop-blur-xl border border-border-light shadow-card-cryo min-w-[210px] text-xs">
          <div className="flex items-center justify-between gap-4 mb-1">
            <span className="text-[10px] font-mono text-accent-cyan uppercase tracking-wider">
              {SCENE_STAGES[activeSceneIndex].label}
            </span>
            <span className="text-[10px] font-mono text-text-muted">
              {Math.round(scrollProgress * 100)}%
            </span>
          </div>
          <div className="text-xs font-semibold text-[#F8FAFC] tracking-tight">
            {SCENE_STAGES[activeSceneIndex].name}
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-[#06070B] rounded-full mt-2 overflow-hidden border border-border-light/40">
            <div
              className="h-full bg-gradient-to-r from-accent-cyan to-accent-violet transition-all duration-300"
              style={{ width: `${Math.round(scrollProgress * 100)}%` }}
            />
          </div>
        </div>

        {/* Orbit Mode Toggle */}
        <button
          onClick={() => setOrbitMode(!orbitMode)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all backdrop-blur-xl border shadow-xl ${
            orbitMode
              ? "bg-accent-cyan text-[#06070B] font-semibold border-accent-cyan shadow-cyan-glow"
              : "bg-[#0B0F19]/85 text-text-secondary border-border-light hover:text-[#F8FAFC] hover:border-accent-cyan/30"
          }`}
          title="Toggle 360° Free Orbit Inspection"
        >
          <Compass className={`w-3.5 h-3.5 ${orbitMode ? "animate-spin" : ""}`} />
          <span>{orbitMode ? "Orbit Active" : "Free Orbit Mode"}</span>
        </button>

        {orbitMode && (
          <div className="px-2.5 py-1 rounded bg-[#06070B]/90 border border-accent-cyan/30 text-[10px] font-mono text-accent-cyan shadow-cyan-glow">
            Left-Click: Rotate • Right-Click: Pan • Scroll: Zoom
          </div>
        )}
      </div>

      {/* =========================================================================
          4. SIX-SCENE CINEMATIC EDITORIAL OVERLAYS
          ========================================================================= */}
      <div className="relative z-10">
        {/* -------------------------------------------------------------------
            SCENE 01 — DILUTION REFRIGERATOR
            ------------------------------------------------------------------- */}
        <section className="relative min-h-[115vh] pt-28 pb-12 flex flex-col justify-center px-6 md:px-16 lg:px-24">
          <div className="max-w-xl p-6 sm:p-8 rounded-2xl bg-[#0B0F19]/70 backdrop-blur-xl border border-border-light shadow-card-cryo">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B0F19]/80 border border-accent-cyan/30 text-xs text-accent-cyan font-mono mb-6 shadow-cyan-glow">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
              PHYSICAL QUANTUM COMPUTING PLATFORM
            </div>

            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-[#F8FAFC] leading-[1.08] mb-6 font-display">
              BEYOND CLASSICAL.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-gold">
                INTO QUANTUM.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-text-secondary leading-relaxed mb-8 max-w-lg">
              Exploring intelligent, hardware-aware quantum computing. Step inside the dilution refrigerator
              to investigate superconducting transmon qubits, cryogenic microwave waveguides, and noise-adaptive routing.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => scrollToScene(0.20)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-cyan via-accent-azure to-accent-gold text-[#06070B] font-bold text-sm shadow-md shadow-accent-cyan/20 hover:brightness-110 transition-all"
              >
                <span>Explore the Technology</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                href="/routing"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0B0F19]/80 border border-border-light text-[#F8FAFC] font-semibold text-sm hover:border-accent-cyan/40 transition-all shadow-sm"
              >
                <Terminal className="w-4 h-4 text-accent-cyan" />
                <span>Open QASM Studio</span>
              </Link>
            </div>

            {/* Scroll Indicator */}
            <div className="mt-10 flex items-center gap-3 text-xs font-mono text-text-muted">
              <div className="w-5 h-9 rounded-full border border-border-light flex items-start justify-center p-1">
                <div className="w-1 h-2 bg-accent-cyan rounded-full animate-bounce" />
              </div>
              <span>Scroll to Descend into the Cryostat</span>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------------
            SCENE 02 — CRYOGENIC CHAMBER
            ------------------------------------------------------------------- */}
        <section className="relative min-h-[115vh] flex flex-col justify-center px-6 md:px-16 lg:px-24">
          <div className="max-w-lg">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#0B0F19]/70 backdrop-blur-xl border border-border-light shadow-card-cryo">
              <span className="text-xs font-mono text-accent-cyan uppercase tracking-wider block mb-2">
                SCENE 02 • CRYOGENIC ARCHITECTURE
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#F8FAFC] tracking-tight mb-4">
                Inside the Architecture.
              </h2>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed mb-6">
                Precision begins at the physical layer. Cascading thermal plates step temperatures down from 50K
                down to 15 millikelvin—suppressing thermal phonon excitations to isolate fragile superconducting states.
              </p>

              {/* Physical Cryogenic Specs */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border-light text-xs font-mono">
                <div>
                  <span className="text-text-muted block text-[10px]">BASE TEMPERATURE</span>
                  <span className="text-sm font-semibold text-accent-cyan">15 mK (-273.135°C)</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">HEAT SINKING</span>
                  <span className="text-sm font-semibold text-accent-gold">OFHC Braided Copper</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------------
            SCENE 03 — SUPERCONDUCTING PROCESSOR
            ------------------------------------------------------------------- */}
        <section className="relative min-h-[115vh] flex flex-col justify-center px-6 md:px-16 lg:px-24">
          <div className="max-w-lg">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#0B0F19]/70 backdrop-blur-xl border border-border-light shadow-card-cryo">
              <span className="text-xs font-mono text-accent-violet uppercase tracking-wider block mb-2">
                SCENE 03 • SUPERCONDUCTING HARDWARE
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#F8FAFC] tracking-tight mb-4">
                Where Quantum States Begin.
              </h2>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed mb-6">
                Mounted on the mixing chamber base plate, the high-resistivity silicon die houses superconducting
                coplanar waveguides and thin-film circuit patterns, linked by 48 pure gold wirebonds to carrier RF launchers.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border-light text-xs font-mono">
                <div>
                  <span className="text-text-muted block text-[10px]">DIE SUBSTRATE</span>
                  <span className="text-sm font-semibold text-[#F8FAFC]">High-Resistivity Si</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">WIRE BONDS</span>
                  <span className="text-sm font-semibold text-accent-gold">48 Pure Gold Bonds</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------------
            SCENE 04 — QUBIT ARCHITECTURE
            ------------------------------------------------------------------- */}
        <section className="relative min-h-[115vh] flex flex-col justify-center px-6 md:px-16 lg:px-24">
          <div className="max-w-lg">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#0B0F19]/70 backdrop-blur-xl border border-border-light shadow-card-cryo">
              <span className="text-xs font-mono text-accent-cyan uppercase tracking-wider block mb-2">
                SCENE 04 • QUBIT TOPOLOGY & COUPLING
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#F8FAFC] tracking-tight mb-4">
                Every Connection Matters.
              </h2>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed mb-6">
                Understanding the architecture of quantum hardware. Transmon qubits interact through fixed-frequency
                bus resonators. Our dual-encoder GNN steers logical 2-qubit gates away from defective couplers and noisy corridors.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border-light text-xs font-mono">
                <div>
                  <span className="text-text-muted block text-[10px]">LATTICE TOPOLOGY</span>
                  <span className="text-sm font-semibold text-accent-cyan">Heavy-Hexagonal</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">ROUTING POLICY</span>
                  <span className="text-sm font-semibold text-accent-violet">Dual-Encoder GNN</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border-light">
                <Link
                  href="/explorer"
                  className="text-xs font-semibold text-accent-cyan hover:underline flex items-center gap-1"
                >
                  <span>Inspect Physical IBM Heavy-Hex Lattice</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------------
            SCENE 05 — STATE TOMOGRAPHY AND CALIBRATION
            ------------------------------------------------------------------- */}
        <section className="relative min-h-[115vh] flex flex-col justify-center px-6 md:px-16 lg:px-24">
          <div className="max-w-lg">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#0B0F19]/70 backdrop-blur-xl border border-border-light shadow-card-cryo">
              <span className="text-xs font-mono text-accent-violet uppercase tracking-wider block mb-2">
                SCENE 05 • STATE TOMOGRAPHY & CALIBRATION
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#F8FAFC] tracking-tight mb-4">
                Precision at the Quantum Level.
              </h2>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed mb-6">
                Understanding and characterizing hardware behaviour. State vector evolution on the Bloch sphere,
                shaped microwave DRAG envelopes, and dispersive cavity readout frequency shifts govern experimental execution fidelity.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border-light text-xs font-mono">
                <div>
                  <span className="text-text-muted block text-[10px]">ENERGY RELAXATION T₁</span>
                  <span className="text-sm font-semibold text-accent-cyan">84.2 μs (Illustrative)</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px]">DEPHASING TIME T₂*</span>
                  <span className="text-sm font-semibold text-accent-violet">68.5 μs (Ramsey)</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border-light">
                <Link
                  href="/drift"
                  className="text-xs font-semibold text-accent-violet hover:underline flex items-center gap-1"
                >
                  <span>Explore 30-Day Calibration Drift Predictor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------------
            SCENE 06 — QUANTUM ECOSYSTEM (FINAL REVEAL)
            ------------------------------------------------------------------- */}
        <section className="relative min-h-[115vh] pt-28 pb-16 flex flex-col justify-center items-center text-center px-6 md:px-16 lg:px-24">
          <div className="max-w-2xl p-8 sm:p-10 rounded-3xl bg-[#0B0F19]/80 backdrop-blur-xl border border-border-light shadow-card-cryo">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B0F19]/70 border border-accent-cyan/30 text-xs text-accent-cyan font-mono mb-4 shadow-cyan-glow">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
              CONNECTED QUANTUM INTELLIGENCE
            </div>

            <h2 className="text-3xl sm:text-5xl font-bold text-[#F8FAFC] tracking-tight leading-tight mb-4">
              Making Quantum Computing
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan via-accent-azure to-accent-gold">
                More Intelligent.
              </span>
            </h2>

            <p className="text-sm sm:text-base text-text-secondary leading-relaxed mb-8 max-w-xl mx-auto">
              Exploring noise-aware, hardware-aware quantum optimization. Bridging theoretical quantum algorithms
              with physical devices through machine learning and defect-immune graph routing.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
              <Link
                href="/routing"
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-accent-cyan via-accent-azure to-accent-gold text-[#06070B] font-bold text-sm shadow-lg shadow-accent-cyan/20 hover:brightness-110 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>Discover Our Approach</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/analytics"
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0B0F19]/80 border border-border-light text-[#F8FAFC] font-semibold text-sm hover:border-accent-cyan/40 transition-all shadow-sm"
              >
                <Activity className="w-4 h-4 text-accent-cyan" />
                <span>View Benchmarks</span>
              </Link>
            </div>

            {/* Platform Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
              <Link
                href="/routing"
                className="p-5 rounded-2xl bg-[#0B0F19]/60 backdrop-blur-xl border border-border-light hover:border-accent-cyan/40 transition-all group shadow-card-cryo"
              >
                <div className="w-8 h-8 rounded-xl bg-accent-cyan/10 text-accent-cyan flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-accent-cyan/20">
                  <Terminal className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-[#F8FAFC] mb-1">OpenQASM 2.0 Studio</h3>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Write custom circuits, compile ASTs, and compare SABRE vs GNN routing in real-time.
                </p>
              </Link>

              <Link
                href="/explorer"
                className="p-5 rounded-2xl bg-[#0B0F19]/60 backdrop-blur-xl border border-border-light hover:border-accent-gold/40 transition-all group shadow-card-cryo"
              >
                <div className="w-8 h-8 rounded-xl bg-accent-gold/10 text-accent-gold flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-accent-gold/20">
                  <Cpu className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-[#F8FAFC] mb-1">Hardware Topologies</h3>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Interactive 3D inspection of IBM Kingston (156Q), Hummingbird, and Eagle chips.
                </p>
              </Link>

              <Link
                href="/ml"
                className="p-5 rounded-2xl bg-[#0B0F19]/60 backdrop-blur-xl border border-border-light hover:border-accent-violet/40 transition-all group shadow-card-cryo"
              >
                <div className="w-8 h-8 rounded-xl bg-accent-violet/10 text-accent-violet flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-accent-violet/20">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-[#F8FAFC] mb-1">Dual-Encoder GNN</h3>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Graph Neural Network embedding circuit DAGs and hardware coupling graphs.
                </p>
              </Link>

              <Link
                href="/drift"
                className="p-5 rounded-2xl bg-[#0B0F19]/60 backdrop-blur-xl border border-border-light hover:border-accent-cyan/40 transition-all group shadow-card-cryo"
              >
                <div className="w-8 h-8 rounded-xl bg-status-healthy/10 text-status-healthy flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-status-healthy/20">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-[#F8FAFC] mb-1">Calibration Drift</h3>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  LSTM temporal forecasting predicting two-qubit gate error degradation over time.
                </p>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* =========================================================================
          5. MINIMAL LAB FOOTER
          ========================================================================= */}
      <footer className="relative z-10 border-t border-border-light bg-[#06070B]/95 py-8 px-6 md:px-16 text-xs text-text-secondary">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#F8FAFC]">INSIDE THE QUANTUM</span>
            <span className="text-accent-cyan">•</span>
            <span>Hardware-Aware Quantum Optimization Research</span>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <Link href="/routing" className="hover:text-accent-cyan transition-colors">
              Routing Simulator
            </Link>
            <Link href="/explorer" className="hover:text-accent-cyan transition-colors">
              QPU Lattice
            </Link>
            <Link href="/analytics" className="hover:text-accent-cyan transition-colors">
              Analytics
            </Link>
            <Link href="/drift" className="hover:text-accent-cyan transition-colors">
              Drift Forecasting
            </Link>
          </div>

          <p className="text-[11px] font-mono text-text-muted">
            Beyond Classical. Into Quantum.
          </p>
        </div>
      </footer>
    </div>
  );
}
