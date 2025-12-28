// Node types
export type NodeType = 'source' | 'pool' | 'drain' | 'converter' | 'gate';

// Processing mode: fixed rate, formula expression, or full script
export type ProcessingMode = 'fixed' | 'formula' | 'script';

// Distribution mode: how resources are distributed to multiple outputs
// continuous: divisible resources (water, energy) - split equally
// discrete: atomic resources (items, cards) - round robin
export type DistributionMode = 'continuous' | 'discrete';

// Node data stored in React Flow nodes
export interface NodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeType;
  resources: number;
  capacity: number;         // -1 for unlimited
  productionRate: number;   // resources per tick
  consumptionRate: number;  // for drains
  isActive: boolean;
  // Converter specific
  inputRatio: number;       // input resources needed
  outputRatio: number;      // output resources produced
  // Probability (0-100) - chance of activation per tick
  probability: number;
  // Gate specific - condition for flow
  gateCondition: 'always' | 'if_above' | 'if_below';
  gateThreshold: number;    // threshold for condition
  // Processing mode
  processingMode: ProcessingMode;
  // Formula for 'formula' mode (simple expression)
  formula: string;          // e.g., "resources * 0.1" or "10 + tick * 0.5"
  useFormula: boolean;      // DEPRECATED: use processingMode instead
  // Script for 'script' mode (full JavaScript in sandbox)
  script: string;           // Full JS code with access to getNode(), state, etc.
  // Persistent state for scripts (survives between ticks)
  scriptState: Record<string, unknown>;
  // Distribution mode for sources: continuous (divisible) or discrete (atomic)
  distributionMode: DistributionMode;
  // Index for round-robin distribution (discrete mode)
  lastDistributionIndex: number;
  // Source: max total production (-1 = infinite)
  maxProduction: number;
  // Source: counter of total produced
  totalProduced: number;
  // Drain: consumed in the last tick (for UI feedback)
  lastConsumed?: number;
  // Source: produced in the last tick (for UI feedback)
  lastProduced?: number;
  // Pool: received in the last tick (for UI feedback)
  lastReceived?: number;
  // Converter: output in the last tick (for UI feedback)
  lastConverted?: number;
  // Generic: sent out in the last tick (for UI feedback)
  lastSent?: number;
}

// Default values for each node type
export const nodeDefaults: Record<NodeType, Partial<NodeData>> = {
  source: {
    resources: 0,
    capacity: -1,
    productionRate: 1,
    consumptionRate: 0,
    isActive: true,
    inputRatio: 1,
    outputRatio: 1,
    probability: 100,
    processingMode: 'fixed',
    formula: '',
    useFormula: false,
    script: '',
    scriptState: {},
    distributionMode: 'continuous',
    lastDistributionIndex: 0,
    maxProduction: -1,
    totalProduced: 0,
    lastProduced: 0,
    lastSent: 0,
  },
  pool: {
    resources: 0,
    capacity: 100,
    productionRate: 0,
    consumptionRate: 0,
    isActive: true,
    inputRatio: 1,
    outputRatio: 1,
    probability: 100,
    processingMode: 'fixed',
    formula: '',
    useFormula: false,
    script: '',
    scriptState: {},
    distributionMode: 'continuous',
    lastDistributionIndex: 0,
    maxProduction: -1,
    totalProduced: 0,
    lastReceived: 0,
    lastSent: 0,
  },
  drain: {
    resources: 0,
    capacity: -1,
    productionRate: 0,
    consumptionRate: 1,
    isActive: true,
    inputRatio: 1,
    outputRatio: 1,
    probability: 100,
    processingMode: 'fixed',
    formula: '',
    useFormula: false,
    script: '',
    scriptState: {},
    distributionMode: 'continuous',
    lastDistributionIndex: 0,
    maxProduction: -1,
    totalProduced: 0,
    lastConsumed: 0,
    lastSent: 0,
  },
  converter: {
    resources: 0,
    capacity: 10,
    productionRate: 0,
    consumptionRate: 0,
    isActive: true,
    inputRatio: 2,          // requires 2 input
    outputRatio: 1,         // produces 1 output
    probability: 100,
    processingMode: 'fixed',
    formula: '',
    useFormula: false,
    script: '',
    scriptState: {},
    distributionMode: 'continuous',
    lastDistributionIndex: 0,
    maxProduction: -1,
    totalProduced: 0,
    lastConverted: 0,
    lastSent: 0,
  },
  gate: {
    resources: 0,
    capacity: -1,
    productionRate: 0,
    consumptionRate: 0,
    isActive: true,
    inputRatio: 1,
    outputRatio: 1,
    probability: 100,
    gateCondition: 'always',
    gateThreshold: 0,
    processingMode: 'fixed',
    formula: '',
    useFormula: false,
    script: '',
    scriptState: {},
    distributionMode: 'continuous',
    lastDistributionIndex: 0,
    maxProduction: -1,
    totalProduced: 0,
    lastSent: 0,
  },
};

// Node visual config
export const nodeConfig: Record<NodeType, { icon: string; label: string }> = {
  source: { icon: '⬆️', label: 'Source' },
  pool: { icon: '🔵', label: 'Pool' },
  drain: { icon: '⬇️', label: 'Drain' },
  converter: { icon: '🔄', label: 'Converter' },
  gate: { icon: '🚪', label: 'Gate' },
};
