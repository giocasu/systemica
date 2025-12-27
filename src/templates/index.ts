import { Node, Edge } from '@xyflow/react';
import { NodeData } from '../types';
import { EdgeData } from '../store/simulatorStore';

export interface GameTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
}

// Helper to create node data
const createNodeData = (
  label: string,
  nodeType: NodeData['nodeType'],
  overrides: Partial<NodeData> = {}
): NodeData => ({
  label,
  nodeType,
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
  ...overrides,
});

// Helper to create edge
const createEdge = (
  id: string,
  source: string,
  target: string,
  flowRate: number = 1
): Edge<EdgeData> => ({
  id,
  source,
  target,
  type: 'smoothstep',
  animated: true,
  style: { stroke: '#e94560', strokeWidth: 2 },
  data: { flowRate },
  label: flowRate.toString(),
  labelStyle: { fill: '#fff', fontWeight: 700 },
  labelBgStyle: { fill: '#e94560', fillOpacity: 0.8 },
  labelBgPadding: [4, 2] as [number, number],
  labelBgBorderRadius: 4,
});

// ============================================
// TEMPLATE 1: Loot System
// ============================================
const lootSystemTemplate: GameTemplate = {
  id: 'loot-system',
  name: 'Loot System',
  icon: '🗡️',
  description: 'Enemy drops gold into player inventory',
  nodes: [
    {
      id: 'enemy',
      type: 'source',
      position: { x: 100, y: 150 },
      data: createNodeData('Enemy Drops', 'source', { productionRate: 5 }),
    },
    {
      id: 'loot',
      type: 'pool',
      position: { x: 350, y: 150 },
      data: createNodeData('Loot Pool', 'pool', { resources: 0, capacity: 100 }),
    },
    {
      id: 'inventory',
      type: 'pool',
      position: { x: 600, y: 150 },
      data: createNodeData('Player Inventory', 'pool', { resources: 50, capacity: 500 }),
    },
  ],
  edges: [
    createEdge('e1', 'enemy', 'loot', 5),
    createEdge('e2', 'loot', 'inventory', 3),
  ],
};

// ============================================
// TEMPLATE 2: Energy Regen System
// ============================================
const energyRegenTemplate: GameTemplate = {
  id: 'energy-regen',
  name: 'Energy Regen',
  icon: '⚡',
  description: 'Stamina regenerates over time, consumed by actions',
  nodes: [
    {
      id: 'regen',
      type: 'source',
      position: { x: 100, y: 150 },
      data: createNodeData('Regen', 'source', { productionRate: 2 }),
    },
    {
      id: 'stamina',
      type: 'pool',
      position: { x: 350, y: 150 },
      data: createNodeData('Stamina', 'pool', { resources: 100, capacity: 100 }),
    },
    {
      id: 'action',
      type: 'drain',
      position: { x: 600, y: 150 },
      data: createNodeData('Actions', 'drain', { consumptionRate: 5 }),
    },
  ],
  edges: [
    createEdge('e1', 'regen', 'stamina', 2),
    createEdge('e2', 'stamina', 'action', 5),
  ],
};

// ============================================
// TEMPLATE 3: Crafting System
// ============================================
const craftingTemplate: GameTemplate = {
  id: 'crafting',
  name: 'Crafting',
  icon: '🔨',
  description: 'Combine materials to create items',
  nodes: [
    {
      id: 'wood-source',
      type: 'source',
      position: { x: 50, y: 50 },
      data: createNodeData('Forest', 'source', { productionRate: 2 }),
    },
    {
      id: 'wood',
      type: 'pool',
      position: { x: 250, y: 50 },
      data: createNodeData('Wood', 'pool', { resources: 20, capacity: 50 }),
    },
    {
      id: 'iron-source',
      type: 'source',
      position: { x: 50, y: 250 },
      data: createNodeData('Mine', 'source', { productionRate: 1 }),
    },
    {
      id: 'iron',
      type: 'pool',
      position: { x: 250, y: 250 },
      data: createNodeData('Iron', 'pool', { resources: 10, capacity: 30 }),
    },
    {
      id: 'forge',
      type: 'converter',
      position: { x: 450, y: 150 },
      data: createNodeData('Forge', 'converter', { inputRatio: 3, outputRatio: 1 }),
    },
    {
      id: 'swords',
      type: 'pool',
      position: { x: 650, y: 150 },
      data: createNodeData('Swords', 'pool', { resources: 0, capacity: 20 }),
    },
  ],
  edges: [
    createEdge('e1', 'wood-source', 'wood', 2),
    createEdge('e2', 'iron-source', 'iron', 1),
    createEdge('e3', 'wood', 'forge', 2),
    createEdge('e4', 'iron', 'forge', 1),
    createEdge('e5', 'forge', 'swords', 1),
  ],
};

// ============================================
// TEMPLATE 4: Economy Loop
// ============================================
const economyLoopTemplate: GameTemplate = {
  id: 'economy-loop',
  name: 'Economy Loop',
  icon: '💰',
  description: 'Player earns, spends, shop restocks',
  nodes: [
    {
      id: 'job',
      type: 'source',
      position: { x: 100, y: 100 },
      data: createNodeData('Job/Quest', 'source', { productionRate: 10 }),
    },
    {
      id: 'wallet',
      type: 'pool',
      position: { x: 350, y: 100 },
      data: createNodeData('Player Wallet', 'pool', { resources: 100, capacity: 1000 }),
    },
    {
      id: 'shop',
      type: 'pool',
      position: { x: 600, y: 100 },
      data: createNodeData('Shop', 'pool', { resources: 500, capacity: -1 }),
    },
    {
      id: 'items',
      type: 'pool',
      position: { x: 350, y: 300 },
      data: createNodeData('Player Items', 'pool', { resources: 0, capacity: 50 }),
    },
    {
      id: 'stock',
      type: 'source',
      position: { x: 600, y: 300 },
      data: createNodeData('Supplier', 'source', { productionRate: 2 }),
    },
  ],
  edges: [
    createEdge('e1', 'job', 'wallet', 10),
    createEdge('e2', 'wallet', 'shop', 5),
    createEdge('e3', 'shop', 'items', 1),
    createEdge('e4', 'stock', 'shop', 2),
  ],
};

// ============================================
// TEMPLATE 5: Mana System
// ============================================
const manaSystemTemplate: GameTemplate = {
  id: 'mana-system',
  name: 'Mana System',
  icon: '🔮',
  description: 'Mana regenerates slowly, spells consume it',
  nodes: [
    {
      id: 'mana-regen',
      type: 'source',
      position: { x: 100, y: 100 },
      data: createNodeData('Mana Regen', 'source', { productionRate: 1 }),
    },
    {
      id: 'mana-pool',
      type: 'pool',
      position: { x: 350, y: 100 },
      data: createNodeData('Mana', 'pool', { resources: 50, capacity: 100 }),
    },
    {
      id: 'spell-small',
      type: 'drain',
      position: { x: 550, y: 50 },
      data: createNodeData('Small Spell', 'drain', { consumptionRate: 5 }),
    },
    {
      id: 'spell-big',
      type: 'drain',
      position: { x: 550, y: 200 },
      data: createNodeData('Big Spell', 'drain', { consumptionRate: 20 }),
    },
    {
      id: 'mana-potion',
      type: 'pool',
      position: { x: 100, y: 250 },
      data: createNodeData('Mana Potions', 'pool', { resources: 5, capacity: 10 }),
    },
  ],
  edges: [
    createEdge('e1', 'mana-regen', 'mana-pool', 1),
    createEdge('e2', 'mana-pool', 'spell-small', 5),
    createEdge('e3', 'mana-pool', 'spell-big', 20),
    createEdge('e4', 'mana-potion', 'mana-pool', 25),
  ],
};

// Export all templates
export const templates: GameTemplate[] = [
  lootSystemTemplate,
  energyRegenTemplate,
  craftingTemplate,
  economyLoopTemplate,
  manaSystemTemplate,
];

export const getTemplateById = (id: string): GameTemplate | undefined => {
  return templates.find(t => t.id === id);
};
