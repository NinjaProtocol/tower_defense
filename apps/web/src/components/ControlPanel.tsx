import type { BuildAction, DeploymentAction, TeamId } from "@/lib/types";
import { getFactionTheme, getTowerLabel, getUnitLabel, laneLabels } from "@/lib/catalog";
import { socVisuals } from "@/lib/assets";

interface ControlPanelProps {
  activeTeam: TeamId;
  activeLane: number;
  activeSlot: number;
  onLaneChange: (lane: number) => void;
  onSlotChange: (slot: number) => void;
  onDeploy: (action: DeploymentAction) => void;
  onBuild: (action: BuildAction) => void;
  onAdvance: () => void;
  onRunDemo: () => void;
  onReset: () => void;
  demoMode: boolean;
}

export function ControlPanel({ activeTeam, activeLane, activeSlot, onLaneChange, onSlotChange, onDeploy, onBuild, onAdvance, onRunDemo, onReset, demoMode }: ControlPanelProps) {
  const actor = activeTeam === 0 ? "team-a-player-1" : "team-b-player-1";
  const faction = getFactionTheme(activeTeam);
  const unitPreview = activeTeam === 0 ? socVisuals.orcWorker : socVisuals.humanWorker;
  const towerPreview = activeTeam === 0 ? socVisuals.orcTower : socVisuals.humanTower;
  return (
    <section className="panel controls">
      <h2>{faction.name} Orders</h2>
      <p className="panel-copy">Worker role: {faction.worker}. Demo mode {demoMode ? "is active" : "is available for scripted preview"}.</p>
      <div className="preview-strip">
        <img src={unitPreview} alt={`${faction.worker} preview`} className="preview-icon" />
        <img src={towerPreview} alt={`${faction.name} tower preview`} className="preview-icon" />
      </div>
      <div className="selector-row">
        {laneLabels.map((label, lane) => (
          <button key={label} className={lane === activeLane ? "active-selector" : ""} onClick={() => onLaneChange(lane)}>{label} Lane</button>
        ))}
      </div>
      <div className="selector-row">
        {[0, 1, 2].map((slot) => (
          <button key={slot} className={slot === activeSlot ? "active-selector" : ""} onClick={() => onSlotChange(slot)}>Tower Tile {slot + 1}</button>
        ))}
      </div>
      <div className="actions">
        <button onClick={() => onDeploy({ actor, team: activeTeam, lane: activeLane, unitKind: 0 })}>Queue {getUnitLabel(activeTeam, 0)}</button>
        <button onClick={() => onDeploy({ actor, team: activeTeam, lane: activeLane, unitKind: 1 })}>Queue {getUnitLabel(activeTeam, 1)}</button>
        <button onClick={() => onBuild({ actor, team: activeTeam, lane: activeLane, towerKind: 0, slot: activeSlot })}>Build {getTowerLabel(activeTeam, 0)}</button>
        <button onClick={() => onBuild({ actor, team: activeTeam, lane: activeLane, towerKind: 1, slot: activeSlot })}>Build {getTowerLabel(activeTeam, 1)}</button>
        <button onClick={onAdvance}>Advance Tick</button>
        <button className="accent-button" onClick={onRunDemo}>Run Demo Match</button>
        <button onClick={onReset}>Reset Demo</button>
      </div>
    </section>
  );
}
