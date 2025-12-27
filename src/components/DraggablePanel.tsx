import { useState, ReactNode, useRef } from 'react';
import Draggable from 'react-draggable';

interface DraggablePanelProps {
  title: string;
  children: ReactNode;
  defaultPosition?: { x: number; y: number };
  onClose?: () => void;
  className?: string;
  minWidth?: number;
}

export function DraggablePanel({ 
  title, 
  children, 
  defaultPosition = { x: 0, y: 0 },
  onClose,
  className = '',
  minWidth = 250
}: DraggablePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  return (
    <Draggable 
      handle=".panel-header"
      defaultPosition={defaultPosition}
      nodeRef={nodeRef}
    >
      <div 
        ref={nodeRef}
        className={`draggable-panel ${className} ${isCollapsed ? 'collapsed' : ''}`}
        style={{ minWidth: isCollapsed ? 'auto' : minWidth }}
      >
        <div className="panel-header">
          <span className="panel-title">{title}</span>
          <div className="panel-controls">
            <button 
              className="panel-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? '▼' : '▲'}
            </button>
            {onClose && (
              <button 
                className="panel-btn panel-close"
                onClick={onClose}
                title="Close"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {!isCollapsed && (
          <div className="panel-content">
            {children}
          </div>
        )}
      </div>
    </Draggable>
  );
}
