"use client";

import React, { useState, useEffect } from "react";
import { Activity, Brain, Layers, Zap, ShieldCheck, Network, GitMerge, Cpu, ArrowUpRight } from "lucide-react";
import { getModelsStatus } from "@/lib/api";
import { ModelsStatus } from "@/types/quantum";

export default function MachineLearningPage() {
  const [status, setStatus] = useState<ModelsStatus | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getModelsStatus();
        setStatus(res);
      } catch (err) {
        console.error("Failed to load models status:", err);
      }
    }
    loadData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-border-light">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-accent-violet/10 border border-accent-violet/30 text-[10px] font-mono text-accent-violet tracking-wider uppercase mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-violet animate-pulse" />
          Neural Topology & Drift Dynamics • PyG Architecture
        </div>
        <h1 className="text-2xl sm:text-3xl font-mono font-bold text-text-primary flex items-center gap-2.5">
          <Brain className="w-7 h-7 text-accent-violet" />
          Machine Learning Intelligence
        </h1>
        <p className="text-text-secondary text-xs sm:text-sm mt-1">
          Dual-Encoder Graph Neural Network (PyG) and Residual LSTM calibration drift forecasters.
        </p>
      </div>

      {status && (
        <>
          {/* Top Model Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GNN Scorer Card */}
            <div className="glass-panel p-6 rounded-2xl border border-accent-violet/30 space-y-5 relative overflow-hidden group hover:border-accent-violet/50 transition-all shadow-card-cryo">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-violet/0 via-accent-violet to-accent-violet/0" />

              <div className="flex items-center justify-between pb-3 border-b border-border-light">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-accent-violet/15 border border-accent-violet/30 flex items-center justify-center text-accent-violet">
                    <Network className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-sm text-text-primary">{status.gnn_scorer.name}</h3>
                    <div className="text-[10px] text-text-muted font-mono">{status.gnn_scorer.type}</div>
                  </div>
                </div>
                <span className="bg-accent-violet/15 text-accent-violet font-mono text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase border border-accent-violet/30 shadow-[0_0_10px_rgba(129,140,248,0.15)]">
                  TRAINED • BEST CKPT
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-surface-elevated/70 p-3.5 rounded-xl border border-border-light">
                  <div className="text-text-muted text-[10px] uppercase tracking-wider">Spearman Correlation (ρ)</div>
                  <div className="text-2xl font-bold text-accent-gold mt-1">
                    {status.gnn_scorer.spearman_rank_correlation}
                  </div>
                  <div className="text-[10px] text-accent-gold/80 mt-0.5">Near-Monotonic Alignment</div>
                </div>
                <div className="bg-surface-elevated/70 p-3.5 rounded-xl border border-border-light">
                  <div className="text-text-muted text-[10px] uppercase tracking-wider">Validation Loss (Huber)</div>
                  <div className="text-2xl font-bold text-accent-violet mt-1">
                    {status.gnn_scorer.validation_loss}
                  </div>
                  <div className="text-[10px] text-accent-violet/80 mt-0.5">Smooth L1 (β=0.5)</div>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono text-text-secondary">
                <div className="flex justify-between py-1.5 border-b border-border-light/50">
                  <span>Dual Graph Encoders:</span>
                  <span className="text-text-primary font-semibold">HardwareGraph + CircuitGraph</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-light/50">
                  <span>Candidate Layout Dataset:</span>
                  <span className="text-text-primary">{status.gnn_scorer.training_samples} Diverse Graph Pairs</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-light/50">
                  <span>Dead Qubits Isolated:</span>
                  <span className="text-status-critical font-bold">113, 121, 131, 146 (0% Allocation)</span>
                </div>
              </div>
            </div>

            {/* LSTM Drift Forecaster Card */}
            <div className="glass-panel p-6 rounded-2xl border border-accent-cyan/30 space-y-5 relative overflow-hidden group hover:border-accent-cyan/50 transition-all shadow-card-cryo">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-cyan/0 via-accent-cyan to-accent-cyan/0" />

              <div className="flex items-center justify-between pb-3 border-b border-border-light">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-sm text-text-primary">{status.drift_forecaster.name}</h3>
                    <div className="text-[10px] text-text-muted font-mono">{status.drift_forecaster.type}</div>
                  </div>
                </div>
                <span className="bg-accent-cyan/15 text-accent-cyan font-mono text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase border border-accent-cyan/30 shadow-cyan-glow">
                  TRAINED • BEST CKPT
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-surface-elevated/70 p-3.5 rounded-xl border border-border-light">
                  <div className="text-text-muted text-[10px] uppercase tracking-wider">Qubit MAE Gain</div>
                  <div className="text-2xl font-bold text-accent-cyan mt-1">
                    {status.drift_forecaster.qubit_mae_gain_over_persistence}
                  </div>
                  <div className="text-[10px] text-accent-cyan/80 mt-0.5">vs. Naive Persistence</div>
                </div>
                <div className="bg-surface-elevated/70 p-3.5 rounded-xl border border-border-light">
                  <div className="text-text-muted text-[10px] uppercase tracking-wider">Coupler MAE Gain</div>
                  <div className="text-2xl font-bold text-accent-gold mt-1">
                    {status.drift_forecaster.coupler_mae_gain_over_persistence}
                  </div>
                  <div className="text-[10px] text-accent-gold/80 mt-0.5">Log-Space Stabilized</div>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono text-text-secondary">
                <div className="flex justify-between py-1.5 border-b border-border-light/50">
                  <span>Training Telemetry:</span>
                  <span className="text-text-primary">{status.drift_forecaster.training_sequences} Sequences</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-light/50">
                  <span>Validation Telemetry:</span>
                  <span className="text-text-primary">{status.drift_forecaster.validation_sequences} Sequences</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border-light/50">
                  <span>Temporal Lookback:</span>
                  <span className="text-text-primary">{status.drift_forecaster.lookback_window} Days Sliding Window</span>
                </div>
              </div>
            </div>
          </div>

          {/* Architecture Specification */}
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h3 className="font-mono font-bold text-base text-text-primary flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent-gold" />
              Machine Learning Architecture Specifications
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-text-secondary">
              <div className="p-5 rounded-xl bg-surface-elevated/60 border border-border-light space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-violet" />
                  <h4 className="font-mono font-bold text-accent-violet uppercase text-xs">
                    Dual-Encoder GNN Pipeline
                  </h4>
                </div>
                <p className="leading-relaxed font-sans text-text-secondary">
                  The model takes two heterogeneous graphs: the physical hardware topology G_H and the logical circuit interaction DAG G_C. Both graphs are embedded through node-level and edge-level graph convolutions, pooled into latent space vectors, and concatenated to estimate mapping suitability.
                </p>
                <div className="font-mono text-[11px] text-text-muted space-y-1.5 pt-2 border-t border-border-light">
                  <div>• Optimizer: AdamW (lr=0.001, weight_decay=1e-4)</div>
                  <div>• Regularization: Dropout (0.15) + LayerNorm</div>
                  <div>• Training Samples: 570 diverse graph pairs</div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-surface-elevated/60 border border-border-light space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent-cyan" />
                  <h4 className="font-mono font-bold text-accent-cyan uppercase text-xs">
                    Residual LSTM Temporal Forecaster
                  </h4>
                </div>
                <p className="leading-relaxed font-sans text-text-secondary">
                  The temporal forecaster uses a residual additive formulation: ŷ(t+1) = y(t) + f_θ(y_t). Rather than predicting raw values directly, the network learns the drift deviation over historical 5-day windows.
                </p>
                <div className="font-mono text-[11px] text-text-muted space-y-1.5 pt-2 border-t border-border-light">
                  <div>• Hidden Dimension: 64 units across 2 LSTM layers</div>
                  <div>• Coupler Space: Logarithmic log₁₀(error + 1e-7)</div>
                  <div>• Checkpoint: results/drift_forecaster_best.pt</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
