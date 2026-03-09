import type { BuildAction, DeploymentAction, TeamId } from "@/lib/types";
import { getFactionTheme, getTowerLabel, getUnitLabel } from "@/lib/catalog";

interface ControlPanelProps {
  activeTeam: TeamId;
  onDeploy: (action: DeploymentAction) => void;
  onBuild: (action: BuildAction) => void;
  onAdvance: () => void;
  onRunDemo: () => void;
  onReset: () => void;
  demoMode: boolean;
}

export function ControlPanel({ activeTeam, onDeploy, onBuild, onAdvance, onRunDemo, onReset, demoMode }: ControlPanelProps) {
  const actor = activeTeam === 0 ? "team-a-player-1" : "team-b-player-1";
  const faction = getFactionTheme(activeTeam);
  return (
    <section className="panel controls">
      <h2>{faction.name} Orders</h2>
      <p className="panel-copy">Worker role: {faction.worker}. Demo mode {demoMode ? "is active" : "is available for scripted preview"}.</p>
      <div className="actions">
        <button onClick={() => onDeploy({ actor, team: activeTeam, lane: 0, unitKind: 0 })}>Deploy {getUnitLabel(activeTeam, 0)}</button>
        <button onClick={() => onDeploy({ actor, team: activeTeam, lane: 1, unitKind: 1 })}>Deploy {getUnitLabel(activeTeam, 1)}</button>
        <button onClick={() => onBuild({ actor, team: activeTeam, lane: 0, towerKind: 0, slot: 0 })}>Build {getTowerLabel(activeTeam, 0)}</button>
        <button onClick={() => onBuild({ actor, team: activeTeam, lane: 1, towerKind: 1, slot: 1 })}>Build {getTowerLabel(activeTeam, 1)}</button>
        <button onClick={onAdvance}>Advance Tick</button>
        <button className="accent-button" onClick={onRunDemo}>Run Demo Match</button>
        <button onClick={onReset}>Reset Demo</button>
      </div>
    </section>
  );
}
