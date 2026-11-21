"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ShieldCheck, Cpu, GitBranch, Terminal } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();

  // On the cinematic landing page ("Inside the Quantum"), use dedicated cinematic footer
  if (pathname === "/") {
    return null;
  }
  return (
    <footer className="w-full border-t border-white/10 bg-[#141110] text-text-secondary text-xs mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-text-primary font-mono font-bold text-sm uppercase">
              <Cpu className="w-4 h-4 text-accent-gold" />
              Quantum Calibration Intelligence
            </div>
            <p className="text-text-secondary text-[11px] leading-relaxed">
              Classical machine learning optimization for quantum circuit layout and routing on superconducting hardware, powered by real IBM Quantum calibration telemetry.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <div className="text-text-primary font-mono text-xs uppercase tracking-wider font-semibold">
              Research Foundations
            </div>
            <ul className="space-y-1.5 text-[11px]">
              <li>Tomar et al., <em>arXiv:2606.12816</em> (2026)</li>
              <li>Pozzi et al., <em>ACM Trans. Quantum Comput.</em> (2022)</li>
              <li>Sinha, Azad, Singh, <em>AAAI</em> (2022)</li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <div className="text-text-primary font-mono text-xs uppercase tracking-wider font-semibold">
              Hardware Attribution
            </div>
            <ul className="space-y-1.5 text-[11px]">
              <li>Backend: <strong>IBM Kingston</strong> (156 Qubits)</li>
              <li>Architecture: Heron r1 Heavy-Hex Lattice</li>
              <li>Native Basis: CZ, SX, X, RZ, ID (352 Directed Couplers)</li>
              <li>Original Novelty: <strong>Calibration Drift Forecasting</strong></li>
            </ul>
          </div>

          {/* Col 4: Scientific Transparency */}
          <div className="space-y-2">
            <div className="text-text-primary font-mono text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-accent-gold" />
              Scientific Transparency
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              All telemetry, error rates, coherence times, and coupling graphs originate directly from IBM Quantum physical hardware snapshots. No synthetic metrics or fabricated results.
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-text-muted">
          <div>
            © 2026 Quantum Calibration Intelligence Platform. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 hover:text-text-primary transition-colors cursor-pointer">
              <GitBranch className="w-3.5 h-3.5 text-accent-gold" />
              IBM Heron r1 Topology
            </span>
            <span className="flex items-center gap-1.5 hover:text-text-primary transition-colors cursor-pointer">
              <Terminal className="w-3.5 h-3.5 text-accent-amber" />
              PyG Dual-Encoder GNN
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
