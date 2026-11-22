"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Activity, GitFork, BarChart3, Clock, Sparkles } from "lucide-react";

const NAV_ITEMS = [
  { name: "Overview", href: "/", icon: Sparkles },
  { name: "Hardware Explorer", href: "/explorer", icon: Cpu },
  { name: "Calibration Analytics", href: "/analytics", icon: BarChart3 },
  { name: "ML Intelligence", href: "/ml", icon: Activity },
  { name: "Routing Simulator", href: "/routing", icon: GitFork },
  { name: "Calibration Drift", href: "/drift", icon: Clock },
];

export default function Navbar() {
  const pathname = usePathname();

  // On the cinematic landing page ("Inside the Quantum"), use dedicated cinematic header
  if (pathname === "/") {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] glass-panel backdrop-blur-2xl bg-[#06070B]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-accent-cyan via-accent-gold to-accent-neural p-[1.5px] shadow-cyan-glow group-hover:scale-105 transition-all">
            <div className="w-full h-full bg-[#080B14] rounded-[6.5px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-accent-cyan group-hover:text-accent-gold transition-colors" />
            </div>
          </div>
          <div>
            <div className="font-mono font-bold text-sm tracking-wider text-text-primary uppercase flex items-center gap-1.5">
              Quantum Calibration <span className="text-accent-cyan font-extrabold tracking-widest drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]">Intelligence</span>
            </div>
            <div className="text-[10px] text-text-muted tracking-widest font-mono uppercase flex items-center gap-1.5">
              <span>IBM Superconducting QPU</span>
              <span className="text-accent-cyan/60">•</span>
              <span className="text-accent-gold/90">GNN Router</span>
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 bg-[#0B0F19]/90 p-1 rounded-xl border border-white/[0.06] shadow-card-cryo">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono tracking-tight transition-all relative ${
                  isActive
                    ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/40 shadow-cyan-glow font-bold"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-accent-cyan" : "text-text-muted"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Live Backend Telemetry Pill */}
        <div className="flex items-center gap-3">
          <div className="glass-panel px-3.5 py-1.5 rounded-full border border-accent-cyan/30 flex items-center gap-2 text-xs shadow-cyan-glow/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan shadow-[0_0_8px_#00F0FF]"></span>
            </span>
            <span className="font-mono text-[11px] text-text-primary font-medium tracking-tight">ibm_kingston [156Q]</span>
            <span className="text-white/20">|</span>
            <span className="font-mono text-[10px] text-accent-gold font-bold">GNN ρ=0.91</span>
          </div>
        </div>
      </div>
    </header>
  );
}
