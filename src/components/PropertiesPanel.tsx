import { useSimulatorStore } from '../store/simulatorStore';
import { NodeData } from '../types';

interface PropertiesPanelProps {
  nodeId: string;
}

export function PropertiesPanel({ nodeId }: PropertiesPanelProps) {
  const { nodes, updateNodeData } = useSimulatorStore();
  const node = nodes.find((n) => n.id === nodeId);

  if (!node) return null;

  const data = node.data as NodeData;

  const handleChange = (field: keyof NodeData, value: string | number | boolean) => {
    updateNodeData(nodeId, { [field]: value });
  };

  return (
    <div className="properties-panel">
      <h3>📝 Properties</h3>

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
