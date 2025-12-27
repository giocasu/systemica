import { useCallback, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useSimulatorStore } from './store/simulatorStore';
import { nodeTypes } from './nodes';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { EdgePropertiesPanel } from './components/EdgePropertiesPanel';
import { StatusBar } from './components/StatusBar';
import { ResourceChart } from './components/ResourceChart';
import { NodeType } from './types';
import { 
  saveToLocalStorage, 
  loadFromLocalStorage, 
  parseShareableLink,
  generateShareableLink,
  copyToClipboard 
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
  const [shareMessage, setShareMessage] = useState<string | null>(null);
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

  // Generate share link
  const handleShare = useCallback(async () => {
    try {
      const url = await generateShareableLink(nodes, edges);
      await copyToClipboard(url);
      setShareMessage('✅ Link copied!');
      setTimeout(() => setShareMessage(null), 3000);
    } catch {
      setShareMessage('❌ Failed to generate link');
      setTimeout(() => setShareMessage(null), 3000);
    }
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
      <Toolbar />
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
          <Panel position="top-left">
            <div className="share-panel">
              <button 
                className="share-btn" 
                onClick={handleShare}
                disabled={nodes.length === 0}
                title="Copy shareable link"
              >
                🔗 Share
              </button>
              {shareMessage && <span className="share-message">{shareMessage}</span>}
            </div>
          </Panel>
          <Panel position="top-right">
            {selectedNodeId && <PropertiesPanel nodeId={selectedNodeId} />}
            {selectedEdgeId && <EdgePropertiesPanel edgeId={selectedEdgeId} />}
          </Panel>
          <Panel position="bottom-right">
            <ResourceChart />
          </Panel>
        </ReactFlow>
      </div>
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
