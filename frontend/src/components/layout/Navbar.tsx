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
    <header className="sticky top-0 z-50 w-full border-b border-white/10 glass-panel backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-accent-amber to-accent-gold p-0.5 shadow-gold-glow group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-[#1A1615] rounded-[7px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-accent-gold" />
            </div>
          </div>
          <div>
            <div className="font-mono font-bold text-sm tracking-wider text-text-primary uppercase flex items-center gap-1.5">
              Quantum Calibration <span className="text-accent-gold">Intelligence</span>
            </div>
            <div className="text-[10px] text-text-secondary tracking-widest font-mono uppercase">
              IBM Kingston 156Q • GNN Router
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? "bg-accent-gold/15 text-accent-gold border border-accent-gold/40 shadow-gold-glow font-bold"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-accent-gold" : "text-text-secondary"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Live Backend Telemetry Pill */}
        <div className="flex items-center gap-3">
          <div className="glass-panel px-3 py-1.5 rounded-full border border-accent-gold/30 flex items-center gap-2 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-gold opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-gold"></span>
            </span>
            <span className="font-mono text-[11px] text-text-primary font-medium">ibm_kingston [156Q]</span>
            <span className="text-white/20">|</span>
            <span className="font-mono text-[10px] text-accent-amber font-bold">GNN ρ=0.91</span>
          </div>
        </div>
      </div>
    </header>
  );
}
