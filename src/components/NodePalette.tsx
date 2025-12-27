import { NodeType, nodeConfig } from '../types';

export function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="node-palette-content">
      {(Object.keys(nodeConfig) as NodeType[]).map((type) => (
        <div
          key={type}
          className="palette-item-vertical"
          draggable
          onDragStart={(e) => onDragStart(e, type)}
          title={`Drag to add ${nodeConfig[type].label}`}
        >
          <span className="palette-icon">{nodeConfig[type].icon}</span>
          <span className="palette-label">{nodeConfig[type].label}</span>
        </div>
      ))}
    </div>
  );
}
