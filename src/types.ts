// Node types
export type NodeType = 'source' | 'pool' | 'drain' | 'converter' | 'gate';

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
  // Custom formula for production (overrides productionRate if set)
  formula: string;          // e.g., "resources * 0.1" or "10 + tick * 0.5"
  useFormula: boolean;      // whether to use formula instead of fixed rate
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
    formula: '',
    useFormula: false,
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
    formula: '',
    useFormula: false,
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
    formula: '',
    useFormula: false,
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
    formula: '',
    useFormula: false,
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
    formula: '',
    useFormula: false,
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
