import { useState } from 'react';
import { useSimulatorStore } from '../store/simulatorStore';
import { NodeData, nodeConfig, ProcessingMode } from '../types';
import { validateFormula } from '../utils/formulaEvaluator';
import { validateScript } from '../utils/scriptRunner';

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

  if (!node) return null;

  const data = node.data as NodeData;
  const typeInfo = nodeConfig[data.nodeType];
  
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

      <div className="property-group">
        <label>Resources</label>
        <input
          type="number"
          value={data.resources}
          min={0}
          onChange={(e) => handleChange('resources', parseInt(e.target.value) || 0)}
        />
      </div>

      {data.nodeType === 'pool' && (
        <div className="property-group">
          <label>Capacity (-1 = unlimited)</label>
          <input
            type="number"
            value={data.capacity}
            min={-1}
            onChange={(e) => handleChange('capacity', parseInt(e.target.value) || -1)}
          />
        </div>
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
                onChange={(e) => handleChange('productionRate', parseInt(e.target.value) || 0)}
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
                  min={1}
                  onChange={(e) => handleChange('inputRatio', parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="property-group">
                <label>Output Ratio (resources produced)</label>
                <input
                  type="number"
                  value={data.outputRatio}
                  min={1}
                  onChange={(e) => handleChange('outputRatio', parseInt(e.target.value) || 1)}
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
            <small>Variables: {data.nodeType === 'converter' ? 'input, ' : ''}resources, tick, capacity</small>
            <small>Functions: min, max, floor, ceil, round, random, sqrt, pow</small>
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
          <div className="script-help">
            <details>
              <summary>📖 Script API Reference</summary>
              <div className="script-api">
                <strong>Variables:</strong>
                <ul>
                  <li><code>input</code> - Resources to process{data.nodeType === 'converter' ? ' (accumulated)' : ''}</li>
                  <li><code>resources</code> - Current node resources</li>
                  <li><code>capacity</code> - Node capacity</li>
                  <li><code>tick</code> - Current simulation tick</li>
                </ul>
                <strong>Functions:</strong>
                <ul>
                  <li><code>getNode(id)</code> - Get another node's data</li>
                  <li><code>min, max, floor, ceil, round, abs, sqrt, pow</code></li>
                  <li><code>sin, cos, tan, log, exp, random</code></li>
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
                onChange={(e) => handleChange('gateThreshold', parseInt(e.target.value) || 0)}
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
      </div>
    </div>
  );
}
