import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useReactFlow } from '@xyflow/react';
import { NodeType, nodeConfig } from '../types';
import { useSimulatorStore } from '../store/simulatorStore';

const LONG_PRESS_MS = 250;
const MOVE_TOLERANCE_PX = 6;

interface NodePaletteProps {
  flowWrapperRef: RefObject<HTMLDivElement>;
}

export function NodePalette({ flowWrapperRef }: NodePaletteProps) {
  const { addNode } = useSimulatorStore();
  const { screenToFlowPosition } = useReactFlow();

  const longPressTimeoutRef = useRef<number | null>(null);
  const dragStateRef = useRef<{
    type: NodeType;
    pointerId: number;
    ghost: HTMLDivElement;
  } | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const clearLongPress = () => {
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const cleanupDrag = () => {
    clearLongPress();
    startPosRef.current = null;

    if (dragStateRef.current) {
      dragStateRef.current.ghost.remove();
      dragStateRef.current = null;
    }

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
  };

  const updateGhostPosition = (ghost: HTMLDivElement, x: number, y: number) => {
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
  };

  const createGhost = (type: NodeType, x: number, y: number) => {
    const ghost = document.createElement('div');
    ghost.className = 'palette-drag-ghost';

    const icon = document.createElement('span');
    icon.className = 'palette-icon';
    icon.textContent = nodeConfig[type].icon;

    const label = document.createElement('span');
    label.className = 'palette-label';
    label.textContent = nodeConfig[type].label;

    ghost.appendChild(icon);
    ghost.appendChild(label);

    document.body.appendChild(ghost);
    updateGhostPosition(ghost, x, y);
    return ghost;
  };

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!startPosRef.current) return;

    if (!dragStateRef.current) {
      const dx = event.clientX - startPosRef.current.x;
      const dy = event.clientY - startPosRef.current.y;
      if (Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) {
        clearLongPress();
      }
      return;
    }

    updateGhostPosition(dragStateRef.current.ghost, event.clientX, event.clientY);
  }, []);

  const handlePointerUp = useCallback((event: PointerEvent) => {
    const dragState = dragStateRef.current;
    if (dragState) {
      const wrapper = flowWrapperRef.current;
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        const { clientX, clientY } = event;
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          const position = screenToFlowPosition({ x: clientX, y: clientY });
          addNode(dragState.type, position);
        }
      }
    }

    cleanupDrag();
  }, [addNode, flowWrapperRef, screenToFlowPosition]);

  const handlePointerDown = (event: React.PointerEvent, nodeType: NodeType) => {
    if (event.pointerType === 'mouse') return;
    if (dragStateRef.current) return;

    event.preventDefault();
    startPosRef.current = { x: event.clientX, y: event.clientY };

    clearLongPress();
    longPressTimeoutRef.current = window.setTimeout(() => {
      const ghost = createGhost(nodeType, event.clientX, event.clientY);
      dragStateRef.current = {
        type: nodeType,
        pointerId: event.pointerId,
        ghost,
      };
    }, LONG_PRESS_MS);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  useEffect(() => {
    return () => cleanupDrag();
  }, []);

  return (
    <div className="node-palette-content">
      {(Object.keys(nodeConfig) as NodeType[]).map((type) => (
        <div
          key={type}
          className="palette-item-vertical"
          draggable
          onDragStart={(e) => onDragStart(e, type)}
          onPointerDown={(e) => handlePointerDown(e, type)}
          title={`Drag to add ${nodeConfig[type].label}`}
        >
          <span className="palette-icon">{nodeConfig[type].icon}</span>
          <span className="palette-label">{nodeConfig[type].label}</span>
        </div>
      ))}
    </div>
  );
}
