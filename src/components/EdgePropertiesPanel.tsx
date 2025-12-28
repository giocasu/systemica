import { useSimulatorStore, EdgeData } from '../store/simulatorStore';

interface EdgePropertiesPanelProps {
  edgeId: string;
}

export function EdgePropertiesPanel({ edgeId }: EdgePropertiesPanelProps) {
  const { edges, updateEdgeData } = useSimulatorStore();
  const edge = edges.find((e) => e.id === edgeId);

  if (!edge) return null;

  const data = (edge.data || { flowRate: 1 }) as EdgeData;

  const handleFlowRateChange = (value: number) => {
    updateEdgeData(edgeId, { flowRate: Math.max(0, value) });
  };

  return (
    <div className="properties-panel edge-properties-panel">
      <h3>🔗 Connection Properties</h3>

      <div className="property-group">
        <label>Flow Rate (per tick)</label>
        <input
          type="number"
          value={data.flowRate}
          min={0}
          step={0.1}
          onChange={(e) => handleFlowRateChange(parseFloat(e.target.value) || 0)}
        />
      </div>

      <div className="property-group">
        <label>From → To</label>
        <div style={{ fontSize: '0.85rem', color: '#888' }}>
          {edge.source} → {edge.target}
        </div>
      </div>
    </div>
  );
}
