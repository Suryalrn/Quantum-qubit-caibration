export interface BackendMetadata {
  id: string;
  name: string;
  family: string;
  qubits: number;
  couplers: number;
  basis_gates: string[];
  native_2q_gate: string;
  calibration_timestamp: string;
  status: string;
  is_active: boolean;
}

export interface QubitNode {
  id: number;
  label: string;
  x2d: number;
  y2d: number;
  x3d: number;
  y3d: number;
  z3d: number;
  t1_us: number;
  t2_us: number;
  readout_error_pct: number;
  readout_length_ns: number;
  status: "operational" | "dead" | "degraded";
  error_tier: "optimal" | "warning" | "critical";
}

export interface CouplerEdge {
  source: number;
  target: number;
  key: string;
  cz_error_pct: number;
  duration_ns: number;
  is_primary: boolean;
  status: "operational" | "broken";
}

export interface TopologyData {
  backend_id: string;
  total_qubits: number;
  total_edges: number;
  nodes: QubitNode[];
  edges: CouplerEdge[];
}

export interface CalibrationKPIs {
  total_qubits: number;
  operational_qubits: number;
  dead_qubits: number;
  avg_t1_us: number;
  avg_t2_us: number;
  avg_readout_error_pct: number;
  avg_cz_error_pct: number;
  min_cz_error_pct: number;
  max_cz_error_pct: number;
  timestamp: string;
}

export interface QubitRanking {
  qubit_id: number;
  t1_us: number;
  t2_us: number;
  readout_error_pct: number;
  quality_score: number;
  tier: "A" | "B" | "C" | "DEAD";
}

export interface HistogramBin {
  bin_start: number;
  bin_end: number;
  count: number;
}

export interface AnalyticsData {
  kpis: CalibrationKPIs;
  distributions: {
    t1: HistogramBin[];
    t2: HistogramBin[];
    readout_error: HistogramBin[];
    cz_error: HistogramBin[];
  };
  rankings: QubitRanking[];
}

export interface DriftTrajectory {
  date: string;
  mean_t1_us: number;
  mean_t2_us: number;
  mean_cz_error_pct: number;
}

export interface DriftData {
  is_trained: boolean;
  model_architecture: string;
  lookback_days: number;
  qubit_branch: {
    metrics: string[];
    naive_persistence_mae: number;
    lstm_model_mae: number;
    accuracy_gain_pct: number;
  };
  coupler_branch: {
    metrics: string[];
    naive_persistence_mae: number;
    lstm_model_mae: number;
    accuracy_gain_pct: number;
  };
}

export interface ModelsStatus {
  gnn_scorer: {
    name: string;
    type: string;
    encoders: string[];
    spearman_rank_correlation: number;
    validation_loss: number;
    training_samples: number;
    dead_qubits_isolated: number[];
    is_trained: boolean;
  };
  drift_forecaster: {
    name: string;
    type: string;
    training_sequences: number;
    validation_sequences: number;
    lookback_window: number;
    qubit_mae_gain_over_persistence: string;
    coupler_mae_gain_over_persistence: string;
    is_trained: boolean;
  };
}

export interface CircuitInfo {
  circuit_id: string;
  name: string;
  algorithm: string;
  qubits: number;
  total_gates: number;
  depth: number;
}

export interface RoutingResult {
  circuit_id: string;
  method: string;
  num_qubits: number;
  initial_layout: Record<number, number>;
  caliroute_fidelity: number;
  caliroute_log_fidelity: number;
  caliroute_2q_gates: number;
  caliroute_depth: number;
  caliroute_faulty_gates: number;
  error_breakdown?: {
    p_gate_survival: number;
    p_readout_survival: number;
    p_decoherence_survival: number;
    makespan_us: number;
  };
  sabre_comparison: {
    sabre_fidelity: number;
    sabre_2q_gates: number;
    sabre_depth?: number;
    sabre_faulty_gates: number;
    fidelity_ratio_cr_over_sabre: number;
    dead_qubit_avoided: boolean;
  };
}

export interface BenchmarkRecord {
  circuit_id: string;
  num_qubits: number;
  sabre_fidelity: number;
  caliroute_static_fidelity: number;
  caliroute_stale_fidelity: number;
  caliroute_drift_aware_fidelity: number;
  fidelity_gain_over_stale_pct: number;
  fidelity_ratio_drift_over_sabre: number;
  caliroute_2q_gates: number;
  sabre_2q_gates: number;
  caliroute_depth: number;
  sabre_depth: number;
  caliroute_faulty_gates: number;
  sabre_faulty_gates: number;
}
