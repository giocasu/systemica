import { create } from 'zustand';
import {
  Node,
  Edge,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import { NodeData, NodeType, nodeDefaults, TypedResources } from '../types';
import { getTemplateById } from '../templates';
import { evaluateFormula } from '../utils/formulaEvaluator';
import { executeBatchScripts, BatchScriptEntry } from '../utils/scriptRunner';
import { 
  getTotalResources, 
  addTokenResources, 
  removeTokenResources,
  getTokenResources 
} from '../utils/migration';
import { migrateNodes } from '../utils/migration';

// Edge data type
export interface EdgeData {
  flowRate: number;
  [key: string]: unknown;
}

// History state for undo/redo
interface HistoryState {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
}

// Clipboard for copy/paste
interface ClipboardData {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
}

// Resource history entry for charts
// Now includes both per-node totals and global token totals
export interface ResourceHistoryEntry {
  tick: number;
  [key: string]: number; // nodeId -> total, or `token:${tokenId}` -> global token total
}

// Project save format
export interface ProjectData {
  version: string;
  name: string;
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  createdAt: string;
  updatedAt: string;
}

interface SimulatorState {
  nodes: Node<NodeData>[];
  edges: Edge<EdgeData>[];
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isRunning: boolean;
  currentTick: number;
  
  // Simulation speed (ticks per second)
  ticksPerSecond: number;
  
  // History for undo/redo
  history: HistoryState[];
  historyIndex: number;
  
  // Clipboard
  clipboard: ClipboardData | null;
  
  // Resource history for charts
  resourceHistory: ResourceHistoryEntry[];
  
  // Actions
  onNodesChange: (changes: NodeChange<Node<NodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange<Edge<EdgeData>>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  updateEdgeData: (edgeId: string, data: Partial<EdgeData>) => void;
  setSelection: (nodeIds: string[], edgeIds: string[]) => void;
  clearSelection: () => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  deleteSelectedNode: () => void;
  deleteSelectedEdge: () => void;
  triggerSource: (nodeId: string) => void;
  clearCanvas: () => void;
  toggleRunning: () => void;
  tick: () => void;
  step: () => Promise<void>;
  reset: () => void;
  newProject: () => void;
  executeScriptsAsync: () => Promise<void>;
  
  // Simulation speed
  setTicksPerSecond: (tps: number) => void;
  
  // Undo/Redo
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Copy/Paste
  copySelected: () => void;
  paste: () => void;
  
  // Save/Load
  saveProject: (name: string) => ProjectData;
  loadProject: (data: ProjectData) => void;
  loadState: (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => void;
  exportToFile: (name: string) => void;
  importFromFile: (file: File) => Promise<void>;
  
  // Templates
  loadTemplate: (templateId: string) => void;
  
  // Export stats
  exportStatsToCSV: () => void;
}

let nodeIdCounter = 1;

const MAX_HISTORY = 50;
const HISTORY_DEBOUNCE_MS = 400;

let historyDebounceHandle: ReturnType<typeof setTimeout> | null = null;
const clearPendingHistoryCommit = () => {
  if (historyDebounceHandle) {
    clearTimeout(historyDebounceHandle);
    historyDebounceHandle = null;
  }
};

const scheduleHistoryCommit = (getState: () => SimulatorState) => {
  clearPendingHistoryCommit();
  historyDebounceHandle = setTimeout(() => {
    historyDebounceHandle = null;
    getState().pushHistory();
  }, HISTORY_DEBOUNCE_MS);
};

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeIds: [],
  selectedEdgeIds: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  isRunning: false,
  currentTick: 0,
  
  // Simulation speed
  ticksPerSecond: 1,
  
  // History
  history: [{ nodes: [], edges: [] }],
  historyIndex: 0,
  
  // Clipboard
  clipboard: null,
  
  // Resource history for charts
  resourceHistory: [],

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }));

    const shouldCommit = changes.some((c) => {
      if (c.type === 'position') return c.dragging === false;
      return c.type === 'remove';
    });
    if (shouldCommit) get().pushHistory();
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));

    const shouldCommit = changes.some((c) => c.type === 'remove');
    if (shouldCommit) get().pushHistory();
  },

  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#e94560', strokeWidth: 2 },
          data: { flowRate: 1 },
          label: '1',
          labelStyle: { fill: '#fff', fontWeight: 700 },
          labelBgStyle: { fill: '#e94560', fillOpacity: 0.8 },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
        },
        state.edges
      ),
    }));
    get().pushHistory();
  },

  addNode: (type, position) => {
    const id = `node_${nodeIdCounter++}`;
    const defaults = nodeDefaults[type];
    const initialResources = defaults.resources ?? 0;
    const tokenType = defaults.tokenType ?? 'black';
    
    // Sync typedResources with resources using the default token
    const initialTypedResources = initialResources > 0 
      ? { [tokenType]: initialResources }
      : {};
    
    const newNode: Node<NodeData> = {
      id,
      type,
      position,
      data: {
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${nodeIdCounter - 1}`,
        nodeType: type,
        resources: initialResources,
        capacity: defaults.capacity ?? -1,
        productionRate: defaults.productionRate ?? 0,
        consumptionRate: defaults.consumptionRate ?? 0,
        isActive: defaults.isActive ?? true,
        inputRatio: defaults.inputRatio ?? 1,
        outputRatio: defaults.outputRatio ?? 1,
        probability: defaults.probability ?? 100,
        activationMode: defaults.activationMode ?? 'auto',
        gateCondition: defaults.gateCondition ?? 'always',
        gateThreshold: defaults.gateThreshold ?? 0,
        formula: defaults.formula ?? '',
        useFormula: defaults.useFormula ?? false,
        processingMode: defaults.processingMode ?? 'fixed',
        script: defaults.script ?? '',
        scriptState: defaults.scriptState ?? {},
        distributionMode: defaults.distributionMode ?? 'continuous',
        lastDistributionIndex: defaults.lastDistributionIndex ?? 0,
        maxProduction: defaults.maxProduction ?? -1,
        totalProduced: defaults.totalProduced ?? 0,
        lastConsumed: defaults.lastConsumed ?? 0,
        lastProduced: defaults.lastProduced ?? 0,
        lastReceived: defaults.lastReceived ?? 0,
        lastConverted: defaults.lastConverted ?? 0,
        lastSent: defaults.lastSent ?? 0,
        // Token system
        tokenType: tokenType,
        typedResources: initialTypedResources,
        recipe: defaults.recipe,
      },
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
    }));
    get().pushHistory();
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    }));
    scheduleHistoryCommit(get);
  },

  updateEdgeData: (edgeId, data) => {
    set((state) => ({
      edges: state.edges.map((edge): Edge<EdgeData> =>
        edge.id === edgeId
          ? { 
              ...edge, 
              data: { 
                ...edge.data, 
                flowRate: data.flowRate ?? edge.data?.flowRate ?? 1,
              },
              label: (data.flowRate ?? edge.data?.flowRate ?? 1).toString(),
            }
          : edge
      ),
    }));
    scheduleHistoryCommit(get);
  },

  setSelection: (nodeIds, edgeIds) => {
    const singleNodeId = nodeIds.length === 1 && edgeIds.length === 0 ? nodeIds[0] : null;
    const singleEdgeId = edgeIds.length === 1 && nodeIds.length === 0 ? edgeIds[0] : null;

    set({
      selectedNodeIds: nodeIds,
      selectedEdgeIds: edgeIds,
      selectedNodeId: singleNodeId,
      selectedEdgeId: singleEdgeId,
    });
  },

  clearSelection: () => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
      edges: state.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
      selectedNodeIds: [],
      selectedEdgeIds: [],
      selectedNodeId: null,
      selectedEdgeId: null,
    }));
  },

  setSelectedNode: (nodeId) => {
    if (!nodeId) {
      get().clearSelection();
      return;
    }

    set((state) => ({
      nodes: state.nodes.map((n) => ({ ...n, selected: n.id === nodeId })),
      edges: state.edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
      selectedNodeIds: [nodeId],
      selectedEdgeIds: [],
      selectedNodeId: nodeId,
      selectedEdgeId: null,
    }));
  },

  setSelectedEdge: (edgeId) => {
    if (!edgeId) {
      get().clearSelection();
      return;
    }

    set((state) => ({
      nodes: state.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
      edges: state.edges.map((e) => ({ ...e, selected: e.id === edgeId })),
      selectedNodeIds: [],
      selectedEdgeIds: [edgeId],
      selectedNodeId: null,
      selectedEdgeId: edgeId,
    }));
  },

  deleteSelectedNode: () => {
    const { selectedNodeIds, nodes, edges } = get();
    if (selectedNodeIds.length === 0) return;

    const selectedSet = new Set(selectedNodeIds);
    set({
      nodes: nodes.filter((n) => !selectedSet.has(n.id)).map((n) => (n.selected ? { ...n, selected: false } : n)),
      edges: edges
        .filter((e) => !selectedSet.has(e.source) && !selectedSet.has(e.target))
        .map((e) => (e.selected ? { ...e, selected: false } : e)),
      selectedNodeIds: [],
      selectedEdgeIds: [],
      selectedNodeId: null,
      selectedEdgeId: null,
    });
    get().pushHistory();
  },

  deleteSelectedEdge: () => {
    const { selectedEdgeIds, edges } = get();
    if (selectedEdgeIds.length === 0) return;

    const selectedSet = new Set(selectedEdgeIds);
    set({
      edges: edges.filter((e) => !selectedSet.has(e.id)).map((e) => (e.selected ? { ...e, selected: false } : e)),
      selectedEdgeIds: [],
      selectedEdgeId: null,
    });
    get().pushHistory();
  },

  triggerSource: (nodeId) => {
    const { currentTick, isRunning } = get();
    if (!isRunning) return;

    set((state) => {
      let updated = false;

      const nextNodes = state.nodes.map((node) => {
        if (node.id !== nodeId) return node;
        if (node.data.nodeType !== 'source') return node;
        if (!node.data.isActive) return node;
        if ((node.data.activationMode ?? 'auto') !== 'manual') return node;

        const maxProd = node.data.maxProduction ?? -1;
        const totalProduced = node.data.totalProduced ?? 0;
        if (maxProd !== -1 && totalProduced >= maxProd) return node;

        const mode = node.data.processingMode || (node.data.useFormula ? 'formula' : 'fixed');
        let production: number;

        if (mode === 'formula' && node.data.formula) {
          const result = evaluateFormula(node.data.formula, {
            resources: node.data.resources,
            tick: currentTick,
            capacity: node.data.capacity,
            totalProduced,
          });
          production = result ?? node.data.productionRate;
        } else if (mode === 'script' && node.data.script) {
          const lastOutput = node.data.scriptState?.lastOutput;
          production = typeof lastOutput === 'number' ? lastOutput : node.data.productionRate;
        } else {
          production = node.data.productionRate;
        }

        if (!Number.isFinite(production) || production <= 0) return node;

        if (maxProd !== -1) {
          const remaining = maxProd - totalProduced;
          production = Math.min(production, remaining);
        }

        let nextResources = node.data.resources + production;
        const capacity = node.data.capacity ?? -1;
        let overflow = 0;
        if (capacity !== -1 && Number.isFinite(capacity)) {
          overflow = Math.max(0, nextResources - capacity);
          nextResources = Math.min(nextResources, capacity);
        }

        const actualProduced = Math.max(0, production - overflow);
        if (actualProduced <= 0) return node;

        updated = true;
        return {
          ...node,
          data: {
            ...node.data,
            resources: nextResources,
            totalProduced: totalProduced + actualProduced,
            lastProduced: actualProduced,
          },
        };
      });

      if (!updated) return state;
      return { nodes: nextNodes };
    });
  },

  clearCanvas: () => {
    const { nodes, edges } = get();
    if (nodes.length === 0 && edges.length === 0) return;

    clearPendingHistoryCommit();
    set({
      nodes: [],
      edges: [],
      selectedNodeIds: [],
      selectedEdgeIds: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      isRunning: false,
      currentTick: 0,
      resourceHistory: [],
    });
    get().pushHistory();
  },

  toggleRunning: () => {
    set((state) => ({ isRunning: !state.isRunning }));
    // The play loop in App.tsx handles executeScriptsAsync() before each tick
  },

  tick: () => {
    const { nodes, edges, currentTick } = get();

    // DEBUG: verify scriptState at the very start of tick
    for (const n of nodes) {
      if (n.data.scriptState?.lastOutput !== undefined) {
        console.log(`[tick] START get().nodes node ${n.id} lastOutput=`, n.data.scriptState.lastOutput);
      }
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, { ...n, data: { ...n.data, typedResources: { ...n.data.typedResources } } }]));
    for (const node of nodeMap.values()) {
      node.data.lastSent = 0;
      if (node.data.nodeType === 'source') node.data.lastProduced = 0;
      if (node.data.nodeType === 'pool') node.data.lastReceived = 0;
      if (node.data.nodeType === 'converter') node.data.lastConverted = 0;
      if (node.data.nodeType === 'drain') node.data.lastConsumed = 0;
    }

    // Snapshot typed resources at the start of the tick.
    // Transfers are computed from the snapshot and applied at the end of the tick (no multi-hop in one tick).
    const baseTypedResources = new Map<string, TypedResources>();
    for (const node of nodeMap.values()) {
      baseTypedResources.set(node.id, { ...node.data.typedResources });
    }

    // Legacy single-value resources for backward compat
    const baseResources = new Map<string, number>();
    for (const node of nodeMap.values()) baseResources.set(node.id, node.data.resources);

    // Typed deltas: nodeId -> { tokenId -> amount }
    const incomingTypedDelta = new Map<string, TypedResources>();
    const sentTypedAmount = new Map<string, TypedResources>();
    
    // Legacy single-value deltas (for backward compat)
    const incomingDelta = new Map<string, number>();
    const sentAmount = new Map<string, number>();
    const converterConsumed = new Map<string, TypedResources>();

    const addTypedIncoming = (nodeId: string, tokenId: string, amount: number) => {
      if (amount <= 0) return;
      const current = incomingTypedDelta.get(nodeId) ?? {};
      incomingTypedDelta.set(nodeId, addTokenResources(current, tokenId, amount));
      // Legacy
      incomingDelta.set(nodeId, (incomingDelta.get(nodeId) ?? 0) + amount);
    };

    const addTypedSent = (nodeId: string, tokenId: string, amount: number) => {
      if (amount <= 0) return;
      const current = sentTypedAmount.get(nodeId) ?? {};
      sentTypedAmount.set(nodeId, addTokenResources(current, tokenId, amount));
      // Legacy
      sentAmount.set(nodeId, (sentAmount.get(nodeId) ?? 0) + amount);
    };

    const getEffectiveTypedResources = (nodeId: string): TypedResources => {
      const base = baseTypedResources.get(nodeId) ?? {};
      const incoming = incomingTypedDelta.get(nodeId) ?? {};
      const result: TypedResources = { ...base };
      for (const [tokenId, amount] of Object.entries(incoming)) {
        result[tokenId] = (result[tokenId] ?? 0) + amount;
      }
      return result;
    };

    const getEffectiveTargetResources = (nodeId: string) => {
      return getTotalResources(getEffectiveTypedResources(nodeId));
    };

    const getTargetSpace = (target: Node<NodeData>) => {
      if (target.data.nodeType === 'drain') return Infinity;
      const cap = target.data.capacity ?? -1;
      if (cap === -1 || !Number.isFinite(cap)) return Infinity;
      return Math.max(0, cap - getEffectiveTargetResources(target.id));
    };

    const recordTypedTransfer = (from: Node<NodeData>, to: Node<NodeData>, tokenId: string, amount: number) => {
      if (amount <= 0) return;
      addTypedSent(from.id, tokenId, amount);
      from.data.lastSent = (from.data.lastSent ?? 0) + amount;

      addTypedIncoming(to.id, tokenId, amount);
      if (to.data.nodeType === 'drain') {
        to.data.lastConsumed = (to.data.lastConsumed ?? 0) + amount;
      } else if (to.data.nodeType === 'pool') {
        to.data.lastReceived = (to.data.lastReceived ?? 0) + amount;
      }
    };

    const checkProbability = (prob: number): boolean => Math.random() * 100 < prob;

    const getProductionRate = (node: Node<NodeData>): number => {
      const mode = node.data.processingMode || (node.data.useFormula ? 'formula' : 'fixed');

      if (mode === 'formula' && node.data.formula) {
        const result = evaluateFormula(node.data.formula, {
          resources: node.data.resources,
          tick: currentTick,
          capacity: node.data.capacity,
          totalProduced: node.data.totalProduced ?? 0,
        });
        return result ?? node.data.productionRate;
      }

      if (mode === 'script' && node.data.script) {
        const lastOutput = node.data.scriptState?.lastOutput;
        console.log(`[tick] Node ${node.id} scriptState:`, JSON.stringify(node.data.scriptState), 'lastOutput:', lastOutput, 'typeof:', typeof lastOutput);
        return typeof lastOutput === 'number' ? lastOutput : node.data.productionRate;
      }

      return node.data.productionRate;
    };

    // Phase 1: compute how much each Source produces THIS tick.
    const sourceProductionThisTick = new Map<string, number>();

    for (const node of nodeMap.values()) {
      if (node.data.nodeType !== 'source' || !node.data.isActive) continue;

      if ((node.data.activationMode ?? 'auto') === 'manual') {
        sourceProductionThisTick.set(node.id, 0);
        continue;
      }

      const maxProd = node.data.maxProduction ?? -1;
      const totalProduced = node.data.totalProduced ?? 0;

      if (maxProd !== -1 && totalProduced >= maxProd) {
        sourceProductionThisTick.set(node.id, 0);
        continue;
      }

      const prob = node.data.probability ?? 100;
      if (!checkProbability(prob)) {
        sourceProductionThisTick.set(node.id, 0);
        continue;
      }

      let production = getProductionRate(node);
      if (!Number.isFinite(production) || production <= 0) {
        sourceProductionThisTick.set(node.id, 0);
        continue;
      }

      if (maxProd !== -1) {
        const remaining = maxProd - totalProduced;
        production = Math.min(production, remaining);
      }

      sourceProductionThisTick.set(node.id, production);
    }

    // Group edges by source
    const edgesBySource = new Map<string, Edge<EdgeData>[]>();
    for (const edge of edges) {
      const sourceEdges = edgesBySource.get(edge.source) || [];
      sourceEdges.push(edge);
      edgesBySource.set(edge.source, sourceEdges);
    }

    // Phase 2: transfer along edges based on snapshot resources.
    // For Source: transfers the token type specified by tokenType
    // For Pool: transfers tokens proportionally (or by type if filtered)
    for (const [sourceId, outgoingEdges] of edgesBySource) {
      const source = nodeMap.get(sourceId);
      if (!source || !source.data.isActive) continue;

      // Skip nodes that have their own dedicated processing phase
      if (source.data.nodeType === 'converter' || source.data.nodeType === 'drain' || source.data.nodeType === 'trader' || source.data.nodeType === 'delay') continue;

      const isSourceNode = source.data.nodeType === 'source';

      const prob = source.data.probability ?? 100;
      if (!isSourceNode && !checkProbability(prob)) continue;

      if (source.data.nodeType === 'gate') {
        const condition = source.data.gateCondition ?? 'always';
        const threshold = source.data.gateThreshold ?? 0;
        const resources = baseResources.get(sourceId) ?? 0;

        if (condition === 'if_above' && resources <= threshold) continue;
        if (condition === 'if_below' && resources >= threshold) continue;
      }

      const productionThisTick = sourceProductionThisTick.get(sourceId) ?? 0;
      
      // For Source: determine token type and available amount
      // For Pool/Gate: get all typed resources
      let availableTyped: TypedResources;
      if (isSourceNode) {
        const tokenType = source.data.tokenType || 'black';
        const baseAmount = getTokenResources(baseTypedResources.get(sourceId) ?? {}, tokenType);
        availableTyped = { [tokenType]: baseAmount + productionThisTick };
      } else {
        availableTyped = { ...(baseTypedResources.get(sourceId) ?? {}) };
      }
      
      let available = getTotalResources(availableTyped);
      if (available <= 0) continue;

      const distributionMode = source.data.distributionMode ?? 'continuous';

      const validEdges: { target: Node<NodeData>; flowRate: number; targetSpace: number }[] = [];
      for (const edge of outgoingEdges) {
        const target = nodeMap.get(edge.target);
        if (!target) continue;

        const flowRate = (edge.data as { flowRate?: number })?.flowRate ?? 1;
        if (!Number.isFinite(flowRate) || flowRate <= 0) continue;

        const targetSpace = getTargetSpace(target);
        if (targetSpace > 0) validEdges.push({ target, flowRate, targetSpace });
      }

      if (validEdges.length === 0) continue;

      // Helper to transfer typed resources
      const transferTyped = (target: Node<NodeData>, totalAmount: number) => {
        if (totalAmount <= 0) return;
        
        // Round to integer
        let amountToTransfer = Math.floor(totalAmount);
        if (amountToTransfer <= 0) return;
        
        // For Source nodes: transfer only the tokenType
        if (isSourceNode) {
          const tokenType = source.data.tokenType || 'black';
          const avail = availableTyped[tokenType] ?? 0;
          const toTransfer = Math.min(avail, amountToTransfer);
          if (toTransfer > 0) {
            recordTypedTransfer(source, target, tokenType, toTransfer);
            availableTyped[tokenType] = (availableTyped[tokenType] ?? 0) - toTransfer;
            available -= toTransfer;
          }
          return;
        }
        
        // For Pool/Gate: transfer proportionally from available tokens (integers)
        const totalAvail = getTotalResources(availableTyped);
        if (totalAvail <= 0) return;
        
        // Transfer tokens one by one to maintain integer counts
        let transferred = 0;
        for (const [tokenId, tokenAmount] of Object.entries(availableTyped)) {
          if (tokenAmount <= 0 || transferred >= amountToTransfer) continue;
          const proportion = tokenAmount / totalAvail;
          const toTransfer = Math.min(Math.floor(tokenAmount), Math.floor(amountToTransfer * proportion));
          if (toTransfer > 0) {
            recordTypedTransfer(source, target, tokenId, toTransfer);
            availableTyped[tokenId] = (availableTyped[tokenId] ?? 0) - toTransfer;
            available -= toTransfer;
            transferred += toTransfer;
          }
        }
        
        // If we haven't transferred enough due to rounding, transfer remaining from largest token
        while (transferred < amountToTransfer) {
          const largestToken = Object.entries(availableTyped)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])[0];
          if (!largestToken) break;
          
          const [tokenId, tokenAmount] = largestToken;
          const toTransfer = Math.min(1, tokenAmount, amountToTransfer - transferred);
          if (toTransfer > 0) {
            recordTypedTransfer(source, target, tokenId, toTransfer);
            availableTyped[tokenId] = (availableTyped[tokenId] ?? 0) - toTransfer;
            available -= toTransfer;
            transferred += toTransfer;
          } else {
            break;
          }
        }
      };

      if (distributionMode === 'continuous') {
        // Continuous mode: fill each connection up to its flowRate, in order
        // First connection gets up to flowRate, then second, etc.
        // This respects flowRate as a "max capacity per tick" for each connection
        for (const { target, flowRate } of validEdges) {
          if (available <= 0) break;
          const actualFlow = Math.min(flowRate, getTargetSpace(target), available);
          if (actualFlow > 0) {
            transferTyped(target, actualFlow);
          }
        }
      } else {
        let lastIndex = source.data.lastDistributionIndex ?? 0;
        let remaining = Math.floor(available);

        while (remaining > 0 && validEdges.length > 0) {
          let found = false;

          for (let i = 0; i < validEdges.length; i++) {
            const idx = (lastIndex + i) % validEdges.length;
            const { target, flowRate, targetSpace } = validEdges[idx];

            const canSend = Math.min(1, flowRate, targetSpace, remaining);
            if (canSend >= 1) {
              transferTyped(target, 1);
              remaining -= 1;

              lastIndex = (idx + 1) % validEdges.length;
              found = true;

              validEdges[idx].targetSpace -= 1;
              if (validEdges[idx].targetSpace <= 0) {
                validEdges.splice(idx, 1);
                if (lastIndex > idx) lastIndex--;
                if (lastIndex >= validEdges.length) lastIndex = 0;
              }

              break;
            }
          }

          if (!found) break;
        }

        source.data.lastDistributionIndex = lastIndex;
      }
    }

    // Phase 3: converters transform input (snapshot) into output and distribute the produced output.
    // Supports both legacy single-ratio mode and new multi-token recipe mode.
    for (const node of nodeMap.values()) {
      if (node.data.nodeType !== 'converter' || !node.data.isActive) continue;

      const inputTyped = baseTypedResources.get(node.id) ?? {};
      const inputResources = getTotalResources(inputTyped);
      if (inputResources <= 0) continue;

      const mode = node.data.processingMode || (node.data.useFormula ? 'formula' : 'fixed');
      const recipe = node.data.recipe;

      // Output tokens and amounts to produce
      let outputTokens: TypedResources = {};
      let consumedTokens: TypedResources = {};
      let totalOutputAmount = 0;

      if (recipe && recipe.inputs.length > 0 && recipe.outputs.length > 0) {
        // Multi-token recipe mode
        // Calculate how many complete conversions we can do based on available inputs
        let maxConversions = Infinity;
        
        for (const input of recipe.inputs) {
          const available = getTokenResources(inputTyped, input.tokenId);
          const possible = Math.floor(available / input.amount);
          maxConversions = Math.min(maxConversions, possible);
        }
        
        if (maxConversions <= 0 || !Number.isFinite(maxConversions)) continue;
        
        // Calculate consumed inputs
        for (const input of recipe.inputs) {
          consumedTokens[input.tokenId] = input.amount * maxConversions;
        }
        
        // Calculate produced outputs
        for (const output of recipe.outputs) {
          outputTokens[output.tokenId] = (outputTokens[output.tokenId] ?? 0) + output.amount * maxConversions;
          totalOutputAmount += output.amount * maxConversions;
        }
      } else if (mode === 'formula' && node.data.formula) {
        // Formula mode - legacy single-token behavior
        const result = evaluateFormula(node.data.formula, {
          resources: inputResources,
          tick: currentTick,
          capacity: node.data.capacity,
          input: inputResources,
        });

        if (result === null || result <= 0) continue;
        
        // Transfer all input types proportionally to output as 'black' token
        outputTokens = { black: result };
        totalOutputAmount = result;
        consumedTokens = { ...inputTyped }; // Consume all
      } else if (mode === 'script' && node.data.script) {
        // Script mode - legacy single-token behavior
        const cachedOutput = node.data.scriptState?.lastOutput;
        if (typeof cachedOutput !== 'number' || cachedOutput <= 0) continue;
        
        outputTokens = { black: cachedOutput };
        totalOutputAmount = cachedOutput;
        consumedTokens = { ...inputTyped }; // Consume all
      } else {
        // Legacy fixed ratio mode - uses dominant token type
        const inputRatio = node.data.inputRatio ?? 2;
        const outputRatio = node.data.outputRatio ?? 1;
        const conversions = Math.floor(inputResources / inputRatio);
        if (conversions <= 0) continue;
        
        const outputAmount = conversions * outputRatio;
        const inputConsumed = conversions * inputRatio;
        
        // Output as dominant token type (or black)
        const dominantToken = Object.entries(inputTyped)
          .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'black';
        
        outputTokens = { [dominantToken]: outputAmount };
        totalOutputAmount = outputAmount;
        
        // Consume proportionally from all input tokens
        const consumeRatio = inputConsumed / inputResources;
        for (const [tokenId, amount] of Object.entries(inputTyped)) {
          consumedTokens[tokenId] = Math.floor(amount * consumeRatio);
        }
      }

      const outputEdges = edgesBySource.get(node.id) ?? [];
      if (outputEdges.length === 0) continue;

      const distributionMode = node.data.distributionMode ?? 'continuous';
      let outputAvailable = { ...outputTokens };
      let actualOutputUsed = 0;

      const validEdges: { target: Node<NodeData>; flowRate: number; targetSpace: number }[] = [];
      for (const edge of outputEdges) {
        const target = nodeMap.get(edge.target);
        if (!target) continue;

        const flowRate = (edge.data as { flowRate?: number })?.flowRate ?? 1;
        if (!Number.isFinite(flowRate) || flowRate <= 0) continue;

        const targetSpace = getTargetSpace(target);
        if (targetSpace > 0) validEdges.push({ target, flowRate, targetSpace });
      }

      if (validEdges.length === 0) continue;

      // Helper to transfer typed outputs
      const transferConverterOutput = (target: Node<NodeData>, totalAmount: number) => {
        if (totalAmount <= 0) return;
        
        const totalAvail = getTotalResources(outputAvailable);
        if (totalAvail <= 0) return;
        
        for (const [tokenId, tokenAmount] of Object.entries(outputAvailable)) {
          if (tokenAmount <= 0) continue;
          const proportion = tokenAmount / totalAvail;
          const toTransfer = Math.min(tokenAmount, totalAmount * proportion);
          if (toTransfer > 0) {
            recordTypedTransfer(node, target, tokenId, toTransfer);
            outputAvailable[tokenId] = (outputAvailable[tokenId] ?? 0) - toTransfer;
            actualOutputUsed += toTransfer;
          }
        }
      };

      if (distributionMode === 'continuous') {
        const totalFlowRates = validEdges.reduce((sum, e) => sum + e.flowRate, 0);
        const totalAvailableOutput = getTotalResources(outputAvailable);

        for (const { target, flowRate } of validEdges) {
          const proportion = flowRate / totalFlowRates;
          const allocated = totalAvailableOutput * proportion;
          const actualFlow = Math.min(allocated, flowRate, getTargetSpace(target), getTotalResources(outputAvailable));
          if (actualFlow > 0) {
            transferConverterOutput(target, actualFlow);
          }
        }
      } else {
        let lastIndex = node.data.lastDistributionIndex ?? 0;
        let remaining = Math.floor(getTotalResources(outputAvailable));

        while (remaining > 0 && validEdges.length > 0) {
          let found = false;

          for (let i = 0; i < validEdges.length; i++) {
            const idx = (lastIndex + i) % validEdges.length;
            const { target, flowRate, targetSpace } = validEdges[idx];

            const canSend = Math.min(1, flowRate, targetSpace, remaining);
            if (canSend >= 1) {
              transferConverterOutput(target, 1);
              remaining -= 1;

              lastIndex = (idx + 1) % validEdges.length;
              found = true;

              validEdges[idx].targetSpace -= 1;
              if (validEdges[idx].targetSpace <= 0) {
                validEdges.splice(idx, 1);
                if (lastIndex > idx) lastIndex--;
                if (lastIndex >= validEdges.length) lastIndex = 0;
              }

              break;
            }
          }

          if (!found) break;
        }

        node.data.lastDistributionIndex = lastIndex;
      }

      node.data.lastConverted = actualOutputUsed;

      // Store consumed tokens for end-of-tick processing
      // Scale consumed tokens by actual output ratio
      const outputRatioUsed = totalOutputAmount > 0 ? actualOutputUsed / totalOutputAmount : 0;
      const scaledConsumed: TypedResources = {};
      for (const [tokenId, amount] of Object.entries(consumedTokens)) {
        scaledConsumed[tokenId] = Math.floor(amount * outputRatioUsed);
      }
      converterConsumed.set(node.id, scaledConsumed);
    }

    // Phase 4: Traders exchange resources between two inputs and two outputs
    // Input A (top) → Output B (bottom) - cross exchange
    // Input B (bottom) → Output A (top) - cross exchange
    const traderConsumedA = new Map<string, TypedResources>();
    const traderConsumedB = new Map<string, TypedResources>();
    
    for (const node of nodeMap.values()) {
      if (node.data.nodeType !== 'trader' || !node.data.isActive) continue;

      const prob = node.data.probability ?? 100;
      if (!checkProbability(prob)) continue;

      // Find incoming edges by target handle
      const incomingEdges = edges.filter(e => e.target === node.id);
      const edgesToInputA = incomingEdges.filter(e => e.targetHandle === 'input-a');
      const edgesToInputB = incomingEdges.filter(e => e.targetHandle === 'input-b');
      
      // Find outgoing edges by source handle
      const outgoingEdges = edgesBySource.get(node.id) ?? [];
      const edgesFromOutputA = outgoingEdges.filter(e => e.sourceHandle === 'output-a');
      const edgesFromOutputB = outgoingEdges.filter(e => e.sourceHandle === 'output-b');
      
      // Calculate incoming resources from each input
      // (These come from snapshot, but we need to track what was sent TO the trader)
      let inputATyped: TypedResources = {};
      let inputBTyped: TypedResources = {};
      
      // Check what's being sent to this trader from other nodes
      for (const edge of edgesToInputA) {
        const sourceNode = nodeMap.get(edge.source);
        if (!sourceNode || !sourceNode.data.isActive) continue;
        
        const flowRate = (edge.data as { flowRate?: number })?.flowRate ?? 1;
        const sourceTyped = baseTypedResources.get(edge.source) ?? {};
        
        // Get available from source
        for (const [tokenId, amount] of Object.entries(sourceTyped)) {
          const toSend = Math.min(amount, flowRate);
          if (toSend > 0) {
            inputATyped[tokenId] = (inputATyped[tokenId] ?? 0) + toSend;
          }
        }
      }
      
      for (const edge of edgesToInputB) {
        const sourceNode = nodeMap.get(edge.source);
        if (!sourceNode || !sourceNode.data.isActive) continue;
        
        const flowRate = (edge.data as { flowRate?: number })?.flowRate ?? 1;
        const sourceTyped = baseTypedResources.get(edge.source) ?? {};
        
        for (const [tokenId, amount] of Object.entries(sourceTyped)) {
          const toSend = Math.min(amount, flowRate);
          if (toSend > 0) {
            inputBTyped[tokenId] = (inputBTyped[tokenId] ?? 0) + toSend;
          }
        }
      }
      
      // Cross exchange: Input A → Output B, Input B → Output A
      // Output A sends what came from Input B
      // Output B sends what came from Input A
      
      // Helper to send to targets
      const sendToTargets = (edgesList: Edge<EdgeData>[], available: TypedResources) => {
        let totalSent = 0;
        const consumed: TypedResources = {};
        
        for (const edge of edgesList) {
          const target = nodeMap.get(edge.target);
          if (!target) continue;
          
          const flowRate = (edge.data as { flowRate?: number })?.flowRate ?? 1;
          const targetSpace = getTargetSpace(target);
          if (targetSpace <= 0) continue;
          
          const totalAvail = getTotalResources(available);
          if (totalAvail <= 0) break;
          
          const toSend = Math.min(flowRate, targetSpace, totalAvail);
          if (toSend <= 0) continue;
          
          // Send proportionally from available
          for (const [tokenId, amount] of Object.entries(available)) {
            if (amount <= 0) continue;
            const proportion = amount / totalAvail;
            const tokenSend = Math.floor(toSend * proportion);
            if (tokenSend > 0) {
              recordTypedTransfer(node, target, tokenId, tokenSend);
              available[tokenId] = (available[tokenId] ?? 0) - tokenSend;
              consumed[tokenId] = (consumed[tokenId] ?? 0) + tokenSend;
              totalSent += tokenSend;
            }
          }
        }
        
        return { totalSent, consumed };
      };
      
      // Output A gets Input B's resources (cross)
      const outputAResult = sendToTargets(edgesFromOutputA, { ...inputBTyped });
      // Output B gets Input A's resources (cross)  
      const outputBResult = sendToTargets(edgesFromOutputB, { ...inputATyped });
      
      // Track what was consumed (for removing from sources)
      // Input A resources went to Output B
      traderConsumedA.set(node.id, outputBResult.consumed);
      // Input B resources went to Output A
      traderConsumedB.set(node.id, outputAResult.consumed);
      
      node.data.lastSent = outputAResult.totalSent + outputBResult.totalSent;
      
      // Update trader's internal buffers for display
      node.data.traderInputA = getTotalResources(inputATyped) - getTotalResources(outputBResult.consumed);
      node.data.traderInputB = getTotalResources(inputBTyped) - getTotalResources(outputAResult.consumed);
    }

    // Phase 5: Delays - hold resources for a number of ticks before releasing
    // Two modes: 
    // - 'delay': All resources are processed in parallel (each delayed independently)
    // - 'queue': Only one resource processed at a time (others wait in queue)
    // Supports formula/script for dynamic delay calculation
    const delayConsumed = new Map<string, TypedResources>();
    
    for (const node of nodeMap.values()) {
      if (node.data.nodeType !== 'delay' || !node.data.isActive) continue;

      const prob = node.data.probability ?? 100;
      if (!checkProbability(prob)) continue;

      const delayMode = node.data.delayMode ?? 'delay';
      let delayQueue = [...(node.data.delayQueue ?? [])];
      
      // Calculate delay ticks - can be fixed, formula, or script
      const mode = node.data.processingMode || 'fixed';
      let delayTicks: number;
      
      if (mode === 'formula' && node.data.formula) {
        // Formula mode: evaluate formula for delay
        // Available variables: tick, queueSize, resources
        const queueSize = delayQueue.reduce((sum, item) => sum + item.amount, 0);
        const result = evaluateFormula(node.data.formula, {
          tick: currentTick,
          queueSize,
          resources: node.data.resources,
          capacity: node.data.capacity,
        });
        delayTicks = Math.max(1, Math.round(result ?? node.data.delayTicks ?? 3));
      } else if (mode === 'script' && node.data.script) {
        // Script mode: use last output from script execution
        const lastOutput = node.data.scriptState?.lastOutput;
        delayTicks = Math.max(1, Math.round(typeof lastOutput === 'number' ? lastOutput : node.data.delayTicks ?? 3));
      } else {
        // Fixed mode
        delayTicks = node.data.delayTicks ?? 3;
      }
      
      // Store calculated delay for display
      node.data.calculatedDelay = delayTicks;
      
      // Find incoming and outgoing edges
      const incomingEdges = edges.filter(e => e.target === node.id);
      const outgoingEdges = edgesBySource.get(node.id) ?? [];
      
      // Step 1: Decrement ticksRemaining for all items in queue
      delayQueue = delayQueue.map(item => ({
        ...item,
        ticksRemaining: item.ticksRemaining - 1
      }));
      
      // Step 2: Release resources that have completed their delay (ticksRemaining <= 0)
      let totalOutput = 0;
      const readyToRelease = delayQueue.filter(item => item.ticksRemaining <= 0);
      delayQueue = delayQueue.filter(item => item.ticksRemaining > 0);
      
      // Send released resources to targets
      for (const releasedItem of readyToRelease) {
        let remaining = releasedItem.amount;
        const tokenType = releasedItem.tokenType ?? 'black';
        
        for (const edge of outgoingEdges) {
          if (remaining <= 0) break;
          
          const target = nodeMap.get(edge.target);
          if (!target) continue;
          
          const flowRate = (edge.data as { flowRate?: number })?.flowRate ?? 1;
          const targetSpace = getTargetSpace(target);
          if (targetSpace <= 0) continue;
          
          const toSend = Math.min(remaining, flowRate, targetSpace);
          if (toSend > 0) {
            recordTypedTransfer(node, target, tokenType, toSend);
            remaining -= toSend;
            totalOutput += toSend;
          }
        }
      }
      
      // Step 3: Accept new incoming resources
      let inputConsumed: TypedResources = {};
      
      for (const edge of incomingEdges) {
        const sourceNode = nodeMap.get(edge.source);
        if (!sourceNode || !sourceNode.data.isActive) continue;
        
        const flowRate = (edge.data as { flowRate?: number })?.flowRate ?? 1;
        const sourceTyped = baseTypedResources.get(edge.source) ?? {};
        
        for (const [tokenId, amount] of Object.entries(sourceTyped)) {
          let toAccept = Math.min(amount, flowRate);
          
          // In queue mode, only accept if nothing is currently being processed
          if (delayMode === 'queue') {
            const currentlyProcessing = delayQueue.reduce((sum, item) => sum + item.amount, 0);
            if (currentlyProcessing > 0) {
              // Add to waiting queue (ticksRemaining set to delayTicks + queue position)
              // This simulates waiting - we'll add with extra ticks
              const queuePosition = delayQueue.length;
              if (toAccept > 0) {
                delayQueue.push({
                  amount: toAccept,
                  ticksRemaining: delayTicks + (queuePosition * delayTicks),
                  tokenType: tokenId
                });
                inputConsumed[tokenId] = (inputConsumed[tokenId] ?? 0) + toAccept;
              }
            } else {
              // Queue is empty, start processing immediately
              if (toAccept > 0) {
                delayQueue.push({
                  amount: toAccept,
                  ticksRemaining: delayTicks,
                  tokenType: tokenId
                });
                inputConsumed[tokenId] = (inputConsumed[tokenId] ?? 0) + toAccept;
              }
            }
          } else {
            // Delay mode: all resources are processed in parallel
            if (toAccept > 0) {
              delayQueue.push({
                amount: toAccept,
                ticksRemaining: delayTicks,
                tokenType: tokenId
              });
              inputConsumed[tokenId] = (inputConsumed[tokenId] ?? 0) + toAccept;
            }
          }
        }
      }
      
      // Track what was consumed from sources
      delayConsumed.set(node.id, inputConsumed);
      
      // Update node data
      node.data.delayQueue = delayQueue;
      node.data.delayProcessing = delayQueue.reduce((sum, item) => sum + item.amount, 0);
      node.data.lastOutput = totalOutput;
      node.data.lastSent = totalOutput;
    }

    // Apply deltas at end of tick (snapshot semantics)
    // Now handles typed resources properly
    for (const node of nodeMap.values()) {
      const baseTyped = baseTypedResources.get(node.id) ?? {};
      const incomingTyped = incomingTypedDelta.get(node.id) ?? {};
      const sentTyped = sentTypedAmount.get(node.id) ?? {};
      
      // Legacy incoming value for overflow calculation
      const incoming = incomingDelta.get(node.id) ?? 0;

      if (node.data.nodeType === 'source') {
        const produced = sourceProductionThisTick.get(node.id) ?? 0;
        const tokenType = node.data.tokenType || 'black';
        
        // Calculate new typed resources
        let newTyped = { ...baseTyped };
        
        // Add produced tokens
        newTyped = addTokenResources(newTyped, tokenType, produced);
        
        // Subtract sent tokens
        for (const [tokenId, amount] of Object.entries(sentTyped)) {
          newTyped = removeTokenResources(newTyped, tokenId, amount);
        }
        
        // Add incoming tokens
        for (const [tokenId, amount] of Object.entries(incomingTyped)) {
          newTyped = addTokenResources(newTyped, tokenId, amount);
        }
        
        // Apply capacity limit
        const capacity = node.data.capacity ?? -1;
        let totalNew = getTotalResources(newTyped);
        let overflow = 0;
        
        if (capacity !== -1 && Number.isFinite(capacity) && totalNew > capacity) {
          overflow = totalNew - capacity;
          // Scale down all tokens proportionally
          const scale = capacity / totalNew;
          for (const tokenId of Object.keys(newTyped)) {
            newTyped[tokenId] = Math.floor(newTyped[tokenId] * scale);
          }
          totalNew = getTotalResources(newTyped);
        }

        node.data.typedResources = newTyped;
        node.data.resources = totalNew;

        // Track production
        const discardedIncoming = Math.min(incoming, overflow);
        const overflowAfterIncoming = overflow - discardedIncoming;
        const discardedProduced = Math.min(produced, overflowAfterIncoming);
        const actualProduced = Math.max(0, produced - discardedProduced);

        if (actualProduced > 0) node.data.totalProduced = (node.data.totalProduced ?? 0) + actualProduced;
        node.data.lastProduced = actualProduced;
        continue;
      }

      if (node.data.nodeType === 'converter') {
        const consumed = converterConsumed.get(node.id) ?? {};
        
        let newTyped = { ...baseTyped };
        
        // Subtract consumed tokens
        for (const [tokenId, amount] of Object.entries(consumed)) {
          newTyped = removeTokenResources(newTyped, tokenId, amount);
        }
        
        // Add incoming tokens
        for (const [tokenId, amount] of Object.entries(incomingTyped)) {
          newTyped = addTokenResources(newTyped, tokenId, amount);
        }
        
        node.data.typedResources = newTyped;
        node.data.resources = getTotalResources(newTyped);
        continue;
      }

      if (node.data.nodeType === 'drain') {
        // Drain accumulates all tokens
        let newTyped = { ...baseTyped };
        
        for (const [tokenId, amount] of Object.entries(incomingTyped)) {
          newTyped = addTokenResources(newTyped, tokenId, amount);
        }
        
        node.data.typedResources = newTyped;
        node.data.resources = getTotalResources(newTyped);
        continue;
      }

      if (node.data.nodeType === 'trader') {
        // Trader: resources pass through, don't accumulate
        // The trading logic already handled transfers in Phase 4
        // Just update the display buffers which were set in Phase 4
        node.data.typedResources = {};
        node.data.resources = 0;
        continue;
      }

      if (node.data.nodeType === 'delay') {
        // Delay: resources are held in the delay queue, not in typedResources
        // The delay logic in Phase 5 already handled everything
        // Display the number of resources in the queue
        const queueTotal = (node.data.delayQueue ?? []).reduce(
          (sum: number, item: { amount: number }) => sum + item.amount, 
          0
        );
        node.data.typedResources = {};
        node.data.resources = queueTotal;
        continue;
      }

      // Pool and other nodes
      let newTyped = { ...baseTyped };
      
      // Subtract sent tokens
      for (const [tokenId, amount] of Object.entries(sentTyped)) {
        newTyped = removeTokenResources(newTyped, tokenId, amount);
      }
      
      // Add incoming tokens
      for (const [tokenId, amount] of Object.entries(incomingTyped)) {
        newTyped = addTokenResources(newTyped, tokenId, amount);
      }
      
      // Apply capacity for pools
      if (node.data.nodeType === 'pool') {
        const capacity = node.data.capacity ?? -1;
        let totalNew = getTotalResources(newTyped);
        
        if (capacity !== -1 && Number.isFinite(capacity) && totalNew > capacity) {
          const scale = capacity / totalNew;
          for (const tokenId of Object.keys(newTyped)) {
            newTyped[tokenId] = Math.floor(newTyped[tokenId] * scale);
          }
        }
      }
      
      node.data.typedResources = newTyped;
      node.data.resources = getTotalResources(newTyped);
    }

    const newTick = currentTick + 1;
    const updatedNodes = Array.from(nodeMap.values());

    const historyEntry: ResourceHistoryEntry = { tick: newTick };
    const tokenTotals: Record<string, number> = {};
    
    for (const node of updatedNodes) {
      if (node.data.nodeType !== 'drain' && node.data.nodeType !== 'gate') {
        historyEntry[node.id] = node.data.resources;
        
        // Accumulate token totals
        for (const [tokenId, amount] of Object.entries(node.data.typedResources)) {
          if (amount > 0) {
            tokenTotals[tokenId] = (tokenTotals[tokenId] || 0) + amount;
          }
        }
      }
    }
    
    // Add token totals with prefix
    for (const [tokenId, amount] of Object.entries(tokenTotals)) {
      historyEntry[`token:${tokenId}`] = amount;
    }

    const newHistory = [...get().resourceHistory, historyEntry].slice(-100);

    set({
      nodes: updatedNodes,
      currentTick: newTick,
      resourceHistory: newHistory,
    });

    // NOTE: do NOT call executeScriptsAsync() here fire-and-forget.
    // It causes a race condition where the async result overwrites lastOutput
    // before the next tick reads it. Instead, callers (step/play loop) must
    // explicitly await executeScriptsAsync() before calling tick().
  },
  
  // Execute all scripts asynchronously and cache their results
  executeScriptsAsync: async () => {
    const { nodes, currentTick } = get();
    
    // Find all nodes with scripts
    const scriptNodes = nodes.filter(n => {
      const mode = n.data.processingMode || (n.data.useFormula ? 'formula' : 'fixed');
      return mode === 'script' && n.data.script;
    });
    
    if (scriptNodes.length === 0) return;
    
    // Create a getter for other nodes (snapshot semantics)
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const getNode = (id: string) => {
      // Try to find by ID first
      let node = nodeMap.get(id);
      
      // If not found, try to find by label (case-insensitive)
      if (!node) {
        const normalizedId = id.toLowerCase();
        node = nodes.find(n => n.data.label.toLowerCase() === normalizedId);
      }
      
      if (!node) return null;
      return { 
        resources: node.data.resources, 
        capacity: node.data.capacity,
        tokens: node.data.typedResources || {},
        tokenType: node.data.tokenType
      };
    };
    
    // Create get function (shorthand)
    const getTokenFromNode = (nodeId: string, tokenId: string): number => {
      // Try to find by ID first
      let node = nodeMap.get(nodeId);
      
      // If not found, try to find by label (case-insensitive)
      if (!node) {
        const normalizedId = nodeId.toLowerCase();
        node = nodes.find(n => n.data.label.toLowerCase() === normalizedId);
      }
      
      if (!node) return 0;
      return getTokenResources(node.data.typedResources, tokenId);
    };
    
    // Build batch entries for all scripts
    const entries: BatchScriptEntry[] = scriptNodes.map(node => ({
      nodeId: node.id,
      script: node.data.script,
      context: {
        input: node.data.resources,
        resources: node.data.resources,
        capacity: node.data.capacity,
        totalProduced: node.data.totalProduced,
        maxProduction: node.data.maxProduction,
        tick: currentTick,
        tokenType: node.data.tokenType,
        tokens: node.data.typedResources,
        getNode,
        get: getTokenFromNode,
        // Filter out lastOutput/lastError from state to avoid them leaking
        // back via newState and overwriting the explicit lastOutput assignment
        state: Object.fromEntries(
          Object.entries(node.data.scriptState || {}).filter(
            ([k]) => k !== 'lastOutput' && k !== 'lastError'
          )
        ),
      }
    }));
    
    // Execute all scripts in batch (single runtime/context)
    const results = await executeBatchScripts(entries);
    
    // Log script results for debugging
    for (const r of results) {
      console.log(`[executeScriptsAsync] Node ${r.nodeId}: success=${r.result.success}, value=${r.result.value}, error=${r.result.error ?? 'none'}`);
    }
    
    // Update nodes with script results
    const resultNodeIds = results.map(r => r.nodeId);
    console.log(`[executeScriptsAsync] result nodeIds:`, JSON.stringify(resultNodeIds));
    console.log(`[executeScriptsAsync] store nodeIds:`, JSON.stringify(get().nodes.map(n => n.id)));
    
    const updatedNodes = get().nodes.map(node => {
      const scriptResult = results.find(r => r.nodeId === node.id);
      if (node.data.script) {
        console.log(`[MAP] node.id="${node.id}" (len=${node.id.length}) found=${!!scriptResult} resultValue=${scriptResult?.result?.value}`);
      }
      if (!scriptResult) return node;
      
      return {
        ...node,
        data: {
          ...node.data,
          scriptState: {
            ...node.data.scriptState,
            ...(scriptResult.result.newState || {}),
            // These MUST come AFTER newState spread to prevent overwrite
            lastOutput: scriptResult.result.value,
            lastError: scriptResult.result.error,
          },
        },
      };
    });
    
    // Verify the data BEFORE set()
    for (const n of updatedNodes) {
      if (n.data.scriptState?.lastOutput !== undefined) {
        console.log(`[executeScriptsAsync] BEFORE set() node ${n.id} lastOutput=`, n.data.scriptState.lastOutput);
      }
    }
    
    set({ nodes: updatedNodes });
    
    // Verify AFTER set()
    for (const n of get().nodes) {
      if (n.data.scriptState?.lastOutput !== undefined) {
        console.log(`[executeScriptsAsync] AFTER set() node ${n.id} lastOutput=`, n.data.scriptState.lastOutput);
      }
    }
  },

  step: async () => {
    // Always pre-execute scripts before each tick to ensure lastOutput is fresh
    await get().executeScriptsAsync();
    
    // Verify state right before calling tick
    for (const n of get().nodes) {
      if (n.data.scriptState?.lastOutput !== undefined) {
        console.log(`[step] BEFORE tick() node ${n.id} lastOutput=`, n.data.scriptState.lastOutput);
      }
    }
    
    get().tick();
  },

  reset: () => {
    const { nodes } = get();
    
    set({
      nodes: nodes.map((node) => {
        const defaults = nodeDefaults[node.data.nodeType];
        return {
          ...node,
          data: {
            ...node.data,
            // Reset resources to default
            resources: defaults.resources ?? 0,
            // Reset typed resources (multi-token)
            typedResources: {},
            // Reset production counters
            totalProduced: 0,
            lastProduced: 0,
            lastConsumed: 0,
            lastReceived: 0,
            lastConverted: 0,
            lastSent: 0,
            lastOutput: 0,
            // Reset distribution index
            lastDistributionIndex: 0,
            // Reset script state
            scriptState: {},
            // Reset Trader accumulators
            traderInputA: 0,
            traderInputB: 0,
            traderTypedA: {},
            traderTypedB: {},
            // Reset Delay queue
            delayQueue: [],
            delayProcessing: 0,
            calculatedDelay: undefined,
          },
        };
      }),
      currentTick: 0,
      isRunning: false,
      resourceHistory: [],
    });
  },

  newProject: () => {
    clearPendingHistoryCommit();
    set({
      nodes: [],
      edges: [],
      selectedNodeIds: [],
      selectedEdgeIds: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      currentTick: 0,
      isRunning: false,
      resourceHistory: [],
      history: [{ nodes: [], edges: [] }],
      historyIndex: 0,
    });
  },

  // Save project to JSON object
  saveProject: (name: string): ProjectData => {
    const { nodes, edges } = get();
    const now = new Date().toISOString();
    
    return {
      version: '1.0.0',
      name,
      nodes,
      edges,
      createdAt: now,
      updatedAt: now,
    };
  },

  // Load project from JSON object
  loadProject: (data: ProjectData) => {
    // Migrate nodes to include token system fields (backward compatibility)
    const migratedNodes = migrateNodes(data.nodes);
    
    // Reset counter based on loaded nodes
    const maxId = migratedNodes.reduce((max, node) => {
      const match = node.id.match(/node_(\d+)/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    nodeIdCounter = maxId + 1;

    clearPendingHistoryCommit();
    const nextNodes = migratedNodes.map((n) => (n.selected ? { ...n, selected: false } : n));
    const nextEdges = data.edges.map((e) => (e.selected ? { ...e, selected: false } : e));
    set({
      nodes: nextNodes,
      edges: nextEdges,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      isRunning: false,
      currentTick: 0,
      history: [{ nodes: JSON.parse(JSON.stringify(nextNodes)), edges: JSON.parse(JSON.stringify(nextEdges)) }],
      historyIndex: 0,
    });
  },

  // Load raw state (for auto-restore and share links)
  loadState: (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => {
    // Migrate nodes to include token system fields (backward compatibility)
    const migratedNodes = migrateNodes(nodes);
    
    // Reset counter based on loaded nodes
    const maxId = migratedNodes.reduce((max, node) => {
      const match = node.id.match(/node_(\d+)/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    nodeIdCounter = maxId + 1;

    clearPendingHistoryCommit();
    const nextNodes = migratedNodes.map((n) => (n.selected ? { ...n, selected: false } : n));
    const nextEdges = edges.map((e) => (e.selected ? { ...e, selected: false } : e));
    set({
      nodes: nextNodes,
      edges: nextEdges,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      isRunning: false,
      currentTick: 0,
      resourceHistory: [],
      history: [{ nodes: JSON.parse(JSON.stringify(nextNodes)), edges: JSON.parse(JSON.stringify(nextEdges)) }],
      historyIndex: 0,
    });
  },

  // Export to file (download)
  exportToFile: (name: string) => {
    const project = get().saveProject(name);
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name.replace(/\s+/g, '_').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Import from file
  importFromFile: async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const json = e.target?.result as string;
          const data = JSON.parse(json) as ProjectData;
          
          // Validate basic structure
          if (!data.version || !data.nodes || !data.edges) {
            throw new Error('Invalid project file format');
          }
          
          get().loadProject(data);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },

  // Simulation speed
  setTicksPerSecond: (tps: number) => {
    set({ ticksPerSecond: Math.max(0.1, Math.min(10, tps)) });
  },

  // Push current state to history
  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    
    // Clone current state
    const currentState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    
    // Remove any future history (if we undid and then made changes)
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    
    // Limit history size
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  // Undo
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    
    const newIndex = historyIndex - 1;
    const state = history[newIndex];
    
    const nextNodes = JSON.parse(JSON.stringify(state.nodes)) as Node<NodeData>[];
    const nextEdges = JSON.parse(JSON.stringify(state.edges)) as Edge<EdgeData>[];
    set({
      nodes: nextNodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
      edges: nextEdges.map((e) => (e.selected ? { ...e, selected: false } : e)),
      historyIndex: newIndex,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  // Redo
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    
    const newIndex = historyIndex + 1;
    const state = history[newIndex];
    
    const nextNodes = JSON.parse(JSON.stringify(state.nodes)) as Node<NodeData>[];
    const nextEdges = JSON.parse(JSON.stringify(state.edges)) as Edge<EdgeData>[];
    set({
      nodes: nextNodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
      edges: nextEdges.map((e) => (e.selected ? { ...e, selected: false } : e)),
      historyIndex: newIndex,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  // Copy selected nodes
  copySelected: () => {
    const { nodes, edges, selectedNodeIds } = get();
    if (selectedNodeIds.length === 0) return;

    const selectedSet = new Set(selectedNodeIds);
    const nodesToCopy = nodes.filter((n) => selectedSet.has(n.id));
    if (nodesToCopy.length === 0) return;

    const nodeIds = new Set(nodesToCopy.map(n => n.id));
    
    // Copy edges between copied nodes
    const edgesToCopy = edges.filter(
      e => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
    
    set({
      clipboard: {
        nodes: JSON.parse(JSON.stringify(nodesToCopy)),
        edges: JSON.parse(JSON.stringify(edgesToCopy)),
      }
    });
  },

  // Paste from clipboard
  paste: () => {
    const { clipboard } = get();
    if (!clipboard || clipboard.nodes.length === 0) return;
    
    // Create new IDs for pasted nodes
    const idMap = new Map<string, string>();
    const newNodes: Node<NodeData>[] = clipboard.nodes.map(node => {
      const newId = `node_${nodeIdCounter++}`;
      idMap.set(node.id, newId);
      
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        data: {
          ...node.data,
          label: `${node.data.label} (copy)`,
        },
        selected: true,
      };
    });
    
    // Update edge references
    const newEdges: Edge<EdgeData>[] = clipboard.edges.map(edge => ({
      ...edge,
      id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source: idMap.get(edge.source) || edge.source,
      target: idMap.get(edge.target) || edge.target,
    }));
    
    clearPendingHistoryCommit();
    set((state) => ({
      nodes: [...state.nodes.map(n => ({ ...n, selected: false })), ...newNodes],
      edges: [...state.edges.map((e) => ({ ...e, selected: false })), ...newEdges],
      selectedNodeIds: newNodes.map((n) => n.id),
      selectedEdgeIds: [],
      selectedNodeId: newNodes.length === 1 ? newNodes[0].id : null,
      selectedEdgeId: null,
    }));
    get().pushHistory();
  },

  // Load a predefined template
  loadTemplate: (templateId: string) => {
    const template = getTemplateById(templateId);
    if (!template) {
      console.error(`Template not found: ${templateId}`);
      return;
    }
    
    // Reset node counter based on template nodes
    const maxId = template.nodes.reduce((max, node) => {
      const match = node.id.match(/node_(\d+)/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    nodeIdCounter = Math.max(nodeIdCounter, maxId + 1);
    
    const nextNodes = JSON.parse(JSON.stringify(template.nodes)) as Node<NodeData>[];
    const nextEdges = JSON.parse(JSON.stringify(template.edges)) as Edge<EdgeData>[];
    clearPendingHistoryCommit();
    set({
      nodes: nextNodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
      edges: nextEdges.map((e) => (e.selected ? { ...e, selected: false } : e)),
      selectedNodeIds: [],
      selectedEdgeIds: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      isRunning: false,
      currentTick: 0,
      history: [{ nodes: JSON.parse(JSON.stringify(nextNodes)), edges: JSON.parse(JSON.stringify(nextEdges)) }],
      historyIndex: 0,
    });
  },

  // Export statistics to CSV
  exportStatsToCSV: () => {
    const { resourceHistory, nodes } = get();
    
    if (resourceHistory.length === 0) {
      alert('No simulation data to export. Run the simulation first!');
      return;
    }
    
    // Get node labels for header
    const nodeLabels: Record<string, string> = {};
    nodes.forEach((node) => {
      nodeLabels[node.id] = node.data.label;
    });
    
    // Get all node IDs from history
    const nodeIds = Object.keys(resourceHistory[0]).filter(k => k !== 'tick');
    
    // Build CSV header
    const header = ['Tick', ...nodeIds.map(id => nodeLabels[id] || id)].join(',');
    
    // Build CSV rows
    const rows = resourceHistory.map(entry => {
      const values = [entry.tick.toString()];
      nodeIds.forEach(id => {
        values.push((entry[id] ?? 0).toString());
      });
      return values.join(',');
    });
    
    const csv = [header, ...rows].join('\n');
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simulation_stats_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
}));
