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
import { NodeData, NodeType, nodeDefaults } from '../types';
import { getTemplateById } from '../templates';
import { evaluateFormula } from '../utils/formulaEvaluator';
import { executeScript } from '../utils/scriptRunner';
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
export interface ResourceHistoryEntry {
  tick: number;
  [nodeId: string]: number;
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
  step: () => void;
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
    
    const newNode: Node<NodeData> = {
      id,
      type,
      position,
      data: {
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${nodeIdCounter - 1}`,
        nodeType: type,
        resources: defaults.resources ?? 0,
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
        tokenType: defaults.tokenType ?? 'black',
        typedResources: defaults.typedResources ?? {},
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
  },

  tick: () => {
    const { nodes, edges, currentTick } = get();

    const nodeMap = new Map(nodes.map((n) => [n.id, { ...n, data: { ...n.data } }]));
    for (const node of nodeMap.values()) {
      node.data.lastSent = 0;
      if (node.data.nodeType === 'source') node.data.lastProduced = 0;
      if (node.data.nodeType === 'pool') node.data.lastReceived = 0;
      if (node.data.nodeType === 'converter') node.data.lastConverted = 0;
      if (node.data.nodeType === 'drain') node.data.lastConsumed = 0;
    }

    // Snapshot resources at the start of the tick.
    // Transfers are computed from the snapshot and applied at the end of the tick (no multi-hop in one tick).
    const baseResources = new Map<string, number>();
    for (const node of nodeMap.values()) baseResources.set(node.id, node.data.resources);

    const incomingDelta = new Map<string, number>();
    const sentAmount = new Map<string, number>();
    const converterConsumed = new Map<string, number>();

    const addIncoming = (nodeId: string, amount: number) => {
      if (amount <= 0) return;
      incomingDelta.set(nodeId, (incomingDelta.get(nodeId) ?? 0) + amount);
    };

    const addSent = (nodeId: string, amount: number) => {
      if (amount <= 0) return;
      sentAmount.set(nodeId, (sentAmount.get(nodeId) ?? 0) + amount);
    };

    const getEffectiveTargetResources = (nodeId: string) => {
      return (baseResources.get(nodeId) ?? 0) + (incomingDelta.get(nodeId) ?? 0);
    };

    const getTargetSpace = (target: Node<NodeData>) => {
      if (target.data.nodeType === 'drain') return Infinity;
      const cap = target.data.capacity ?? -1;
      if (cap === -1 || !Number.isFinite(cap)) return Infinity;
      return Math.max(0, cap - getEffectiveTargetResources(target.id));
    };

    const recordTransfer = (from: Node<NodeData>, to: Node<NodeData>, amount: number) => {
      if (amount <= 0) return;
      addSent(from.id, amount);
      from.data.lastSent = (from.data.lastSent ?? 0) + amount;

      addIncoming(to.id, amount);
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
    for (const [sourceId, outgoingEdges] of edgesBySource) {
      const source = nodeMap.get(sourceId);
      if (!source || !source.data.isActive) continue;

      if (source.data.nodeType === 'converter' || source.data.nodeType === 'drain') continue;

      const isSource = source.data.nodeType === 'source';

      const prob = source.data.probability ?? 100;
      if (!isSource && !checkProbability(prob)) continue;

      if (source.data.nodeType === 'gate') {
        const condition = source.data.gateCondition ?? 'always';
        const threshold = source.data.gateThreshold ?? 0;
        const resources = baseResources.get(sourceId) ?? 0;

        if (condition === 'if_above' && resources <= threshold) continue;
        if (condition === 'if_below' && resources >= threshold) continue;
      }

      const productionThisTick = sourceProductionThisTick.get(sourceId) ?? 0;
      let available = (baseResources.get(sourceId) ?? 0) + (isSource ? productionThisTick : 0);
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

      if (distributionMode === 'continuous') {
        const totalFlowRates = validEdges.reduce((sum, e) => sum + e.flowRate, 0);
        const totalAvailable = available;

        for (const { target, flowRate } of validEdges) {
          const proportion = flowRate / totalFlowRates;
          const allocated = totalAvailable * proportion;
          const actualFlow = Math.min(allocated, flowRate, getTargetSpace(target), available);
          if (actualFlow > 0) {
            available -= actualFlow;
            recordTransfer(source, target, actualFlow);
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
              available -= 1;
              remaining -= 1;
              recordTransfer(source, target, 1);

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
    for (const node of nodeMap.values()) {
      if (node.data.nodeType !== 'converter' || !node.data.isActive) continue;

      const inputResources = baseResources.get(node.id) ?? 0;
      if (inputResources <= 0) continue;

      const mode = node.data.processingMode || (node.data.useFormula ? 'formula' : 'fixed');

      let outputAmount: number;
      let inputConsumed: number;

      if (mode === 'formula' && node.data.formula) {
        const result = evaluateFormula(node.data.formula, {
          resources: inputResources,
          tick: currentTick,
          capacity: node.data.capacity,
          input: inputResources,
        });

        if (result === null || result <= 0) continue;
        outputAmount = result;
        inputConsumed = inputResources;
      } else if (mode === 'script' && node.data.script) {
        const cachedOutput = node.data.scriptState?.lastOutput;
        if (typeof cachedOutput !== 'number' || cachedOutput <= 0) continue;
        outputAmount = cachedOutput;
        inputConsumed = inputResources;
      } else {
        const inputRatio = node.data.inputRatio ?? 2;
        const outputRatio = node.data.outputRatio ?? 1;
        const conversions = Math.floor(inputResources / inputRatio);
        if (conversions <= 0) continue;
        outputAmount = conversions * outputRatio;
        inputConsumed = conversions * inputRatio;
      }

      const outputEdges = edgesBySource.get(node.id) ?? [];
      if (outputEdges.length === 0) continue;

      const distributionMode = node.data.distributionMode ?? 'continuous';
      let outputAvailable = outputAmount;
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

      if (distributionMode === 'continuous') {
        const totalFlowRates = validEdges.reduce((sum, e) => sum + e.flowRate, 0);
        const totalAvailable = outputAvailable;

        for (const { target, flowRate } of validEdges) {
          const proportion = flowRate / totalFlowRates;
          const allocated = totalAvailable * proportion;
          const actualFlow = Math.min(allocated, flowRate, getTargetSpace(target), outputAvailable);
          if (actualFlow > 0) {
            outputAvailable -= actualFlow;
            actualOutputUsed += actualFlow;
            recordTransfer(node, target, actualFlow);
          }
        }
      } else {
        let lastIndex = node.data.lastDistributionIndex ?? 0;
        let remaining = Math.floor(outputAvailable);

        while (remaining > 0 && validEdges.length > 0) {
          let found = false;

          for (let i = 0; i < validEdges.length; i++) {
            const idx = (lastIndex + i) % validEdges.length;
            const { target, flowRate, targetSpace } = validEdges[idx];

            const canSend = Math.min(1, flowRate, targetSpace, remaining);
            if (canSend >= 1) {
              outputAvailable -= 1;
              remaining -= 1;
              actualOutputUsed += 1;
              recordTransfer(node, target, 1);

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

      // Consume input proportionally to actual output (formula/script) or by ratio (fixed).
      if (mode === 'formula' || mode === 'script') {
        const ratio = outputAmount > 0 ? actualOutputUsed / outputAmount : 0;
        converterConsumed.set(node.id, Math.max(0, Math.min(inputResources, Math.floor(inputConsumed * ratio))));
      } else {
        const outputRatio = node.data.outputRatio ?? 1;
        const inputRatio = node.data.inputRatio ?? 2;
        const actualConversions = Math.ceil(actualOutputUsed / outputRatio);
        converterConsumed.set(node.id, Math.max(0, Math.min(inputResources, actualConversions * inputRatio)));
      }
    }

    // Apply deltas at end of tick (snapshot semantics)
    for (const node of nodeMap.values()) {
      const base = baseResources.get(node.id) ?? 0;
      const incoming = incomingDelta.get(node.id) ?? 0;
      const sent = sentAmount.get(node.id) ?? 0;

      if (node.data.nodeType === 'source') {
        const produced = sourceProductionThisTick.get(node.id) ?? 0;
        let preCap = base + produced - sent + incoming;

        const capacity = node.data.capacity ?? -1;
        let overflow = 0;
        if (capacity !== -1 && Number.isFinite(capacity)) {
          overflow = Math.max(0, preCap - capacity);
          preCap = Math.min(preCap, capacity);
        }

        node.data.resources = Math.max(0, preCap);

        // Prefer discarding incoming first, then produced (so incoming doesn't reduce totalProduced).
        const discardedIncoming = Math.min(incoming, overflow);
        const overflowAfterIncoming = overflow - discardedIncoming;
        const discardedProduced = Math.min(produced, overflowAfterIncoming);
        const actualProduced = Math.max(0, produced - discardedProduced);

        if (actualProduced > 0) node.data.totalProduced = (node.data.totalProduced ?? 0) + actualProduced;
        node.data.lastProduced = actualProduced;
        continue;
      }

      if (node.data.nodeType === 'converter') {
        const consumed = converterConsumed.get(node.id) ?? 0;
        node.data.resources = Math.max(0, base - consumed + incoming);
        continue;
      }

      if (node.data.nodeType === 'drain') {
        node.data.resources = base + incoming;
        continue;
      }

      node.data.resources = Math.max(0, base - sent + incoming);
    }

    const newTick = currentTick + 1;
    const updatedNodes = Array.from(nodeMap.values());

    const historyEntry: ResourceHistoryEntry = { tick: newTick };
    for (const node of updatedNodes) {
      if (node.data.nodeType !== 'drain' && node.data.nodeType !== 'gate') {
        historyEntry[node.id] = node.data.resources;
      }
    }

    const newHistory = [...get().resourceHistory, historyEntry].slice(-100);

    set({
      nodes: updatedNodes,
      currentTick: newTick,
      resourceHistory: newHistory,
    });

    get().executeScriptsAsync();
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
    
    // Create a getter for other nodes
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const getNode = (id: string) => {
      const node = nodeMap.get(id);
      if (!node) return null;
      return { resources: node.data.resources, capacity: node.data.capacity };
    };
    
    // Execute all scripts in parallel
    const results = await Promise.all(
      scriptNodes.map(async (node) => {
        try {
          const result = await executeScript(node.data.script, {
            input: node.data.resources,
            resources: node.data.resources,
            capacity: node.data.capacity,
            totalProduced: node.data.totalProduced,
            maxProduction: node.data.maxProduction,
            tick: currentTick,
            getNode,
            state: node.data.scriptState || {},
          });
          
          return { nodeId: node.id, result };
        } catch (error) {
          console.warn(`Script error in node ${node.id}:`, error);
          return { nodeId: node.id, result: { success: false, value: 0, error: 'Execution failed' } };
        }
      })
    );
    
    // Update nodes with script results
    set({
      nodes: get().nodes.map(node => {
        const scriptResult = results.find(r => r.nodeId === node.id);
        if (!scriptResult) return node;
        
        return {
          ...node,
          data: {
            ...node.data,
            scriptState: {
              ...node.data.scriptState,
              lastOutput: scriptResult.result.value,
              lastError: scriptResult.result.error,
              ...(scriptResult.result.newState || {}),
            },
          },
        };
      }),
    });
  },

  step: () => {
    get().tick();
  },

  reset: () => {
    const { nodes } = get();
    
    set({
      nodes: nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          resources: nodeDefaults[node.data.nodeType].resources ?? 0,
        },
      })),
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
