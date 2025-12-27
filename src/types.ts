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
  },
  pool: {
    resources: 10,
    capacity: 100,
    productionRate: 0,
    consumptionRate: 0,
    isActive: true,
    inputRatio: 1,
    outputRatio: 1,
  },
  drain: {
    resources: 0,
    capacity: -1,
    productionRate: 0,
    consumptionRate: 1,
    isActive: true,
    inputRatio: 1,
    outputRatio: 1,
  },
  converter: {
    resources: 0,
    capacity: 10,
    productionRate: 0,
    consumptionRate: 0,
    isActive: true,
    inputRatio: 2,          // requires 2 input
    outputRatio: 1,         // produces 1 output
  },
  gate: {
    resources: 0,
    capacity: -1,
    productionRate: 0,
    consumptionRate: 0,
    isActive: true,
    inputRatio: 1,
    outputRatio: 1,
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
