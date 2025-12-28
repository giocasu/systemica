import { useCallback, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useSimulatorStore } from './store/simulatorStore';
import { nodeTypes } from './nodes';
import { PropertiesPanel } from './components/PropertiesPanel';
import { EdgePropertiesPanel } from './components/EdgePropertiesPanel';
import { StatusBar } from './components/StatusBar';
import { ResourceChart } from './components/ResourceChart';
import { NodePalette } from './components/NodePalette';
import { DraggableToolbar } from './components/DraggableToolbar';
import { DraggablePanel } from './components/DraggablePanel';
import { NodeType } from './types';
import { 
  saveToLocalStorage, 
  loadFromLocalStorage, 
  parseShareableLink,
} from './utils/persistence';

function Flow() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectedNodeId,
    selectedEdgeId,
    setSelectedNode,
    setSelectedEdge,
    deleteSelectedNode,
    deleteSelectedEdge,
    isRunning,
    tick,
    ticksPerSecond,
    undo,
    redo,
    copySelected,
    paste,
    loadState,
  } = useSimulatorStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [showChart, setShowChart] = useState(true);
  const initialLoadDone = useRef(false);

  // Load from URL share link or localStorage on mount
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const loadInitialState = async () => {
      // First, try to load from URL share link
      const sharedState = await parseShareableLink();
      if (sharedState) {
        loadState(sharedState.nodes, sharedState.edges);
        // Clear the hash to avoid re-loading on refresh
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }

      // Otherwise, load from localStorage
      const savedState = loadFromLocalStorage();
      if (savedState && savedState.nodes.length > 0) {
        loadState(savedState.nodes, savedState.edges);
      }
    };

    loadInitialState();
  }, [loadState]);

  // Auto-save to localStorage whenever nodes or edges change
  useEffect(() => {
    // Don't save empty state or during initial load
    if (!initialLoadDone.current) return;
    
    // Debounce the save
    const timeout = setTimeout(() => {
      saveToLocalStorage(nodes, edges);
    }, 500);

    return () => clearTimeout(timeout);
  }, [nodes, edges]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Undo: Ctrl+Z
      if (event.ctrlKey && event.key === 'z') {
        event.preventDefault();
        undo();
        return;
      }
      
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (event.ctrlKey && (event.key === 'y' || (event.shiftKey && event.key === 'Z'))) {
        event.preventDefault();
        redo();
        return;
      }
      
      // Copy: Ctrl+C
      if (event.ctrlKey && event.key === 'c') {
        event.preventDefault();
        copySelected();
        return;
      }
      
      // Paste: Ctrl+V
      if (event.ctrlKey && event.key === 'v') {
        event.preventDefault();
        paste();
        return;
      }
      
      // Delete
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNodeId) {
          deleteSelectedNode();
        } else if (selectedEdgeId) {
          deleteSelectedEdge();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, deleteSelectedNode, deleteSelectedEdge, undo, redo, copySelected, paste]);

  // Handle node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: { id: string }) => {
    setSelectedNode(node.id);
  }, [setSelectedNode]);

  // Handle edge selection
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.id);
  }, [setSelectedEdge]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setSelectedNode, setSelectedEdge]);

  // Handle drag and drop from toolbar
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
  );

  // Simulation tick
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      tick();
    }, 1000 / ticksPerSecond);

    return () => clearInterval(interval);
  }, [isRunning, tick, ticksPerSecond]);

  return (
    <div className="app">
      <DraggableToolbar
        onToggleChart={() => setShowChart((prev) => !prev)}
        showChart={showChart}
      />
      <DraggablePanel
        title="🧩 Nodes"
        defaultPosition={{ x: 10, y: 120 }}
        className="palette-draggable"
        minWidth={260}
      >
        <NodePalette />
      </DraggablePanel>
      <div className="flow-wrapper" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[20, 20]}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#e94560', strokeWidth: 2 },
          }}
        >
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case 'source': return '#4ade80';
                case 'pool': return '#60a5fa';
                case 'drain': return '#f87171';
                case 'converter': return '#fbbf24';
                case 'gate': return '#a78bfa';
                default: return '#888';
              }
            }}
            maskColor="rgba(0, 0, 0, 0.8)"
            style={{ background: '#0a0a1a' }}
          />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a2a4e" />
        </ReactFlow>
      </div>

      {showChart && (
        <DraggablePanel
          title="📊 Chart"
          defaultPosition={{
            x: typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 420) : 10,
            y: typeof window !== 'undefined' ? Math.max(10, window.innerHeight - 320) : 10,
          }}
          onClose={() => setShowChart(false)}
          className="chart-draggable"
          minWidth={380}
        >
          <ResourceChart />
        </DraggablePanel>
      )}
      
      {selectedNodeId && (
        <DraggablePanel
          title="📝 Properties"
          defaultPosition={{
            x: typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 320) : 10,
            y: 80,
          }}
          onClose={() => setSelectedNode(null)}
          className="properties-draggable"
          minWidth={280}
        >
          <PropertiesPanel nodeId={selectedNodeId} />
        </DraggablePanel>
      )}
      {selectedEdgeId && (
        <DraggablePanel
          title="🔗 Connection"
          defaultPosition={{
            x: typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 320) : 10,
            y: 80,
          }}
          onClose={() => setSelectedEdge(null)}
          className="properties-draggable"
          minWidth={280}
        >
          <EdgePropertiesPanel edgeId={selectedEdgeId} />
        </DraggablePanel>
      )}
      
      <StatusBar />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
