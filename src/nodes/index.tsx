import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeData } from '../types';

// Props for our custom nodes
interface CustomNodeProps {
  data: NodeData;
  selected?: boolean;
}

interface BaseNodeProps extends CustomNodeProps {
  className: string;
}

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

// Source Node - produces resources
export const SourceNode = memo(({ data, selected }: CustomNodeProps) => (
  <BaseNode data={data} selected={selected} className="node-source" />
));

// Pool Node - stores resources
export const PoolNode = memo(({ data, selected }: CustomNodeProps) => (
  <BaseNode data={data} selected={selected} className="node-pool" />
));

// Drain Node - consumes resources
export const DrainNode = memo(({ data, selected }: CustomNodeProps) => (
  <BaseNode data={data} selected={selected} className="node-drain" />
));

// Converter Node - transforms resources
export const ConverterNode = memo(({ data, selected }: CustomNodeProps) => (
  <div className={`custom-node node-converter ${selected ? 'selected' : ''}`}>
    <Handle type="target" position={Position.Left} />
    <div className="node-label">{data.label}</div>
    <div className="node-value">{data.resources}</div>
    <div className="node-ratio">⚙️ {data.inputRatio}→{data.outputRatio}</div>
    <Handle type="source" position={Position.Right} />
  </div>
));

// Gate Node - controls flow
export const GateNode = memo(({ data, selected }: CustomNodeProps) => (
  <BaseNode data={data} selected={selected} className="node-gate" />
));

// Export all node types for React Flow
export const nodeTypes = {
  source: SourceNode,
  pool: PoolNode,
  drain: DrainNode,
  converter: ConverterNode,
  gate: GateNode,
};
