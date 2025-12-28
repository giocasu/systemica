import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeData, ProcessingMode } from '../types';

// Props for our custom nodes
interface CustomNodeProps {
  data: NodeData;
  selected?: boolean;
}

// Helper to get processing mode (supports legacy useFormula)
const getMode = (data: NodeData): ProcessingMode => {
  return data.processingMode || (data.useFormula ? 'formula' : 'fixed');
};

// Helper to format resources with appropriate decimals
const formatResources = (val: number): string => {
  if (val === 0) return '0';
  if (Number.isInteger(val)) return val.toString();
  // Show up to 2 decimals, but remove trailing zeros
  return parseFloat(val.toFixed(2)).toString();
};


// Source Node - produces resources (NO input handle - sources only produce)
export const SourceNode = memo(({ data, selected }: CustomNodeProps) => {
  const mode = getMode(data);
  const maxProd = data.maxProduction ?? -1;
  const totalProduced = data.totalProduced ?? 0;
  const isExhausted = maxProd !== -1 && totalProduced >= maxProd;
  const lastProduced = typeof data.lastProduced === 'number' ? data.lastProduced : 0;
  const lastSent = typeof data.lastSent === 'number' ? data.lastSent : 0;
  const activeClass = lastProduced > 0 ? 'source-active' : '';
  const modePrefix =
    mode === 'script'
      ? '📜'
      : mode === 'formula' && data.formula
        ? '📐'
        : '📊';
  
  return (
    <div className={`custom-node node-source ${activeClass} ${selected ? 'selected' : ''} ${isExhausted ? 'exhausted' : ''}`}>
      <div className="node-label">{data.label}</div>
      <div className="node-value">{formatResources(data.resources)}</div>
      {isExhausted && <div className="node-rate exhausted-label">⛔ exhausted</div>}
      {!isExhausted && maxProd !== -1 && (
        <div className="node-rate">{formatResources(totalProduced)}/{maxProd}</div>
      )}
      {!isExhausted && lastProduced > 0 ? (
        <div className="node-rate">
          {modePrefix} +{formatResources(lastProduced)}/tick{lastSent > 0 ? ` (out ${formatResources(lastSent)})` : ''}
        </div>
      ) : !isExhausted && mode === 'script' ? (
        <div className="node-rate">📜 script</div>
      ) : !isExhausted && mode === 'formula' && data.formula ? (
        <div className="node-rate">📐 f(x)</div>
      ) : !isExhausted && data.productionRate > 0 ? (
        <div className="node-rate">+{formatResources(data.productionRate)}/tick</div>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

// Pool Node - stores resources
export const PoolNode = memo(({ data, selected }: CustomNodeProps) => {
  const lastReceived = typeof data.lastReceived === 'number' ? data.lastReceived : 0;
  const lastSent = typeof data.lastSent === 'number' ? data.lastSent : 0;
  const delta = lastReceived - lastSent;
  const activeClass = lastReceived > 0 ? 'pool-active' : '';
  return (
    <div className={`custom-node node-pool ${activeClass} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-label">{data.label}</div>
      <div className="node-value">{formatResources(data.resources)}</div>
      {data.capacity > 0 && <div className="node-rate">max: {formatResources(data.capacity)}</div>}
      {(lastReceived > 0 || lastSent > 0) && (
        <div className="node-rate">
          Δ {delta >= 0 ? '+' : ''}{formatResources(delta)}/tick (in {formatResources(lastReceived)} / out {formatResources(lastSent)})
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

// Drain Node - consumes resources
export const DrainNode = memo(({ data, selected }: CustomNodeProps) => {
  const lastConsumed = typeof data.lastConsumed === 'number' ? data.lastConsumed : 0;
  const activeClass = lastConsumed > 0 ? 'drain-active' : '';
  return (
    <div className={`custom-node node-drain ${activeClass} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-label">{data.label}</div>
      <div className="node-value">{formatResources(data.resources)}</div>
      {lastConsumed > 0 && (
        <div className="node-rate">-{formatResources(lastConsumed)}/tick</div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

// Converter Node - transforms resources
export const ConverterNode = memo(({ data, selected }: CustomNodeProps) => {
  const mode = getMode(data);
  const lastConverted = typeof data.lastConverted === 'number' ? data.lastConverted : 0;
  const activeClass = lastConverted > 0 ? 'converter-active' : '';
  
  return (
    <div className={`custom-node node-converter ${activeClass} ${selected ? 'selected' : ''}`}>
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
      {lastConverted > 0 && <div className="node-rate">→ +{formatResources(lastConverted)}/tick</div>}
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
