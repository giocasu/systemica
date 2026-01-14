import { useEffect, useState } from 'react';
import { useSimulatorStore } from '../store/simulatorStore';
import { NodeData, nodeConfig, ProcessingMode, DistributionMode } from '../types';
import { validateFormula } from '../utils/formulaEvaluator';
import { validateScript } from '../utils/scriptRunner';
import { TokenSelector } from './TokenSelector';
import { TokenEditorModal } from './TokenEditorModal';

interface PropertiesPanelProps {
  nodeId: string;
}

export function PropertiesPanel({ nodeId }: PropertiesPanelProps) {
  const { nodes, updateNodeData } = useSimulatorStore();
  const node = nodes.find((n) => n.id === nodeId);
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [formulaValid, setFormulaValid] = useState<boolean>(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [scriptValid, setScriptValid] = useState<boolean>(false);
  const [validatingScript, setValidatingScript] = useState(false);
  const [capacityDraft, setCapacityDraft] = useState<string | null>(null);
  const [maxProductionDraft, setMaxProductionDraft] = useState<string | null>(null);
  const [showTokenEditor, setShowTokenEditor] = useState(false);

  useEffect(() => {
    setCapacityDraft(null);
    setMaxProductionDraft(null);
  }, [nodeId]);

  if (!node) return null;

  const data = node.data as NodeData;
  const typeInfo = nodeConfig[data.nodeType];
  const activationMode = data.activationMode ?? 'auto';
  
  // Determine current processing mode (support legacy useFormula)
  const currentMode: ProcessingMode = data.processingMode || (data.useFormula ? 'formula' : 'fixed');
  
  // Can this node type use processing modes? (source and converter)
  const supportsProcessingModes = data.nodeType === 'source' || data.nodeType === 'converter';

  const handleChange = (field: keyof NodeData, value: unknown) => {
    updateNodeData(nodeId, { [field]: value });
  };
  
  const handleModeChange = (mode: ProcessingMode) => {
    handleChange('processingMode', mode);
    // Also update legacy flag for backwards compatibility
    handleChange('useFormula', mode === 'formula');
  };

  return (
    <div className="properties-panel">
      <h3>📝 Properties</h3>

      <div className="property-type">
        <span className="type-icon">{typeInfo.icon}</span>
        <span className="type-label">{typeInfo.label}</span>
      </div>

      <div className="property-group">
        <label>Label</label>
        <input
          type="text"
          value={data.label}
          onChange={(e) => handleChange('label', e.target.value)}
        />
      </div>

      {/* Token Type for Source */}
      {data.nodeType === 'source' && (
        <div className="property-group">
          <label>Token Type</label>
          <TokenSelector
            value={data.tokenType || 'black'}
            onChange={(tokenId) => handleChange('tokenType', tokenId)}
            onCreateNew={() => setShowTokenEditor(true)}
          />
        </div>
      )}

      {/* Resources - buffer for all nodes */}
      <div className="property-group">
        <label>
          {data.nodeType === 'source'
            ? 'Buffer'
            : data.nodeType === 'drain'
              ? 'Consumed (counter)'
              : 'Resources'}
        </label>
        <input
          type="number"
          value={data.resources}
          min={0}
          step={0.1}
          onChange={(e) => handleChange('resources', parseFloat(e.target.value) || 0)}
        />
        {data.nodeType === 'drain' && (
          <div className="property-group info">
            <span>🧾 This counter increases when resources are drained.</span>
          </div>
        )}
      </div>

      {/* Capacity for Pool and Source buffer */}
      {(data.nodeType === 'pool' || data.nodeType === 'source') && (
        <div className="property-group">
          <label>Buffer Capacity (-1 = unlimited)</label>
          <input
            type="number"
            value={capacityDraft ?? String(data.capacity)}
            min={-1}
            step={1}
            onChange={(e) => {
              const next = e.target.value;
              setCapacityDraft(next);
              if (next.trim() === '') return;
              const parsed = parseFloat(next);
              if (Number.isNaN(parsed)) return;
              handleChange('capacity', parsed);
            }}
            onBlur={() => {
              if (capacityDraft === null) return;
              const next = capacityDraft.trim();
              setCapacityDraft(null);
              if (next === '') return;
              const parsed = parseFloat(next);
              if (Number.isNaN(parsed)) return;
              handleChange('capacity', parsed);
            }}
          />
        </div>
      )}

      {/* Max Production for Source = total that can ever be produced */}
      {data.nodeType === 'source' && (
        <>
          <div className="property-group">
            <label>Max Total Production (-1 = infinite)</label>
            <input
              type="number"
              value={maxProductionDraft ?? String(data.maxProduction)}
              min={-1}
              step={1}
              onChange={(e) => {
                const next = e.target.value;
                setMaxProductionDraft(next);
                if (next.trim() === '') return;
                const parsed = parseFloat(next);
                if (Number.isNaN(parsed)) return;
                handleChange('maxProduction', parsed);
              }}
              onBlur={() => {
                if (maxProductionDraft === null) return;
                const next = maxProductionDraft.trim();
                setMaxProductionDraft(null);
                if (next === '') return;
                const parsed = parseFloat(next);
                if (Number.isNaN(parsed)) return;
                handleChange('maxProduction', parsed);
              }}
            />
          </div>
          {data.maxProduction !== -1 && (
            <div className="property-group info">
              <span style={{ fontSize: '11px', color: (data.totalProduced ?? 0) >= data.maxProduction ? '#e74c3c' : '#888' }}>
                {(data.totalProduced ?? 0) >= data.maxProduction 
                  ? '⛔ Exhausted!' 
                  : `📊 Produced: ${data.totalProduced ?? 0} / ${data.maxProduction} (${Math.round((data.totalProduced ?? 0) / data.maxProduction * 100)}%)`}
              </span>
            </div>
          )}
        </>
      )}

      {/* Processing Mode Selection for Source and Converter */}
      {supportsProcessingModes && (
        <div className="property-group">
          <label>Processing Mode</label>
          <div className="mode-selector">
            <button 
              className={`mode-btn ${currentMode === 'fixed' ? 'active' : ''}`}
              onClick={() => handleModeChange('fixed')}
            >
              📊 Fixed
            </button>
            <button 
              className={`mode-btn ${currentMode === 'formula' ? 'active' : ''}`}
              onClick={() => handleModeChange('formula')}
            >
              📐 Formula
            </button>
            <button 
              className={`mode-btn ${currentMode === 'script' ? 'active' : ''}`}
              onClick={() => handleModeChange('script')}
            >
              📜 Script
            </button>
          </div>
        </div>
      )}

      {/* Activation Mode for Source */}
      {data.nodeType === 'source' && (
        <div className="property-group">
          <label>Activation Mode</label>
          <div className="mode-selector">
            <button
              className={`mode-btn ${activationMode === 'auto' ? 'active' : ''}`}
              onClick={() => handleChange('activationMode', 'auto')}
            >
              ⏱️ Auto (per tick)
            </button>
            <button
              className={`mode-btn ${activationMode === 'manual' ? 'active' : ''}`}
              onClick={() => handleChange('activationMode', 'manual')}
            >
              🖱️ Manual (click)
            </button>
          </div>
          {activationMode === 'manual' && (
            <div className="property-group info">
              <span>Click the Source node to produce once.</span>
            </div>
          )}
        </div>
      )}

      {/* Distribution Mode for Source (how resources are distributed to multiple outputs) */}
      {data.nodeType === 'source' && (
        <div className="property-group">
          <label>Distribution Mode</label>
          <div className="mode-selector">
            <button 
              className={`mode-btn ${(data.distributionMode ?? 'continuous') === 'continuous' ? 'active' : ''}`}
              onClick={() => handleChange('distributionMode', 'continuous' as DistributionMode)}
              title="Divisible resources (water, energy, money) - split equally among outputs"
            >
              💧 Continuous
            </button>
            <button 
              className={`mode-btn ${data.distributionMode === 'discrete' ? 'active' : ''}`}
              onClick={() => handleChange('distributionMode', 'discrete' as DistributionMode)}
              title="Atomic resources (items, cards, bolts) - round-robin distribution"
            >
              🔩 Discrete
            </button>
          </div>
          <div className="property-group info">
            <span style={{ fontSize: '11px', color: '#888' }}>
              {(data.distributionMode ?? 'continuous') === 'continuous' 
                ? '💧 Divisible: 1/tick → 2 outputs = 0.5 each' 
                : '🔩 Atomic: 1/tick → 2 outputs = alternating 1,0,1,0...'}
            </span>
          </div>
        </div>
      )}

      {/* Fixed Mode: Show rate or ratio inputs */}
      {supportsProcessingModes && currentMode === 'fixed' && (
        <>
          {data.nodeType === 'source' && (
            <div className="property-group">
              <label>Production Rate (per tick)</label>
              <input
                type="number"
                value={data.productionRate}
                min={0}
                step={0.1}
                onChange={(e) => handleChange('productionRate', parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
          {data.nodeType === 'converter' && (
            <>
              <div className="property-group">
                <label>Input Ratio (resources consumed)</label>
                <input
                  type="number"
                  value={data.inputRatio}
                  min={0.1}
                  step={0.1}
                  onChange={(e) => handleChange('inputRatio', parseFloat(e.target.value) || 1)}
                />
              </div>
              <div className="property-group">
                <label>Output Ratio (resources produced)</label>
                <input
                  type="number"
                  value={data.outputRatio}
                  min={0.1}
                  step={0.1}
                  onChange={(e) => handleChange('outputRatio', parseFloat(e.target.value) || 1)}
                />
              </div>
              <div className="property-group info">
                <span>⚙️ Converts {data.inputRatio} → {data.outputRatio}</span>
              </div>
            </>
          )}
        </>
      )}

      {/* Formula Mode: Show formula input */}
      {supportsProcessingModes && currentMode === 'formula' && (
        <div className="property-group formula-section">
          <label>Formula</label>
          <input
            type="text"
            value={data.formula ?? ''}
            placeholder={data.nodeType === 'converter' ? "e.g., floor(input * 0.5)" : "e.g., resources * 0.1"}
            className={formulaError ? 'error' : formulaValid ? 'valid' : ''}
            onChange={(e) => {
              const formula = e.target.value;
              handleChange('formula', formula);
              setFormulaError(null);
              setFormulaValid(false);
            }}
          />
          <button 
            className="validate-btn"
            onClick={() => {
              const error = validateFormula(data.formula ?? '');
              setFormulaError(error);
              setFormulaValid(!error && !!data.formula);
            }}
          >
            ✓ Validate
          </button>
          {formulaError && <span className="formula-error">❌ {formulaError}</span>}
          {formulaValid && <span className="formula-valid">✅ Formula valid!</span>}
          <div className="formula-help">
            <small>⚠️ Only expressions, NO "return" or ";"</small>
            <small>
              Variables:{' '}
              {data.nodeType === 'converter' ? 'input, ' : ''}
              resources, tick, capacity
              {data.nodeType === 'source' ? ', totalProduced (alias: produced)' : ''}
            </small>
            <small>Functions: min, max, floor, ceil, round, abs, sqrt, pow, sin, cos, tan, log, exp, random</small>
            <small>Constants: PI, E</small>
          </div>
        </div>
      )}

      {/* Script Mode: Show script editor */}
      {supportsProcessingModes && currentMode === 'script' && (
        <div className="property-group script-section">
          <label>Script (JavaScript)</label>
          <textarea
            value={data.script ?? ''}
            placeholder={`// Return a number\n${data.nodeType === 'converter' ? 'return floor(input * 0.5);' : 'return resources * 0.1;'}`}
            className={scriptError ? 'error' : scriptValid ? 'valid' : ''}
            rows={8}
            onChange={(e) => {
              handleChange('script', e.target.value);
              setScriptError(null);
              setScriptValid(false);
            }}
          />
          <button 
            className="validate-btn"
            disabled={validatingScript}
            onClick={async () => {
              const script = data.script ?? '';
              if (!script.trim()) return;
              setValidatingScript(true);
              const error = await validateScript(script);
              setScriptError(error);
              setScriptValid(!error);
              setValidatingScript(false);
            }}
          >
            {validatingScript ? '⏳ Validating...' : '✓ Validate'}
          </button>
          {scriptError && <span className="script-error">❌ {scriptError}</span>}
          {scriptValid && <span className="script-valid">✅ Script valid!</span>}
          {!!data.scriptState?.lastError && (
            <span className="script-error">⚠️ Runtime: {String(data.scriptState.lastError)}</span>
          )}
          {typeof (data.scriptState as { lastOutput?: unknown } | undefined)?.lastOutput === 'number' && (
            <span className="script-valid">
              ℹ️ Last output: {(data.scriptState as { lastOutput: number }).lastOutput}
            </span>
          )}
          <div className="script-help">
            <details>
              <summary>📖 Script API Reference</summary>
              <div className="script-api">
                <strong>Variables:</strong>
                <ul>
                  <li>
                    <code>input</code> - Resources to process{data.nodeType === 'converter' ? ' (accumulated)' : ' (same as resources for Source)'}
                  </li>
                  <li><code>resources</code> - Current node resources (Source buffer)</li>
                  <li><code>capacity</code> - Node capacity (Infinity if unlimited)</li>
                  <li><code>capacityRaw</code> - Raw capacity (-1 if unlimited)</li>
                  <li><code>tick</code> - Current simulation tick</li>
                  {data.nodeType === 'source' && (
                    <>
                      <li><code>buffer</code> - Alias for <code>resources</code></li>
                      <li><code>bufferCapacity</code> - Alias for <code>capacity</code></li>
                      <li><code>bufferCapacityRaw</code> - Alias for <code>capacityRaw</code></li>
                      <li><code>totalProduced</code> / <code>produced</code> - Total produced so far</li>
                      <li><code>maxProduction</code> / <code>maxTotalProduction</code> - Max total production (Infinity if unlimited)</li>
                      <li><code>maxProductionRaw</code> / <code>maxTotalProductionRaw</code> - Raw max production (-1 if unlimited)</li>
                    </>
                  )}
                </ul>
                <strong>Functions:</strong>
                <ul>
                  <li><code>getNode(id)</code> - Get another node's data</li>
                  <li><code>min, max, floor, ceil, round, abs, sqrt, pow</code></li>
                  <li><code>sin, cos, tan, log, exp, random</code></li>
                  <li><code>PI</code>, <code>E</code></li>
                </ul>
                <strong>State (persists between ticks):</strong>
                <ul>
                  <li><code>state.myVar = 5;</code> - Set state</li>
                  <li><code>const x = state.myVar || 0;</code> - Read state</li>
                </ul>
                <strong>Example:</strong>
                <pre>{`const market = getNode("market");
const bonus = market ? market.resources * 0.1 : 0;
return floor(input + bonus);`}</pre>
              </div>
            </details>
          </div>
        </div>
      )}

      {data.nodeType === 'gate' && (
        <>
          <div className="property-group">
            <label>Condition</label>
            <select
              value={data.gateCondition ?? 'always'}
              onChange={(e) => handleChange('gateCondition', e.target.value)}
            >
              <option value="always">Always flow</option>
              <option value="if_above">If resources above threshold</option>
              <option value="if_below">If resources below threshold</option>
            </select>
          </div>
          {data.gateCondition !== 'always' && (
            <div className="property-group">
              <label>Threshold</label>
              <input
                type="number"
                value={data.gateThreshold ?? 0}
                min={0}
                step={0.1}
                onChange={(e) => handleChange('gateThreshold', parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
          <div className="property-group info">
            <span>🚪 {
              data.gateCondition === 'always' ? 'Always open' :
              data.gateCondition === 'if_above' ? `Open if > ${data.gateThreshold}` :
              `Open if < ${data.gateThreshold}`
            }</span>
          </div>
        </>
      )}

      <div className="property-group">
        <label>Active</label>
        <select
          value={data.isActive ? 'true' : 'false'}
          onChange={(e) => handleChange('isActive', e.target.value === 'true')}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>

      <div className="property-group">
        <label>Probability (0-100%)</label>
        <div className="probability-input">
          <input
            type="range"
            min={0}
            max={100}
            value={data.probability ?? 100}
            onChange={(e) => handleChange('probability', parseInt(e.target.value))}
          />
          <span className="probability-value">{data.probability ?? 100}%</span>
        </div>
        {(data.probability ?? 100) < 100 && (
          <div className="property-group info">
            <span>🎲 {data.probability}% chance per tick</span>
          </div>
        )}
        {data.nodeType === 'source' && activationMode === 'manual' && (
          <div className="property-group info">
            <span>ⓘ Probability is ignored in manual mode.</span>
          </div>
        )}
      </div>

      {/* Token Editor Modal */}
      <TokenEditorModal
        isOpen={showTokenEditor}
        onClose={() => setShowTokenEditor(false)}
      />
    </div>
  );
}
