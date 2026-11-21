"use client";

import React, { useState, useEffect } from "react";
import { Activity, Brain, Layers, Zap, ShieldCheck } from "lucide-react";
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
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-2xl sm:text-3xl font-mono font-bold text-text-primary flex items-center gap-2.5">
          <Brain className="w-7 h-7 text-accent-gold" />
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
            <div className="glass-panel p-6 rounded-2xl border border-accent-gold/30 space-y-5 relative overflow-hidden shadow-gold-glow">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent-gold/20 flex items-center justify-center text-accent-gold">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-sm text-text-primary">{status.gnn_scorer.name}</h3>
                    <div className="text-[10px] text-text-muted font-mono">{status.gnn_scorer.type}</div>
                  </div>
                </div>
                <span className="bg-accent-gold/20 text-accent-gold font-mono text-[10px] px-2.5 py-0.5 rounded font-bold uppercase border border-accent-gold/30">
                  TRAINED • BEST CKPT
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-[#141110]/70 p-3 rounded-lg border border-white/5">
                  <div className="text-text-muted text-[10px]">Spearman Correlation (ρ)</div>
                  <div className="text-2xl font-bold text-accent-gold mt-0.5">
                    {status.gnn_scorer.spearman_rank_correlation}
                  </div>
                  <div className="text-[10px] text-text-muted">Near-Monotonic Alignment</div>
                </div>
                <div className="bg-[#141110]/70 p-3 rounded-lg border border-white/5">
                  <div className="text-text-muted text-[10px]">Validation Loss (Huber)</div>
                  <div className="text-2xl font-bold text-text-primary mt-0.5">
                    {status.gnn_scorer.validation_loss}
                  </div>
                  <div className="text-[10px] text-text-muted">Smooth L1 (β=0.5)</div>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono text-text-secondary">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Dual Graph Encoders:</span>
                  <span className="text-text-primary">HardwareGraph + CircuitGraph</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Candidate Layout Dataset:</span>
                  <span className="text-text-primary">{status.gnn_scorer.training_samples} Diverse Graph Pairs</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Dead Qubits Isolated:</span>
                  <span className="text-[#D98282] font-bold">113, 121, 131, 146 (0% Placement)</span>
                </div>
              </div>
            </div>

            {/* LSTM Drift Forecaster Card */}
            <div className="glass-panel p-6 rounded-2xl border border-accent-amber/30 space-y-5 relative overflow-hidden shadow-amber-glow">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent-amber/20 flex items-center justify-center text-accent-amber">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-sm text-text-primary">{status.drift_forecaster.name}</h3>
                    <div className="text-[10px] text-text-muted font-mono">{status.drift_forecaster.type}</div>
                  </div>
                </div>
                <span className="bg-accent-amber/20 text-accent-amber font-mono text-[10px] px-2.5 py-0.5 rounded font-bold uppercase border border-accent-amber/30">
                  TRAINED • BEST CKPT
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-[#141110]/70 p-3 rounded-lg border border-white/5">
                  <div className="text-text-muted text-[10px]">Qubit MAE Gain</div>
                  <div className="text-2xl font-bold text-accent-amber mt-0.5">
                    {status.drift_forecaster.qubit_mae_gain_over_persistence}
                  </div>
                  <div className="text-[10px] text-text-muted">vs. Naive Persistence</div>
                </div>
                <div className="bg-[#141110]/70 p-3 rounded-lg border border-white/5">
                  <div className="text-text-muted text-[10px]">Coupler MAE Gain</div>
                  <div className="text-2xl font-bold text-accent-gold mt-0.5">
                    {status.drift_forecaster.coupler_mae_gain_over_persistence}
                  </div>
                  <div className="text-[10px] text-text-muted">Log-Space Stabilized</div>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono text-text-secondary">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Training Telemetry:</span>
                  <span className="text-text-primary">{status.drift_forecaster.training_sequences} Sequences</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Validation Telemetry:</span>
                  <span className="text-text-primary">{status.drift_forecaster.validation_sequences} Sequences</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Temporal Lookback:</span>
                  <span className="text-text-primary">{status.drift_forecaster.lookback_window} Days Sliding Window</span>
                </div>
              </div>
            </div>
          </div>

          {/* Architecture Specification */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
            <h3 className="font-mono font-bold text-base text-text-primary flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent-gold" />
              Machine Learning Architecture Specifications
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-text-secondary">
              <div className="p-4 rounded-xl bg-[#141110]/80 border border-white/5 space-y-3">
                <h4 className="font-mono font-bold text-accent-gold uppercase text-xs">
                  Dual-Encoder GNN Pipeline
                </h4>
                <p className="leading-relaxed font-sans">
                  The model takes two heterogeneous graphs: the physical hardware topology G_H and the logical circuit interaction DAG G_C. Both graphs are embedded through node-level and edge-level graph convolutions, pooled into latent space vectors, and concatenated to estimate mapping suitability.
                </p>
                <div className="font-mono text-[11px] text-text-muted space-y-1">
                  <div>• Optimizer: AdamW (lr=0.001, weight_decay=1e-4)</div>
                  <div>• Regularization: Dropout (0.15) + LayerNorm</div>
                  <div>• Training Samples: 570 diverse graph pairs</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#141110]/80 border border-white/5 space-y-3">
                <h4 className="font-mono font-bold text-accent-amber uppercase text-xs">
                  Residual LSTM Temporal Forecaster
                </h4>
                <p className="leading-relaxed font-sans">
                  The temporal forecaster uses a residual additive formulation: y_hat(t+1) = y(t) + f_theta(y_t). Rather than predicting raw values directly, the network learns the drift deviation over historical 5-day windows.
                </p>
                <div className="font-mono text-[11px] text-text-muted space-y-1">
                  <div>• Hidden Dimension: 64 units across 2 LSTM layers</div>
                  <div>• Coupler Space: Logarithmic log10(error + 1e-7)</div>
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
