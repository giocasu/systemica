import { useRef } from 'react';
import { useSimulatorStore } from '../store/simulatorStore';
import { NodeType, nodeConfig } from '../types';

export function Toolbar() {
  const { isRunning, toggleRunning, step, reset, exportToFile, importFromFile } = useSimulatorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
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
      <h1>🎮 Game Economy Simulator</h1>
      
      <div className="controls">
        <button onClick={toggleRunning} className={isRunning ? 'active' : ''}>
          {isRunning ? '⏸️ Pause' : '▶️ Play'}
        </button>
        <button onClick={step}>⏭️ Step</button>
        <button onClick={reset}>🔄 Reset</button>
      </div>

      <span className="separator">|</span>

      <div className="controls">
        <button onClick={handleSave}>💾 Save</button>
        <button onClick={handleLoad}>📂 Load</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      <span className="separator">|</span>

      <div className="node-palette">
        {(Object.keys(nodeConfig) as NodeType[]).map((type) => (
          <div
            key={type}
            className="palette-item"
            draggable
            onDragStart={(e) => onDragStart(e, type)}
          >
            <span className="palette-icon">{nodeConfig[type].icon}</span>
            <span className="palette-label">{nodeConfig[type].label}</span>
          </div>
        ))}
      </div>
    </header>
  );
}
