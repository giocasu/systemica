import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useSimulatorStore } from '../store/simulatorStore';

// Generate distinct colors for lines
const COLORS = [
  '#4ade80', // green (source)
  '#60a5fa', // blue (pool)
  '#f472b6', // pink
  '#fbbf24', // yellow
  '#a78bfa', // purple
  '#fb7185', // red
  '#34d399', // emerald
  '#38bdf8', // sky
  '#f97316', // orange
  '#818cf8', // indigo
];

export function ResourceChart() {
  const { resourceHistory, nodes } = useSimulatorStore();

  // Get node labels for legend
  const nodeLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    nodes.forEach((node) => {
      labels[node.id] = node.data.label;
    });
    return labels;
  }, [nodes]);

  // Get unique node IDs from history
  const nodeIds = useMemo(() => {
    if (resourceHistory.length === 0) return [];
    const firstEntry = resourceHistory[0];
    return Object.keys(firstEntry).filter((key) => key !== 'tick');
  }, [resourceHistory]);

  if (resourceHistory.length < 2) {
    return (
      <div className="resource-chart empty">
        <p>📊 Start simulation to see resource chart</p>
      </div>
    );
  }

  return (
    <div className="resource-chart">
      <h4>📊 Resources Over Time</h4>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={resourceHistory}>
          <XAxis
            dataKey="tick"
            stroke="#666"
            fontSize={10}
            tickLine={false}
          />
          <YAxis
            stroke="#666"
            fontSize={10}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: '#16213e',
              border: '1px solid #0f3460',
              borderRadius: '4px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px' }}
            formatter={(value) => nodeLabels[value] || value}
          />
          {nodeIds.map((nodeId, index) => (
            <Line
              key={nodeId}
              type="monotone"
              dataKey={nodeId}
              name={nodeId}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
