"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { Activity, Thermometer, Radio, Cpu, Layers } from "lucide-react";

interface ScientificHUDProps {
  scrollProgress: number;
}

interface TelemetryState {
  stageName: string;
  temperature: string;
  tempRaw: number; // in Kelvin
  pressure: string;
  coherenceT1: string;
  coherenceT2: string;
  frequency: string;
  anharmonicity: string;
  gateError2Q: string;
  focusComponent: string;
  scientificNote: string;
}

/**
 * ScientificHUD:
 * High-precision, physically grounded telemetry and component annotation HUD
 * for "INSIDE THE QUANTUM". Displays real-time cryogenic temperatures,
 * RF microwave frequencies, coherence times, and microfabrication metrics.
 */
export default function ScientificHUD({ scrollProgress }: ScientificHUDProps) {
  const p = scrollProgress;

  // Compute dynamic physical telemetry based on exact camera scroll location
  const telemetry: TelemetryState = useMemo(() => {
    if (p < 0.16) {
      // Scene 01: Dilution Refrigerator Chandelier
      const tK = THREE.MathUtils.lerp(293.15, 50.0, p / 0.16);
      return {
        stageName: "DILUTION REFRIGERATOR CHANDELIER",
        temperature: `${tK.toFixed(1)} K`,
        tempRaw: tK,
        pressure: "1.2 × 10⁻⁷ mbar (Ultra-High Vacuum)",
        coherenceT1: "N/A (Thermal Quench)",
        coherenceT2: "N/A",
        frequency: "Room Temp Interface",
        anharmonicity: "N/A",
        gateError2Q: "N/A",
        focusComponent: "ISO Vacuum Collar & Titanium Suspension Rods",
        scientificNote:
          "Pulse-tube cryocooler 1st stage provides preliminary precooling to 50K, rejecting room-temperature radiative heat load.",
      };
    } else if (p < 0.35) {
      // Scene 02: Cryogenic Internal Architecture
      const frac = (p - 0.16) / 0.19;
      const tK = THREE.MathUtils.lerp(50.0, 0.015, frac);
      return {
        stageName: "CRYOGENIC THERMAL ARCHITECTURE",
        temperature: tK < 1.0 ? `${(tK * 1000).toFixed(1)} mK` : `${tK.toFixed(2)} K`,
        tempRaw: tK,
        pressure: "8.5 × 10⁻⁸ mbar",
        coherenceT1: "34.2 μs",
        coherenceT2: "22.5 μs",
        frequency: "4.0 – 8.0 GHz (UT-085 Coax)",
        anharmonicity: "-220 MHz",
        gateError2Q: "1.2 × 10⁻²",
        focusComponent: "OFHC Copper Braided Straps & 4K HEMT Amplifiers",
        scientificNote:
          "Continuous ³He/⁴He dilution circulation achieves base refrigeration at 15 mK via enthalpy of mixing across phase boundary.",
      };
    } else if (p < 0.50) {
      // Scene 03: Superconducting Processor Package
      return {
        stageName: "SUPERCONDUCTING QUANTUM PROCESSOR",
        temperature: "14.8 mK (-273.135 °C)",
        tempRaw: 0.0148,
        pressure: "< 1.0 × 10⁻⁹ mbar",
        coherenceT1: "114.6 μs",
        coherenceT2: "86.4 μs",
        frequency: "5.124 GHz (Transmon f₀₁)",
        anharmonicity: "-224.2 MHz",
        gateError2Q: "4.1 × 10⁻³",
        focusComponent: "High-Resistivity Si Die & 48 Ultrasonic Gold Wirebonds",
        scientificNote:
          "Thin-film niobium (Tc = 9.2K) on high-resistivity silicon (ρ > 10 kΩ·cm) minimizes substrate dielectric loss tangent (tan δ < 10⁻⁶).",
      };
    } else if (p < 0.68) {
      // Scene 04: Transmon Qubit & Dolan Bridge Microscopic Hero Shot
      return {
        stageName: "JOSEPHSON TUNNEL JUNCTION (50,000× HERO SHOT)",
        temperature: "14.5 mK",
        tempRaw: 0.0145,
        pressure: "< 1.0 × 10⁻⁹ mbar",
        coherenceT1: "128.2 μs",
        coherenceT2: "94.8 μs",
        frequency: "Ej = 17.4 GHz | Ec = 268 MHz",
        anharmonicity: "α = -224 MHz (Anharmonic Non-Linearity)",
        gateError2Q: "3.8 × 10⁻³",
        focusComponent: "Al / AlOx / Al Dolan Bridge SIS Weak Link",
        scientificNote:
          "Nonlinear Josephson inductance Lj = Φ₀/(2π Ic cos Δφ) ≈ 9.3 nH isolates computational |0⟩–|1⟩ subspace without harmonic leakage.",
      };
    } else if (p < 0.84) {
      // Scene 05: State Tomography & Calibration
      return {
        stageName: "QUANTUM STATE TOMOGRAPHY & CALIBRATION",
        temperature: "14.8 mK",
        tempRaw: 0.0148,
        pressure: "< 1.0 × 10⁻⁹ mbar",
        coherenceT1: "112.0 μs",
        coherenceT2: "88.5 μs",
        frequency: "Dispersive Shift χ = -2.14 MHz",
        anharmonicity: "DRAG Derivative Weight: β = -0.42",
        gateError2Q: "3.5 × 10⁻³",
        focusComponent: "Bloch Sphere State Vector |ψ⟩ & Shaped DRAG Envelope",
        scientificNote:
          "Derivative Removal by Adiabatic Gate (DRAG) pulses eliminate phase errors and leakage into non-computational |2⟩ state during 20ns X_π/2 rotations.",
      };
    } else {
      // Scene 06: Distributed Network Ecosystem
      return {
        stageName: "DISTRIBUTED QUANTUM NETWORK ECOSYSTEM",
        temperature: "Multi-QPU Interconnect Active",
        tempRaw: 0.015,
        pressure: "Heterogeneous Cryo Infrastructure",
        coherenceT1: "Mean T₁: 108.4 μs",
        coherenceT2: "Mean T₂*: 82.1 μs",
        frequency: "Graph Embedding DAG (Dual-Encoder GNN)",
        anharmonicity: "Hardware Defect Mask: Active",
        gateError2Q: "3.2 × 10⁻³ (Noise-Optimized)",
        focusComponent: "Dual-Encoder GNN Router vs SABRE Defect Bypass",
        scientificNote:
          "Graph Neural Network embeds circuit DAG with calibrated 2Q error margins to route multi-qubit algorithms away from defective hardware corridors.",
      };
    }
  }, [p]);

  return (
    <div className="fixed top-16 right-6 z-30 pointer-events-none hidden lg:block max-w-sm">
      <div className="p-3.5 rounded-2xl bg-[#06070B]/85 backdrop-blur-xl border border-border-light shadow-card-cryo font-mono text-[11px] text-[#F8FAFC]">
        {/* Stage Header */}
        <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-border-light/60">
          <div className="flex items-center gap-2 text-accent-cyan">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-semibold tracking-wider text-[10px] uppercase">
              PHYSICS TELEMETRY
            </span>
          </div>
          <span className="text-[10px] text-text-muted">
            SCROLL {Math.round(p * 100)}%
          </span>
        </div>

        {/* Current Active Component */}
        <div className="mb-2.5">
          <div className="text-[9px] uppercase tracking-wider text-text-muted">
            INSPECTION FOCUS
          </div>
          <div className="text-xs font-semibold text-accent-cyan leading-tight mt-0.5">
            {telemetry.stageName}
          </div>
          <div className="text-[10px] text-text-secondary mt-0.5">
            {telemetry.focusComponent}
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-[#0B0F19]/90 border border-border-light/50 mb-2.5">
          <div>
            <div className="flex items-center gap-1 text-[9px] text-text-muted">
              <Thermometer className="w-2.5 h-2.5 text-accent-azure" />
              <span>TEMPERATURE</span>
            </div>
            <div className="text-xs font-bold text-[#F8FAFC] mt-0.5">
              {telemetry.temperature}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[9px] text-text-muted">
              <Radio className="w-2.5 h-2.5 text-accent-violet" />
              <span>COHERENCE T₁</span>
            </div>
            <div className="text-xs font-bold text-accent-violet mt-0.5">
              {telemetry.coherenceT1}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[9px] text-text-muted">
              <Cpu className="w-2.5 h-2.5 text-accent-gold" />
              <span>ANHARMONICITY</span>
            </div>
            <div className="text-[11px] font-semibold text-accent-gold mt-0.5 truncate">
              {telemetry.anharmonicity}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[9px] text-text-muted">
              <Layers className="w-2.5 h-2.5 text-accent-cyan" />
              <span>2Q GATE ERROR</span>
            </div>
            <div className="text-[11px] font-semibold text-accent-cyan mt-0.5">
              {telemetry.gateError2Q}
            </div>
          </div>
        </div>

        {/* Scientific Context Note */}
        <div className="text-[10px] text-text-secondary leading-snug border-t border-border-light/40 pt-2">
          <span className="text-accent-cyan font-semibold mr-1">PHYSICS:</span>
          {telemetry.scientificNote}
        </div>
      </div>
    </div>
  );
}
