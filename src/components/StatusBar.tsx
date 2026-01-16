import { useSimulatorStore } from '../store/simulatorStore';
import { useTokenStore } from '../store/tokenStore';
import { TypedResources } from '../types';

export function StatusBar() {
  const { currentTick, isRunning, nodes } = useSimulatorStore();
  const { getToken } = useTokenStore();

  // Calculate total resources and breakdown by token type
  const { totalResources, tokenBreakdown } = nodes.reduce(
    (acc, node) => {
      // Add to total
      acc.totalResources += node.data.resources || 0;
      
      // Add to token breakdown
      const typedRes = node.data.typedResources || {};
      for (const [tokenId, amount] of Object.entries(typedRes)) {
        if (amount > 0) {
          acc.tokenBreakdown[tokenId] = (acc.tokenBreakdown[tokenId] || 0) + amount;
        }
      }
      
      return acc;
    },
    { totalResources: 0, tokenBreakdown: {} as TypedResources }
  );

  // Get top 3 tokens for display
  const topTokens = Object.entries(tokenBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <footer className="status-bar">
      <span>{isRunning ? '🟢 Running' : '⏹️ Stopped'}</span>
      <span>Nodes: {nodes.length}</span>
      <span>Total: {Math.floor(totalResources)}</span>
      {topTokens.length > 0 && (
        <span className="token-breakdown">
          {topTokens.map(([tokenId, amount]) => {
            const token = getToken(tokenId);
            return (
              <span key={tokenId} className="token-stat" title={`${token?.name || tokenId}: ${Math.floor(amount)}`}>
                {token?.emoji || '●'} {Math.floor(amount)}
              </span>
            );
          })}
        </span>
      )}
      <span>Tick: {currentTick}</span>
    </footer>
  );
}
