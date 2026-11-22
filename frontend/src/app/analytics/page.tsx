"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, Download, ArrowUpDown, ShieldCheck, Sparkles, Activity, Cpu } from "lucide-react";
import { getAnalytics } from "@/lib/api";
import { AnalyticsData, QubitRanking } from "@/types/quantum";

export default function CalibrationAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [sortField, setSortField] = useState<keyof QubitRanking>("quality_score");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getAnalytics();
        setData(res);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      }
    }
    loadData();
  }, []);

  const handleSort = (field: keyof QubitRanking) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedRankings = data
    ? [...data.rankings].sort((a, b) => {
      const vA = a[sortField];
      const vB = b[sortField];
      return sortAsc ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
    })
    : [];

  const handleExportCSV = () => {
    if (!data) return;
    const headers = "qubit_id,t1_us,t2_us,readout_error_pct,quality_score,tier\n";
    const rows = data.rankings.map(r => `${r.qubit_id},${r.t1_us},${r.t2_us},${r.readout_error_pct},${r.quality_score},${r.tier}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ibm_kingston_calibration_analytics.csv";
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-light">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 text-[10px] font-mono text-accent-cyan tracking-wider uppercase mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
            Cryogenic Metrology • IBM Kingston 156Q Heron r1
          </div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold text-text-primary flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-accent-cyan" />
            Calibration Analytics & Transmon Diagnostics
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm">
            Sub-kelvin transmon relaxation (T₁), Ramsey dephasing (T₂), and readout fidelity distributions across 352 tunable couplers.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass-panel hover:border-accent-cyan/40 text-text-primary font-mono text-xs transition-all self-start sm:self-auto shadow-sm hover:shadow-cyan-glow group"
        >
          <Download className="w-4 h-4 text-accent-cyan group-hover:scale-110 transition-transform" />
          <span>Export Dataset (CSV)</span>
        </button>
      </div>

      {data && (
        <>
          {/* Scientific KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="glass-panel p-4 rounded-xl relative overflow-hidden group hover:border-accent-cyan/40 transition-all">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-cyan/0 via-accent-cyan to-accent-cyan/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Operational Qubits</div>
              <div className="text-2xl font-mono font-bold text-accent-cyan mt-1">
                {data.kpis.operational_qubits} <span className="text-xs text-text-muted">/ {data.kpis.total_qubits}</span>
              </div>
              <div className="text-[10px] text-accent-cyan/80 mt-1 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                97.4% Fleet Online
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl relative overflow-hidden group hover:border-status-critical/40 transition-all">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-status-critical/0 via-status-critical to-status-critical/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Dead Transmons</div>
              <div className="text-2xl font-mono font-bold text-status-critical mt-1">
                {data.kpis.dead_qubits}
              </div>
              <div className="text-[10px] text-status-critical mt-1 font-mono truncate" title="Q113, Q121, Q131, Q146">
                Q113, Q121, Q131, Q146
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl relative overflow-hidden group hover:border-accent-gold/40 transition-all">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-gold/0 via-accent-gold to-accent-gold/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Mean T₁ Coherence</div>
              <div className="text-2xl font-mono font-bold text-accent-gold mt-1">
                {data.kpis.avg_t1_us} <span className="text-xs text-text-secondary font-normal">µs</span>
              </div>
              <div className="text-[10px] text-text-muted mt-1 font-mono">Thermal Relaxation</div>
            </div>

            <div className="glass-panel p-4 rounded-xl relative overflow-hidden group hover:border-accent-azure/40 transition-all">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-azure/0 via-accent-azure to-accent-azure/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Mean T₂ Dephasing</div>
              <div className="text-2xl font-mono font-bold text-accent-azure mt-1">
                {data.kpis.avg_t2_us} <span className="text-xs text-text-secondary font-normal">µs</span>
              </div>
              <div className="text-[10px] text-text-muted mt-1 font-mono">Ramsey / Hahn Echo</div>
            </div>

            <div className="glass-panel p-4 rounded-xl relative overflow-hidden group hover:border-accent-amber/40 transition-all">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-amber/0 via-accent-amber to-accent-amber/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Mean Readout Err</div>
              <div className="text-2xl font-mono font-bold text-accent-amber mt-1">
                {data.kpis.avg_readout_error_pct}%
              </div>
              <div className="text-[10px] text-text-muted mt-1 font-mono">SPAM Error Rate</div>
            </div>

            <div className="glass-panel p-4 rounded-xl relative overflow-hidden group hover:border-accent-gold/40 transition-all">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-gold/0 via-accent-gold to-accent-gold/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">Mean CZ Gate Err</div>
              <div className="text-2xl font-mono font-bold text-accent-gold mt-1">
                {data.kpis.avg_cz_error_pct}%
              </div>
              <div className="text-[10px] text-text-muted mt-1 font-mono">352 Physical Couplers</div>
            </div>
          </div>

          {/* Scientific Histograms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* T1 Histogram */}
            <div className="glass-panel p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-light">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent-cyan" />
                  <span className="font-mono font-bold text-xs uppercase tracking-wider text-text-primary">
                    T₁ Relaxation Time Distribution (µs)
                  </span>
                </div>
                <span className="font-mono text-[11px] text-accent-cyan font-semibold px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/20">
                  Mean: {data.kpis.avg_t1_us} µs
                </span>
              </div>
              <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-border-light">
                {data.distributions.t1.map((bin, i) => {
                  const maxCount = Math.max(...data.distributions.t1.map(b => b.count));
                  const heightPct = (bin.count / maxCount) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="text-[10px] font-mono text-accent-cyan bg-surface-elevated/90 px-1.5 py-0.5 rounded border border-accent-cyan/30 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 whitespace-nowrap z-10 shadow-lg pointer-events-none">
                        {bin.count} transmons
                      </div>
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full rounded-t bg-gradient-to-t from-accent-cyan/20 via-accent-cyan/60 to-accent-cyan transition-all group-hover:brightness-125 group-hover:shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                      />
                      <span className="text-[9px] font-mono text-text-muted truncate w-full text-center group-hover:text-accent-cyan transition-colors">
                        {bin.bin_start}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CZ Error Histogram */}
            <div className="glass-panel p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-light">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent-gold" />
                  <span className="font-mono font-bold text-xs uppercase tracking-wider text-text-primary">
                    Two-Qubit CZ Gate Error Distribution (%)
                  </span>
                </div>
                <span className="font-mono text-[11px] text-accent-gold font-semibold px-2 py-0.5 rounded bg-accent-gold/10 border border-accent-gold/20">
                  Mean: {data.kpis.avg_cz_error_pct}%
                </span>
              </div>
              <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-border-light">
                {data.distributions.cz_error.map((bin, i) => {
                  const maxCount = Math.max(...data.distributions.cz_error.map(b => b.count));
                  const heightPct = (bin.count / maxCount) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="text-[10px] font-mono text-accent-gold bg-surface-elevated/90 px-1.5 py-0.5 rounded border border-accent-gold/30 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 whitespace-nowrap z-10 shadow-lg pointer-events-none">
                        {bin.count} couplers
                      </div>
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full rounded-t bg-gradient-to-t from-accent-gold/20 via-accent-gold/60 to-accent-gold transition-all group-hover:brightness-125 group-hover:shadow-[0_0_12px_rgba(229,192,123,0.4)]"
                      />
                      <span className="text-[9px] font-mono text-text-muted truncate w-full text-center group-hover:text-accent-gold transition-colors">
                        {bin.bin_start}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Qubit Quality Ranking Table */}
          <div className="glass-panel p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-light">
              <div>
                <h3 className="font-mono font-bold text-sm text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-accent-gold" />
                  Physical Qubit Quality Ranking
                </h3>
                <p className="text-text-secondary text-xs mt-0.5 font-mono">
                  Composite coherence-readout fidelity score: <span className="text-text-primary">S = (T₁ · T₂) / (1 + 100 · e_ro)</span>
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border-light text-text-muted">
                  Top 30 Physical Qubits Shown
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-border-light text-text-secondary text-[11px]">
                    <th className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("qubit_id")}>
                      <div className="flex items-center gap-1">Qubit <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("t1_us")}>
                      <div className="flex items-center justify-end gap-1">T₁ (µs) <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("t2_us")}>
                      <div className="flex items-center justify-end gap-1">T₂ (µs) <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("readout_error_pct")}>
                      <div className="flex items-center justify-end gap-1">Readout Err (%) <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("quality_score")}>
                      <div className="flex items-center justify-end gap-1 text-accent-gold font-bold">
                        Quality Score <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-center">Tier Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light/50">
                  {sortedRankings.slice(0, 30).map((q) => (
                    <tr key={q.qubit_id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-3 font-bold text-text-primary flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${q.tier === "DEAD" ? "bg-status-critical" : q.tier === "A" ? "bg-accent-gold" : "bg-accent-azure"}`} />
                        Q{q.qubit_id}
                      </td>
                      <td className="py-2.5 px-3 text-right text-text-secondary">{q.t1_us.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right text-text-secondary">{q.t2_us.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right text-text-secondary">{q.readout_error_pct.toFixed(2)}%</td>
                      <td className="py-2.5 px-3 text-right font-bold text-accent-gold">
                        {q.quality_score > 0 ? q.quality_score.toLocaleString() : "0 (Dead)"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          q.tier === "DEAD"
                            ? "bg-status-critical/15 text-status-critical border-status-critical/30"
                            : q.tier === "A"
                            ? "bg-accent-gold/15 text-accent-gold border-accent-gold/30 shadow-[0_0_10px_rgba(229,192,123,0.12)]"
                            : "bg-accent-azure/15 text-accent-azure border-accent-azure/30"
                        }`}>
                          {q.tier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
