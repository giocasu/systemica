import { useSimulatorStore } from '../store/simulatorStore';

export function StatusBar() {
  const { currentTick, isRunning, nodes } = useSimulatorStore();

  const totalResources = nodes.reduce((sum, node) => sum + (node.data.resources || 0), 0);

  return (
    <footer className="status-bar">
      <span>{isRunning ? '🟢 Running' : '⏹️ Stopped'}</span>
      <span>Nodes: {nodes.length}</span>
      <span>Total Resources: {totalResources}</span>
      <span>Tick: {currentTick}</span>
    </footer>
  );
}
