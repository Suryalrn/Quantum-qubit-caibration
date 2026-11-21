"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, Download, ArrowUpDown, ShieldCheck } from "lucide-react";
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold text-text-primary flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-accent-gold" />
            Calibration Analytics Dashboard
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            Real hardware calibration distributions, error rates, and physical qubit quality rankings.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg glass-panel hover:glass-panel-hover text-text-primary font-mono text-xs border border-white/10 transition-all self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-accent-gold" />
          Export Dataset (CSV)
        </button>
      </div>

      {data && (
        <>
          {/* Scientific KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-white/10">
              <div className="text-[10px] font-mono text-text-secondary uppercase">Operational Qubits</div>
              <div className="text-2xl font-mono font-bold text-accent-gold mt-1">
                {data.kpis.operational_qubits} <span className="text-xs text-text-muted">/ {data.kpis.total_qubits}</span>
              </div>
              <div className="text-[10px] text-text-muted mt-1 font-mono">97.4% Operational</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-white/10">
              <div className="text-[10px] font-mono text-text-secondary uppercase">Dead Qubits</div>
              <div className="text-2xl font-mono font-bold text-[#D98282] mt-1">
                {data.kpis.dead_qubits}
              </div>
              <div className="text-[10px] text-[#D98282] mt-1 font-mono">Q113, Q121, Q131, Q146</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-white/10">
              <div className="text-[10px] font-mono text-text-secondary uppercase">Mean T₁ Coherence</div>
              <div className="text-2xl font-mono font-bold text-text-primary mt-1">
                {data.kpis.avg_t1_us} <span className="text-xs text-text-secondary font-normal">µs</span>
              </div>
              <div className="text-[10px] text-text-muted mt-1 font-mono">Superconducting T₁</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-white/10">
              <div className="text-[10px] font-mono text-text-secondary uppercase">Mean T₂ Dephasing</div>
              <div className="text-2xl font-mono font-bold text-text-primary mt-1">
                {data.kpis.avg_t2_us} <span className="text-xs text-text-secondary font-normal">µs</span>
              </div>
              <div className="text-[10px] text-text-muted mt-1 font-mono">Ramsey / Hahn Echo</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-white/10">
              <div className="text-[10px] font-mono text-text-secondary uppercase">Mean Readout Err</div>
              <div className="text-2xl font-mono font-bold text-accent-amber mt-1">
                {data.kpis.avg_readout_error_pct}%
              </div>
              <div className="text-[10px] text-text-muted mt-1 font-mono">SPAM Error Rate</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-white/10">
              <div className="text-[10px] font-mono text-text-secondary uppercase">Mean CZ Gate Err</div>
              <div className="text-2xl font-mono font-bold text-accent-gold mt-1">
                {data.kpis.avg_cz_error_pct}%
              </div>
              <div className="text-[10px] text-text-muted mt-1 font-mono">352 Physical Couplers</div>
            </div>
          </div>

          {/* Scientific Histograms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* T1 Histogram */}
            <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs uppercase tracking-wider text-text-primary">
                  T₁ Relaxation Time Distribution (µs)
                </span>
                <span className="font-mono text-[11px] text-accent-gold font-semibold">Mean: {data.kpis.avg_t1_us} µs</span>
              </div>
              <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-white/10">
                {data.distributions.t1.map((bin, i) => {
                  const maxCount = Math.max(...data.distributions.t1.map(b => b.count));
                  const heightPct = (bin.count / maxCount) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="text-[10px] font-mono text-text-muted opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5">
                        {bin.count}
                      </div>
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full rounded-t bg-gradient-to-t from-accent-gold/30 to-accent-gold transition-all group-hover:brightness-125"
                      />
                      <span className="text-[9px] font-mono text-text-muted truncate w-full text-center">
                        {bin.bin_start}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CZ Error Histogram */}
            <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs uppercase tracking-wider text-text-primary">
                  Two-Qubit CZ Gate Error Distribution (%)
                </span>
                <span className="font-mono text-[11px] text-accent-amber font-semibold">Mean: {data.kpis.avg_cz_error_pct}%</span>
              </div>
              <div className="h-44 flex items-end gap-2 pt-6 pb-2 border-b border-white/10">
                {data.distributions.cz_error.map((bin, i) => {
                  const maxCount = Math.max(...data.distributions.cz_error.map(b => b.count));
                  const heightPct = (bin.count / maxCount) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="text-[10px] font-mono text-text-muted opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5">
                        {bin.count}
                      </div>
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full rounded-t bg-gradient-to-t from-accent-amber/30 to-accent-amber transition-all group-hover:brightness-125"
                      />
                      <span className="text-[9px] font-mono text-text-muted truncate w-full text-center">
                        {bin.bin_start}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Qubit Quality Ranking Table */}
          <div className="glass-panel p-5 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-mono font-bold text-sm text-text-primary uppercase tracking-wider">
                  Physical Qubit Quality Ranking
                </h3>
                <p className="text-text-secondary text-xs mt-0.5 font-mono">
                  Ranked by composite coherence-readout fidelity score: S = (T₁ · T₂) / (1 + 100 · e_ro)
                </p>
              </div>
              <span className="text-xs font-mono text-text-muted">Top 30 Physical Qubits Shown</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-text-secondary text-[11px]">
                    <th className="py-2.5 px-3 cursor-pointer hover:text-white" onClick={() => handleSort("qubit_id")}>
                      <div className="flex items-center gap-1">Qubit <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort("t1_us")}>
                      <div className="flex items-center justify-end gap-1">T₁ (µs) <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort("t2_us")}>
                      <div className="flex items-center justify-end gap-1">T₂ (µs) <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort("readout_error_pct")}>
                      <div className="flex items-center justify-end gap-1">Readout Err (%) <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="py-2.5 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort("quality_score")}>
                      <div className="flex items-center justify-end gap-1 text-accent-gold">Quality Score <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="py-2.5 px-3 text-center">Tier Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedRankings.slice(0, 30).map((q) => (
                    <tr key={q.qubit_id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-text-primary">Q{q.qubit_id}</td>
                      <td className="py-2.5 px-3 text-right text-text-secondary">{q.t1_us.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right text-text-secondary">{q.t2_us.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right text-text-secondary">{q.readout_error_pct.toFixed(2)}%</td>
                      <td className="py-2.5 px-3 text-right font-bold text-accent-gold">
                        {q.quality_score > 0 ? q.quality_score.toLocaleString() : "0 (Dead)"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${q.tier === "DEAD" ? "bg-status-dead/30 text-[#D98282]" :
                          q.tier === "A" ? "bg-accent-gold/20 text-accent-gold" : "bg-accent-amber/20 text-accent-amber"
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
