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
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  deleteSelectedNode: () => void;
  deleteSelectedEdge: () => void;
  toggleRunning: () => void;
  tick: () => void;
  step: () => void;
  reset: () => void;
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
  exportToFile: (name: string) => void;
  importFromFile: (file: File) => Promise<void>;
  
  // Templates
  loadTemplate: (templateId: string) => void;
  
  // Export stats
  exportStatsToCSV: () => void;
}

let nodeIdCounter = 1;

const MAX_HISTORY = 50;

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  isRunning: false,
  currentTick: 0,
  
  // Simulation speed
  ticksPerSecond: 1,
  
  // History
  history: [],
  historyIndex: -1,
  
  // Clipboard
  clipboard: null,
  
  // Resource history for charts
  resourceHistory: [],

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
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
  },

  addNode: (type, position) => {
    get().pushHistory();
    
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
        gateCondition: defaults.gateCondition ?? 'always',
        gateThreshold: defaults.gateThreshold ?? 0,
        formula: defaults.formula ?? '',
        useFormula: defaults.useFormula ?? false,
        processingMode: defaults.processingMode ?? 'fixed',
        script: defaults.script ?? '',
        scriptState: defaults.scriptState ?? {},
      },
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
    }));
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      ),
    }));
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
  },

  setSelectedNode: (nodeId) => {
    set({ selectedNodeId: nodeId, selectedEdgeId: null });
  },

  setSelectedEdge: (edgeId) => {
    set({ selectedEdgeId: edgeId, selectedNodeId: null });
  },

  deleteSelectedNode: () => {
    const { selectedNodeId, nodes, edges } = get();
    if (!selectedNodeId) return;
    
    get().pushHistory();
    
    // Remove node and all connected edges
    set({
      nodes: nodes.filter((n) => n.id !== selectedNodeId),
      edges: edges.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId),
      selectedNodeId: null,
    });
  },

  deleteSelectedEdge: () => {
    const { selectedEdgeId, edges } = get();
    if (!selectedEdgeId) return;
    
    get().pushHistory();
    
    set({
      edges: edges.filter((e) => e.id !== selectedEdgeId),
      selectedEdgeId: null,
    });
  },

  toggleRunning: () => {
    set((state) => ({ isRunning: !state.isRunning }));
  },

  tick: () => {
    const { nodes, edges, currentTick } = get();
    
    // Create a map for quick lookup
    const nodeMap = new Map(nodes.map((n) => [n.id, { ...n, data: { ...n.data } }]));

    // Helper function to check probability
    const checkProbability = (prob: number): boolean => {
      return Math.random() * 100 < prob;
    };
    
    // Helper function to get production rate (uses formula or script if enabled)
    const getProductionRate = (node: Node<NodeData>): number => {
      const mode = node.data.processingMode || (node.data.useFormula ? 'formula' : 'fixed');
      
      if (mode === 'formula' && node.data.formula) {
        const result = evaluateFormula(node.data.formula, {
          resources: node.data.resources,
          tick: currentTick,
          capacity: node.data.capacity,
        });
        return result ?? node.data.productionRate;
      }
      
      // Script mode: scripts are async, so we use cached result or fall back to formula/fixed
      // The actual script execution happens separately and updates scriptState
      if (mode === 'script' && node.data.script) {
        // For now, scripts use the last computed value stored in scriptState
        // or fall back to productionRate
        const lastOutput = node.data.scriptState?.lastOutput;
        return typeof lastOutput === 'number' ? lastOutput : node.data.productionRate;
      }
      
      return node.data.productionRate;
    };

    // Phase 1: Sources produce resources (with probability check)
    for (const node of nodeMap.values()) {
      if (node.data.nodeType === 'source' && node.data.isActive) {
        const prob = node.data.probability ?? 100;
        if (checkProbability(prob)) {
          const production = getProductionRate(node);
          node.data.resources += production;
        }
      }
    }

    // Phase 2: Process edges (transfer resources)
    for (const edge of edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);

      if (!source || !target || !source.data.isActive) continue;
      
      // Check source probability for transfer
      const prob = source.data.probability ?? 100;
      if (!checkProbability(prob) && source.data.nodeType !== 'source') continue;
      
      // Check gate condition if source is a gate
      if (source.data.nodeType === 'gate') {
        const condition = source.data.gateCondition ?? 'always';
        const threshold = source.data.gateThreshold ?? 0;
        const resources = source.data.resources;
        
        if (condition === 'if_above' && resources <= threshold) continue;
        if (condition === 'if_below' && resources >= threshold) continue;
      }

      const flowRate = (edge.data as { flowRate?: number })?.flowRate ?? 1;

      // Calculate how much can flow
      let available: number;
      if (source.data.nodeType === 'source') {
        available = flowRate; // Sources always produce
      } else {
        available = Math.min(source.data.resources, flowRate);
      }

      // Check target capacity
      let targetSpace: number;
      if (target.data.nodeType === 'drain') {
        targetSpace = available; // Drains accept everything
      } else if (target.data.capacity === -1) {
        targetSpace = available;
      } else {
        targetSpace = Math.max(0, target.data.capacity - target.data.resources);
      }

      const actualFlow = Math.min(available, targetSpace);

      if (actualFlow > 0) {
        // Remove from source (except for source nodes)
        if (source.data.nodeType !== 'source') {
          source.data.resources -= actualFlow;
        }
        
        // Add to target (except for drain nodes)
        if (target.data.nodeType !== 'drain') {
          target.data.resources += actualFlow;
        }
      }
    }

    // Phase 3: Process converters
    // Converters transform accumulated input into output
    for (const node of nodeMap.values()) {
      if (node.data.nodeType === 'converter' && node.data.isActive) {
        const inputResources = node.data.resources;
        
        if (inputResources <= 0) continue;
        
        let outputAmount: number;
        let inputConsumed: number;
        
        // Determine processing mode
        const mode = node.data.processingMode || (node.data.useFormula ? 'formula' : 'fixed');
        
        if (mode === 'formula' && node.data.formula) {
          // Formula mode: formula calculates output from input
          const result = evaluateFormula(node.data.formula, {
            resources: node.data.resources,
            tick: get().currentTick,
            capacity: node.data.capacity,
            input: inputResources,
          });
          
          if (result !== null && result > 0) {
            outputAmount = result;
            inputConsumed = inputResources; // Consume all input
          } else {
            continue; // Formula returned 0 or failed
          }
        } else if (mode === 'script' && node.data.script) {
          // Script mode: use cached result from scriptState
          const cachedOutput = node.data.scriptState?.lastOutput;
          if (typeof cachedOutput === 'number' && cachedOutput > 0) {
            outputAmount = cachedOutput;
            inputConsumed = inputResources;
          } else {
            continue;
          }
        } else {
          // Ratio mode: traditional input/output ratio
          const inputRatio = node.data.inputRatio ?? 2;
          const outputRatio = node.data.outputRatio ?? 1;
          
          // Calculate how many conversions can happen
          const conversions = Math.floor(inputResources / inputRatio);
          
          if (conversions <= 0) continue;
          
          outputAmount = conversions * outputRatio;
          inputConsumed = conversions * inputRatio;
        }
        
        // Find output edges from this converter
        const outputEdges = edges.filter(e => e.source === node.id);
        
        if (outputEdges.length > 0) {
          const outputPerEdge = Math.floor(outputAmount / outputEdges.length);
          let actualOutputUsed = 0;
          
          for (const edge of outputEdges) {
            const target = nodeMap.get(edge.target);
            if (!target) continue;
            
            // Check target capacity
            let targetSpace: number;
            if (target.data.nodeType === 'drain') {
              targetSpace = outputPerEdge;
            } else if (target.data.capacity === -1) {
              targetSpace = outputPerEdge;
            } else {
              targetSpace = Math.max(0, target.data.capacity - target.data.resources);
            }
            
            const actualOutput = Math.min(outputPerEdge, targetSpace);
            
            if (actualOutput > 0 && target.data.nodeType !== 'drain') {
              target.data.resources += actualOutput;
              actualOutputUsed += actualOutput;
            } else if (target.data.nodeType === 'drain') {
              actualOutputUsed += actualOutput;
            }
          }
          
          // Consume input proportionally to actual output
          if (node.data.useFormula) {
            // Formula mode: consume based on ratio of actual/planned output
            const consumeRatio = actualOutputUsed / outputAmount;
            node.data.resources = Math.max(0, node.data.resources - Math.floor(inputConsumed * consumeRatio));
          } else {
            // Ratio mode: consume exact input for conversions used
            const outputRatio = node.data.outputRatio ?? 1;
            const inputRatio = node.data.inputRatio ?? 2;
            const actualConversions = Math.ceil(actualOutputUsed / outputRatio);
            node.data.resources = Math.max(0, node.data.resources - actualConversions * inputRatio);
          }
        }
      }
    }

    // Update state
    const newTick = get().currentTick + 1;
    const updatedNodes = Array.from(nodeMap.values());
    
    // Build resource history entry
    const historyEntry: ResourceHistoryEntry = { tick: newTick };
    for (const node of updatedNodes) {
      // Only track pools, sources with resources, and converters
      if (node.data.nodeType !== 'drain' && node.data.nodeType !== 'gate') {
        historyEntry[node.id] = node.data.resources;
      }
    }
    
    // Keep last 100 entries
    const newHistory = [...get().resourceHistory, historyEntry].slice(-100);
    
    set({
      nodes: updatedNodes,
      currentTick: newTick,
      resourceHistory: newHistory,
    });
    
    // Execute scripts asynchronously for next tick
    // This pre-computes script outputs so they're ready for the next tick
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
    // Reset counter based on loaded nodes
    const maxId = data.nodes.reduce((max, node) => {
      const match = node.id.match(/node_(\d+)/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    nodeIdCounter = maxId + 1;

    set({
      nodes: data.nodes,
      edges: data.edges,
      selectedNodeId: null,
      selectedEdgeId: null,
      isRunning: false,
      currentTick: 0,
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
    
    set({
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges)),
      historyIndex: newIndex,
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
    
    set({
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges)),
      historyIndex: newIndex,
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
    const { nodes, edges, selectedNodeId } = get();
    if (!selectedNodeId) return;
    
    // Get selected node
    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    if (!selectedNode) return;
    
    // For now, copy single node (could extend to multiple selection)
    const nodesToCopy = [selectedNode];
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
    
    // Push history before pasting
    get().pushHistory();
    
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
    
    set((state) => ({
      nodes: [...state.nodes.map(n => ({ ...n, selected: false })), ...newNodes],
      edges: [...state.edges, ...newEdges],
      selectedNodeId: newNodes[0]?.id || null,
    }));
  },

  // Load a predefined template
  loadTemplate: (templateId: string) => {
    const template = getTemplateById(templateId);
    if (!template) {
      console.error(`Template not found: ${templateId}`);
      return;
    }
    
    // Push current state to history before loading template
    get().pushHistory();
    
    // Reset node counter based on template nodes
    const maxId = template.nodes.reduce((max, node) => {
      const match = node.id.match(/node_(\d+)/);
      return match ? Math.max(max, parseInt(match[1])) : max;
    }, 0);
    nodeIdCounter = Math.max(nodeIdCounter, maxId + 1);
    
    set({
      nodes: JSON.parse(JSON.stringify(template.nodes)),
      edges: JSON.parse(JSON.stringify(template.edges)),
      selectedNodeId: null,
      selectedEdgeId: null,
      isRunning: false,
      currentTick: 0,
      history: [],
      historyIndex: -1,
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
