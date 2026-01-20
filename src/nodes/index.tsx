import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NodeData, ProcessingMode } from '../types';
import { useSimulatorStore } from '../store/simulatorStore';
import { useTokenStore } from '../store/tokenStore';

// Props for our custom nodes
interface CustomNodeProps {
  id: string;
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
export const SourceNode = memo(({ id, data, selected }: CustomNodeProps) => {
  const triggerSource = useSimulatorStore((state) => state.triggerSource);
  const isRunning = useSimulatorStore((state) => state.isRunning);
  const getToken = useTokenStore((state) => state.getToken);
  const mode = getMode(data);
  const activationMode = data.activationMode ?? 'auto';
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
  
  // Get token info for badge
  const tokenType = data.tokenType || 'black';
  const token = getToken(tokenType);
  
  return (
    <div className={`custom-node node-source ${activeClass} ${selected ? 'selected' : ''} ${isExhausted ? 'exhausted' : ''}`}>
      {/* Token badge */}
      <div 
        className="token-badge" 
        style={{ backgroundColor: token?.color || '#1a1a2e' }}
        title={token?.name || 'Black'}
      >
        {token?.emoji || '⚫'}
      </div>
      <div className="node-label">{data.label}</div>
      <div className="node-value">{formatResources(data.resources)}</div>
      {isExhausted && <div className="node-rate exhausted-label">⛔ exhausted</div>}
      {!isExhausted && maxProd !== -1 && (
        <div className="node-rate">{formatResources(totalProduced)}/{maxProd}</div>
      )}
      {!isExhausted && lastProduced > 0 ? (
        <div className="node-rate">
          {modePrefix} +{formatResources(lastProduced)}/{activationMode === 'manual' ? 'click' : 'tick'}
          {lastSent > 0 ? ` (out ${formatResources(lastSent)})` : ''}
        </div>
      ) : !isExhausted && activationMode === 'manual' ? (
        <div className="node-rate">
          {mode === 'script'
            ? '📜 script/click'
            : mode === 'formula' && data.formula
              ? '📐 f(x)/click'
              : data.productionRate > 0
                ? `+${formatResources(data.productionRate)}/click`
                : '🖱️ click to produce'}
        </div>
      ) : !isExhausted && mode === 'script' ? (
        <div className="node-rate">📜 script</div>
      ) : !isExhausted && mode === 'formula' && data.formula ? (
        <div className="node-rate">📐 f(x)</div>
      ) : !isExhausted && data.productionRate > 0 ? (
        <div className="node-rate">+{formatResources(data.productionRate)}/tick</div>
      ) : null}
      {activationMode === 'manual' && !isExhausted && (
        <button
          className="node-action"
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            triggerSource(id);
          }}
          title={isRunning ? 'Produce once' : 'Start simulation to enable'}
          disabled={!data.isActive || !isRunning}
        >
          ⚡ Produce
        </button>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

// Pool Node - stores resources (multi-token support)
export const PoolNode = memo(({ data, selected }: CustomNodeProps) => {
  const getToken = useTokenStore((state) => state.getToken);
  const lastReceived = typeof data.lastReceived === 'number' ? data.lastReceived : 0;
  const lastSent = typeof data.lastSent === 'number' ? data.lastSent : 0;
  const delta = lastReceived - lastSent;
  const activeClass = lastReceived > 0 ? 'pool-active' : '';
  
  // Get typed resources (or fall back to legacy single resource)
  const typedResources = data.typedResources || {};
  const hasTypedResources = Object.keys(typedResources).length > 0;
  const tokenEntries = Object.entries(typedResources).filter(([_, amount]) => amount > 0);
  
  // Calculate total resources
  const totalResources = hasTypedResources 
    ? Object.values(typedResources).reduce((sum, v) => sum + v, 0)
    : data.resources;
  
  return (
    <div className={`custom-node node-pool ${activeClass} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-label">{data.label}</div>
      
      {/* Show total resources prominently */}
      <div className="node-value">{formatResources(totalResources)}</div>
      
      {/* Show typed resources breakdown if multiple token types */}
      {hasTypedResources && tokenEntries.length > 1 && (
        <div className="token-resources">
          {tokenEntries.slice(0, 4).map(([tokenId, amount]) => {
            const token = getToken(tokenId);
            return (
              <div key={tokenId} className="token-resource-item" title={token?.name || tokenId}>
                <span 
                  className="token-dot" 
                  style={{ backgroundColor: token?.color || '#666' }}
                />
                <span className="token-amount">{formatResources(amount)}</span>
              </div>
            );
          })}
          {tokenEntries.length > 4 && (
            <div className="token-more">+{tokenEntries.length - 4}</div>
          )}
        </div>
      )}
      
      {data.capacity > 0 && <div className="node-rate">max: {formatResources(data.capacity)}</div>}
      {(lastReceived > 0 || lastSent > 0) && (
        <div className="node-rate">
          Δ {delta >= 0 ? '+' : ''}{formatResources(delta)}/tick
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

// Converter Node - transforms resources (multi-token recipe support)
export const ConverterNode = memo(({ data, selected }: CustomNodeProps) => {
  const getToken = useTokenStore((state) => state.getToken);
  const mode = getMode(data);
  const lastConverted = typeof data.lastConverted === 'number' ? data.lastConverted : 0;
  const activeClass = lastConverted > 0 ? 'converter-active' : '';
  const recipe = data.recipe;
  
  // Build recipe display
  const renderRecipe = () => {
    if (recipe && recipe.inputs.length > 0) {
      // Multi-token recipe
      const inputParts = recipe.inputs.map(({ tokenId, amount }) => {
        const token = getToken(tokenId);
        return `${amount}${token?.emoji || '●'}`;
      }).join('+');
      
      const outputParts = recipe.outputs.map(({ tokenId, amount }) => {
        const token = getToken(tokenId);
        return `${amount}${token?.emoji || '●'}`;
      }).join('+');
      
      return `${inputParts}→${outputParts}`;
    }
    
    // Legacy ratio display
    return `${data.inputRatio}→${data.outputRatio}`;
  };
  
  return (
    <div className={`custom-node node-converter ${activeClass} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-label">{data.label}</div>
      <div className="node-value">{formatResources(data.resources)}</div>
      {mode === 'script' ? (
        <div className="node-ratio">⚙️ 📜</div>
      ) : mode === 'formula' && data.formula ? (
        <div className="node-ratio">⚙️ f(x)→out</div>
      ) : (
        <div className="node-ratio">⚙️ {renderRecipe()}</div>
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

// Trader Node - exchanges resources between two inputs/outputs
// Input A (top-left) → Output B (bottom-right)
// Input B (bottom-left) → Output A (top-right)
export const TraderNode = memo(({ data, selected }: CustomNodeProps) => {
  const inputA = data.traderInputA ?? 0;
  const inputB = data.traderInputB ?? 0;
  const lastSent = typeof data.lastSent === 'number' ? data.lastSent : 0;
  const activeClass = lastSent > 0 ? 'trader-active' : '';
  
  return (
    <div className={`custom-node node-trader ${activeClass} ${selected ? 'selected' : ''}`}>
      {/* Two input handles on the left */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input-a"
        style={{ top: '30%' }}
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input-b"
        style={{ top: '70%' }}
      />
      
      <div className="node-label">{data.label}</div>
      <div className="trader-icon">⇄</div>
      <div className="trader-buffers">
        <span className="trader-buffer-a" title="Input A buffer">{formatResources(inputA)}</span>
        <span className="trader-separator">↔</span>
        <span className="trader-buffer-b" title="Input B buffer">{formatResources(inputB)}</span>
      </div>
      {lastSent > 0 && (
        <div className="node-rate">exchanged {formatResources(lastSent)}/tick</div>
      )}
      
      {/* Two output handles on the right - crossed */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="output-a"
        style={{ top: '30%' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="output-b"
        style={{ top: '70%' }}
      />
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
  trader: TraderNode,
};
