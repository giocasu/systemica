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
    </div>
  );
}
