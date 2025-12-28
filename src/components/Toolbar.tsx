import { useRef } from 'react';
import { useSimulatorStore } from '../store/simulatorStore';
import { TemplateDropdown } from './TemplateDropdown';

export function Toolbar() {
  const { 
    isRunning, 
    toggleRunning, 
    step, 
    reset,
    clearCanvas,
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
    exportStatsToCSV,
    resourceHistory,
    nodes,
  } = useSimulatorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNew = () => {
    if (nodes.length === 0) {
      // Already empty, just clear localStorage
      localStorage.removeItem('game-economy-simulator');
      return;
    }
    if (confirm('Clear canvas? (You can undo with Ctrl+Z)')) {
      clearCanvas();
      localStorage.removeItem('game-economy-simulator');
    }
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
    // Reset input so the same file can be loaded again
    event.target.value = '';
  };

  return (
    <header className="toolbar">
      <div className="brand">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Systemica" className="brand-logo" />
        <h1>Systemica</h1>
      </div>
      
      <div className="controls">
        <button onClick={toggleRunning} className={isRunning ? 'active' : ''}>
          {isRunning ? '⏸️ Pause' : '▶️ Play'}
        </button>
        <button onClick={step}>⏭️ Step</button>
        <button onClick={reset}>🔄 Reset</button>
        <div className="speed-control">
          <span>🏃</span>
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

      <span className="separator">|</span>

      <div className="controls">
        <button onClick={undo} disabled={!canUndo()} title="Undo (Ctrl+Z)">↩️</button>
        <button onClick={redo} disabled={!canRedo()} title="Redo (Ctrl+Y)">↪️</button>
        <button onClick={copySelected} disabled={selectedNodeIds.length === 0} title="Copy (Ctrl+C)">📋</button>
        <button onClick={paste} disabled={!clipboard} title="Paste (Ctrl+V)">📄</button>
      </div>

      <span className="separator">|</span>

      <div className="controls">
        <button onClick={handleNew} title="Clear canvas (undoable)">🗑️ Clear</button>
        <button onClick={handleSave}>💾 Save</button>
        <button onClick={handleLoad}>📂 Load</button>
        <button onClick={exportStatsToCSV} disabled={resourceHistory.length === 0} title="Export stats to CSV">📊 CSV</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      <span className="separator">|</span>

      <TemplateDropdown />
    </header>
  );
}
