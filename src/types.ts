// Node types
export type NodeType = 'source' | 'pool' | 'drain' | 'converter' | 'gate';

// Processing mode: fixed rate, formula expression, or full script
export type ProcessingMode = 'fixed' | 'formula' | 'script';

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
  },
  pool: {
    resources: 10,
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
