import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeData, ProcessingMode } from '../types';

// Props for our custom nodes
interface CustomNodeProps {
  data: NodeData;
  selected?: boolean;
}

interface BaseNodeProps extends CustomNodeProps {
  className: string;
}

// Helper to get processing mode (supports legacy useFormula)
const getMode = (data: NodeData): ProcessingMode => {
  return data.processingMode || (data.useFormula ? 'formula' : 'fixed');
};

// Base node component
function BaseNode({ data, selected, className }: BaseNodeProps) {
  return (
    <div className={`custom-node ${className} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-label">{data.label}</div>
      <div className="node-value">{data.resources}</div>
      {data.productionRate > 0 && (
        <div className="node-rate">+{data.productionRate}/tick</div>
      )}
      {data.capacity > 0 && (
        <div className="node-rate">max: {data.capacity}</div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

// Source Node - produces resources (NO input handle - sources only produce)
export const SourceNode = memo(({ data, selected }: CustomNodeProps) => {
  const mode = getMode(data);
  
  return (
    <div className={`custom-node node-source ${selected ? 'selected' : ''}`}>
      <div className="node-label">{data.label}</div>
      <div className="node-value">{data.resources}</div>
      {mode === 'script' ? (
        <div className="node-rate">📜 script</div>
      ) : mode === 'formula' && data.formula ? (
        <div className="node-rate">📐 f(x)</div>
      ) : data.productionRate > 0 ? (
        <div className="node-rate">+{data.productionRate}/tick</div>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

// Pool Node - stores resources
export const PoolNode = memo(({ data, selected }: CustomNodeProps) => (
  <BaseNode data={data} selected={selected} className="node-pool" />
));

// Drain Node - consumes resources
export const DrainNode = memo(({ data, selected }: CustomNodeProps) => (
  <BaseNode data={data} selected={selected} className="node-drain" />
));

// Converter Node - transforms resources
export const ConverterNode = memo(({ data, selected }: CustomNodeProps) => {
  const mode = getMode(data);
  
  return (
    <div className={`custom-node node-converter ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-label">{data.label}</div>
      <div className="node-value">{data.resources}</div>
      {mode === 'script' ? (
        <div className="node-ratio">⚙️ 📜</div>
      ) : mode === 'formula' && data.formula ? (
        <div className="node-ratio">⚙️ f(x)→out</div>
      ) : (
        <div className="node-ratio">⚙️ {data.inputRatio}→{data.outputRatio}</div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

// Gate Node - controls flow with conditions
export const GateNode = memo(({ data, selected }: CustomNodeProps) => {
  const conditionLabel = data.gateCondition === 'always' 
    ? '🚪 Open' 
    : data.gateCondition === 'if_above' 
      ? `🚪 >${data.gateThreshold}` 
      : `🚪 <${data.gateThreshold}`;
  
  return (
    <div className={`custom-node node-gate ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-label">{data.label}</div>
      <div className="node-value">{data.resources}</div>
      <div className="node-condition">{conditionLabel}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

// Export all node types for React Flow
export const nodeTypes = {
  source: SourceNode,
  pool: PoolNode,
  drain: DrainNode,
  converter: ConverterNode,
  gate: GateNode,
};
