// Node types
export type NodeType = 'source' | 'pool' | 'drain' | 'converter' | 'gate' | 'trader';

// Processing mode: fixed rate, formula expression, or full script
export type ProcessingMode = 'fixed' | 'formula' | 'script';

// Source activation mode: automatic per tick or manual click
export type ActivationMode = 'auto' | 'manual';

// Distribution mode: how resources are distributed to multiple outputs
// continuous: divisible resources (water, energy) - split equally
// discrete: atomic resources (items, cards) - round robin
export type DistributionMode = 'continuous' | 'discrete';

// ============================================================================
// TOKEN TYPES - Resource types that flow through the system
// ============================================================================

/**
 * Predefined token colors (matching Machinations style).
 */
export type PredefinedTokenColor = 'black' | 'blue' | 'green' | 'orange' | 'red';

/**
 * Token definition - a type of resource that can flow through the system.
 * 
 * - Predefined: 5 colors (Black, Blue, Green, Orange, Red)
 * - Custom: User-defined with emoji, name, and color
 */
export interface TokenDefinition {
  id: string;                    // Unique ID (e.g., "black", "gold", "sword_1")
  name: string;                  // Display name (e.g., "Black", "Gold", "Sword")
  color: string;                 // Hex color (e.g., "#1a1a2e", "#FFD700")
  emoji?: string;                // Optional emoji (e.g., "⚫", "🪙", "⚔️")
  isCustom: boolean;             // false for predefined, true for custom
  isDefault?: boolean;           // If this is the default token for new Sources
}

/**
 * Typed resources: map of tokenId → quantity.
 * Used by Pool, Drain, and Converter to track multiple resource types.
 * 
 * Example: { black: 10, gold: 5, sword: 2 }
 */
export type TypedResources = Record<string, number>;

/**
 * Converter recipe: defines input requirements and output production.
 * 
 * Example: 2 Iron + 3 Wood → 1 Sword
 * {
 *   inputs: [{ tokenId: 'iron', amount: 2 }, { tokenId: 'wood', amount: 3 }],
 *   outputs: [{ tokenId: 'sword', amount: 1 }]
 * }
 */
export interface ConverterRecipe {
  inputs: Array<{ tokenId: string; amount: number }>;
  outputs: Array<{ tokenId: string; amount: number }>;
}

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
  // Source activation mode
  activationMode?: ActivationMode;
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
  
  // ============================================================================
  // TOKEN SYSTEM - Multi-resource type support
  // ============================================================================
  
  // Source: type of token this source produces (e.g., "black", "gold")
  tokenType: string;
  
  // Pool/Drain/Converter: typed resources map (tokenId → quantity)
  // Example: { black: 10, gold: 5, sword: 2 }
  typedResources: TypedResources;
  
  // Converter: recipe for multi-token conversion
  // Example: 2 iron + 3 wood → 1 sword
  recipe?: ConverterRecipe;
  
  // ============================================================================
  // TRADER - Cross-exchange node
  // ============================================================================
  
  // Trader: accumulated resources from input A (top handle)
  traderInputA?: number;
  // Trader: accumulated resources from input B (bottom handle)
  traderInputB?: number;
  // Trader: typed resources from input A
  traderTypedA?: TypedResources;
  // Trader: typed resources from input B  
  traderTypedB?: TypedResources;
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
    activationMode: 'auto',
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
    // Token system
    tokenType: 'black',
    typedResources: {},
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
    // Token system
    tokenType: 'black',
    typedResources: {},
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
    // Token system
    tokenType: 'black',
    typedResources: {},
  },
  converter: {
    resources: 0,
    capacity: 10,
    productionRate: 0,
    consumptionRate: 0,
    isActive: true,
    inputRatio: 2,          // requires 2 input (legacy, use recipe for multi-token)
    outputRatio: 1,         // produces 1 output (legacy, use recipe for multi-token)
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
    // Token system
    tokenType: 'black',
    typedResources: {},
    recipe: undefined,
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
    // Token system
    tokenType: 'black',
    typedResources: {},
  },
  trader: {
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
    // Token system
    tokenType: 'black',
    typedResources: {},
    // Trader specific: accumulated resources from each input handle
    traderInputA: 0,
    traderInputB: 0,
  },
};

// Node visual config
export const nodeConfig: Record<NodeType, { icon: string; label: string }> = {
  source: { icon: '⬆️', label: 'Source' },
  pool: { icon: '🔵', label: 'Pool' },
  drain: { icon: '⬇️', label: 'Drain' },
  converter: { icon: '🔄', label: 'Converter' },
  gate: { icon: '🚪', label: 'Gate' },
  trader: { icon: '⇄', label: 'Trader' },
};
