import { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { useSimulatorStore } from '../store/simulatorStore';
import { TemplateDropdown } from './TemplateDropdown';
import { 
  generateShareableLink,
  copyToClipboard 
} from '../utils/persistence';

interface DraggableToolbarProps {
  defaultPosition?: { x: number; y: number };
  onToggleChart: () => void;
  showChart: boolean;
}

export function DraggableToolbar({ 
  defaultPosition = { x: 10, y: 10 },
  onToggleChart,
  showChart
}: DraggableToolbarProps) {
  const { 
    isRunning, 
    toggleRunning, 
    executeScriptsAsync,
    step, 
    reset,
    newProject,
    exportToFile, 
    importFromFile,
    ticksPerSecond,
    setTicksPerSecond,
    undo,
    redo,
    canUndo,
    canRedo,
    copySelected,
    paste,
    selectedNodeIds,
    clipboard,
    clearCanvas,
    exportStatsToCSV,
    resourceHistory,
    nodes,
    edges,
  } = useSimulatorStore();
  
  const nodeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const handleNew = () => {
    if (nodes.length === 0) return;
    if (confirm('Start a new project? This will clear undo history.')) newProject();
  };

  const handleClearCanvas = () => {
    if (nodes.length === 0 && edges.length === 0) return;
    if (confirm('Clear canvas? (You can undo with Ctrl+Z)')) clearCanvas();
  };

  const handleSave = () => {
    const name = prompt('Nome del progetto:', 'My Game Economy');
    if (name) {
      exportToFile(name);
    }
  };

  const handleLoad = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await importFromFile(file);
        alert('Progetto caricato con successo!');
      } catch (err) {
        alert('Errore nel caricamento del file: ' + (err as Error).message);
      }
    }
    event.target.value = '';
  };

  const handleShare = async () => {
    try {
      const url = await generateShareableLink(nodes, edges);
      await copyToClipboard(url);
      setShareMessage('✅ Link copied!');
      setTimeout(() => setShareMessage(null), 3000);
    } catch {
      setShareMessage('❌ Failed');
      setTimeout(() => setShareMessage(null), 3000);
    }
  };

  const handleToggleRunning = async () => {
    if (!isRunning) {
      await executeScriptsAsync();
    }
    toggleRunning();
  };

  const handleStep = async () => {
    await executeScriptsAsync();
    step();
  };

  return (
    <Draggable
      handle=".toolbar-header"
      defaultPosition={defaultPosition}
      nodeRef={nodeRef}
    >
      <div ref={nodeRef} className={`draggable-toolbar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="toolbar-header">
          <span className="toolbar-title">
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt="Systemica"
              className="toolbar-logo"
            />
            Systemica
          </span>
          <div className="toolbar-header-controls">
            <button 
              className="toolbar-collapse-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? '▼' : '▲'}
            </button>
          </div>
        </div>
        
        {!isCollapsed && (
          <div className="toolbar-content">
            {/* Simulation Controls */}
            <div className="toolbar-section">
              <div className="section-label">Simulation</div>
              <div className="toolbar-buttons">
                <button onClick={handleToggleRunning} className={isRunning ? 'active' : ''} title={isRunning ? 'Pause' : 'Play'}>
                  {isRunning ? '⏸️' : '▶️'}
                </button>
                <button onClick={handleStep} title="Step">⏭️</button>
                <button onClick={reset} title="Reset">🔄</button>
              </div>
              <div className="speed-control">
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={ticksPerSecond}
                  onChange={(e) => setTicksPerSecond(parseFloat(e.target.value))}
                  title={`Speed: ${ticksPerSecond.toFixed(1)} tick/s`}
                />
                <span className="speed-value">{ticksPerSecond.toFixed(1)}x</span>
              </div>
            </div>

            {/* Edit Controls */}
            <div className="toolbar-section">
              <div className="section-label">Edit</div>
              <div className="toolbar-buttons">
                <button onClick={undo} disabled={!canUndo()} title="Undo (Ctrl+Z)">↩️</button>
                <button onClick={redo} disabled={!canRedo()} title="Redo (Ctrl+Y)">↪️</button>
                <button onClick={copySelected} disabled={selectedNodeIds.length === 0} title="Copy (Ctrl+C)">📋</button>
                <button onClick={paste} disabled={!clipboard} title="Paste (Ctrl+V)">📄</button>
              </div>
            </div>

            {/* File Controls */}
            <div className="toolbar-section">
              <div className="section-label">File</div>
              <div className="toolbar-buttons">
                <button onClick={handleNew} title="New project">📄</button>
                <button onClick={handleClearCanvas} title="Clear canvas (undoable)">🧹</button>
                <button onClick={handleSave} title="Save project">💾</button>
                <button onClick={handleLoad} title="Load project">📂</button>
                <button onClick={exportStatsToCSV} disabled={resourceHistory.length === 0} title="Export CSV">📊</button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Share & View */}
            <div className="toolbar-section">
              <div className="section-label">Share</div>
              <div className="toolbar-buttons">
                <button onClick={handleShare} disabled={nodes.length === 0} title="Copy shareable link">
                  🔗
                </button>
                <button onClick={onToggleChart} title={showChart ? 'Hide chart' : 'Show chart'}>
                  {showChart ? '📈' : '📉'}
                </button>
                {shareMessage && <span className="share-msg">{shareMessage}</span>}
              </div>
            </div>

            {/* Templates */}
            <div className="toolbar-section">
              <div className="section-label">Templates</div>
              <TemplateDropdown />
            </div>
          </div>
        )}
      </div>
    </Draggable>
  );
}
