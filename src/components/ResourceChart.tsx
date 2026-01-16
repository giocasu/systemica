import { useMemo, useState } from 'react';
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
import { useTokenStore } from '../store/tokenStore';

// Generate distinct colors for lines (for nodes)
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

type ViewMode = 'nodes' | 'tokens';

export function ResourceChart() {
  const { resourceHistory, nodes } = useSimulatorStore();
  const { getToken } = useTokenStore();
  const [viewMode, setViewMode] = useState<ViewMode>('nodes');

  // Get node labels for legend
  const nodeLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    nodes.forEach((node) => {
      labels[node.id] = node.data.label;
    });
    return labels;
  }, [nodes]);

  // Get unique node IDs from history (excluding token: prefixed keys)
  const nodeIds = useMemo(() => {
    if (resourceHistory.length === 0) return [];
    const firstEntry = resourceHistory[0];
    return Object.keys(firstEntry).filter((key) => key !== 'tick' && !key.startsWith('token:'));
  }, [resourceHistory]);

  // Get unique token IDs from history
  const tokenIds = useMemo(() => {
    if (resourceHistory.length === 0) return [];
    const firstEntry = resourceHistory[0];
    return Object.keys(firstEntry)
      .filter((key) => key.startsWith('token:'))
      .map((key) => key.replace('token:', ''));
  }, [resourceHistory]);

  if (resourceHistory.length < 2) {
    return null;
  }

  // Prepare data based on view mode
  const chartData = viewMode === 'tokens' 
    ? resourceHistory.map(entry => {
        const tokenEntry: Record<string, number> = { tick: entry.tick };
        for (const tokenId of tokenIds) {
          tokenEntry[tokenId] = entry[`token:${tokenId}`] || 0;
        }
        return tokenEntry;
      })
    : resourceHistory;

  return (
    <div className="resource-chart">
      <div className="chart-header">
        <h4>📊 Resources Over Time</h4>
        <div className="chart-toggle">
          <button 
            className={viewMode === 'nodes' ? 'active' : ''} 
            onClick={() => setViewMode('nodes')}
          >
            Nodes
          </button>
          <button 
            className={viewMode === 'tokens' ? 'active' : ''} 
            onClick={() => setViewMode('tokens')}
          >
            Tokens
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
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
            formatter={(value, name) => {
              if (typeof value !== 'number') return [0, String(name)];
              if (viewMode === 'tokens') {
                const token = getToken(String(name));
                return [Math.floor(value), `${token?.emoji || '●'} ${token?.name || name}`];
              }
              return [Math.floor(value), nodeLabels[String(name)] || String(name)];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px' }}
            formatter={(value) => {
              if (viewMode === 'tokens') {
                const token = getToken(value);
                return `${token?.emoji || '●'} ${token?.name || value}`;
              }
              return nodeLabels[value] || value;
            }}
          />
          {viewMode === 'nodes' ? (
            nodeIds.map((nodeId, index) => (
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
            ))
          ) : (
            tokenIds.map((tokenId, index) => {
              const token = getToken(tokenId);
              return (
                <Line
                  key={tokenId}
                  type="monotone"
                  dataKey={tokenId}
                  name={tokenId}
                  stroke={token?.color || COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              );
            })
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
