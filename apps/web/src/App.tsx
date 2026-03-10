import { useState } from "react";
import { defaultCatalog, getFactionTheme, laneLabels } from "@/lib/catalog";
import { warcraftAudio, warcraftVisuals } from "@/lib/assets";
import { advanceTick, buildTower, createMatchSnapshot, deployUnit } from "@/lib/matchEngine";
import type { TeamId } from "@/lib/types";
import { GameCanvas } from "@/game/GameCanvas";
import { ControlPanel } from "@/components/ControlPanel";
import { MatchSidebar } from "@/components/MatchSidebar";
import { PROGRAM_ID } from "@/lib/program";

const initialSnapshot = createMatchSnapshot(defaultCatalog, [
  { player: "team-a-player-1", team: 0 },
  { player: "team-a-player-2", team: 0 },
  { player: "team-b-player-1", team: 1 },
  { player: "team-b-player-2", team: 1 },
]);

export default function App() {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [activeTeam, setActiveTeam] = useState<TeamId>(0);
  const [activeLane, setActiveLane] = useState(1);
  const [activeSlot, setActiveSlot] = useState(0);
  const [demoMode, setDemoMode] = useState(true);
  const orcs = getFactionTheme(0);
  const humans = getFactionTheme(1);

  function playClip(source: string) {
    const audio = new Audio(source);
    void audio.play().catch(() => undefined);
  }

  function resetDemo() {
    playClip(activeTeam === 0 ? warcraftAudio.orcSelect : warcraftAudio.humanSelect);
    setSnapshot(createMatchSnapshot(defaultCatalog, [
      { player: "team-a-player-1", team: 0 },
      { player: "team-a-player-2", team: 0 },
      { player: "team-b-player-1", team: 1 },
      { player: "team-b-player-2", team: 1 },
    ]));
  }

  function runDemoMatch() {
    playClip(activeTeam === 0 ? warcraftAudio.orcWorkComplete : warcraftAudio.humanWorkComplete);
    const next = createMatchSnapshot(defaultCatalog, [
      { player: "team-a-player-1", team: 0 },
      { player: "team-a-player-2", team: 0 },
      { player: "team-b-player-1", team: 1 },
      { player: "team-b-player-2", team: 1 },
    ]);
    deployUnit(next, defaultCatalog, { actor: "team-a-player-1", team: 0, lane: 0, unitKind: 1 });
    deployUnit(next, defaultCatalog, { actor: "team-a-player-2", team: 0, lane: 2, unitKind: 0 });
    deployUnit(next, defaultCatalog, { actor: "team-b-player-1", team: 1, lane: 1, unitKind: 1 });
    deployUnit(next, defaultCatalog, { actor: "team-b-player-2", team: 1, lane: 2, unitKind: 0 });
    buildTower(next, defaultCatalog, { actor: "team-a-player-2", team: 0, lane: 0, towerKind: 0, slot: 0 });
    buildTower(next, defaultCatalog, { actor: "team-a-player-1", team: 0, lane: 1, towerKind: 1, slot: 1 });
    buildTower(next, defaultCatalog, { actor: "team-b-player-2", team: 1, lane: 1, towerKind: 1, slot: 0 });
    buildTower(next, defaultCatalog, { actor: "team-b-player-1", team: 1, lane: 2, towerKind: 0, slot: 2 });
    for (let index = 0; index < 65; index += 1) {
      advanceTick(next, defaultCatalog);
      if (next.phase === "finished") {
        break;
      }
    }
    setSnapshot(next);
  }

  return (
    <main className="layout">
      <section className="hero">
        <div>
          <p className="eyebrow">MagicBlock Fortress Wars Demo</p>
          <h1>Warcraft-inspired Orcs versus Humans with deterministic onchain combat.</h1>
          <p className="subcopy">
            The frontend runs a scripted demo mode for local verification while the deployed program, devnet scripts, and replay flow stay aligned to the same deterministic economy and combat model.
          </p>
          <div className="banner-strip">
            <img src={warcraftVisuals.swampTiles} alt="Orc terrain" className="banner-image" />
            <img src={warcraftVisuals.forestTiles} alt="Human terrain" className="banner-image" />
          </div>
          <div className="status-row">
            <span className="status-pill">Network: Devnet</span>
            <span className="status-pill">Program: {PROGRAM_ID.toBase58().slice(0, 8)}...</span>
            <span className="status-pill">Demo Mode: {demoMode ? "Enabled" : "Disabled"}</span>
            <span className="status-pill">Wave Timer: every {defaultCatalog.waveIntervalTicks}s</span>
          </div>
        </div>
        <div className="team-toggle">
          <button className={activeTeam === 0 ? "active" : ""} onClick={() => {
            playClip(warcraftAudio.orcSelect);
            setActiveTeam(0);
          }}>{orcs.name}</button>
          <button className={activeTeam === 1 ? "active" : ""} onClick={() => {
            playClip(warcraftAudio.humanSelect);
            setActiveTeam(1);
          }}>{humans.name}</button>
          <button className={demoMode ? "active" : ""} onClick={() => setDemoMode((current) => !current)}>{demoMode ? "Demo Enabled" : "Demo Disabled"}</button>
        </div>
        <div className="lane-readout">
          <span>Active lane: {laneLabels[activeLane]}</span>
          <span>Active tower tile: {activeSlot + 1}</span>
        </div>
      </section>

      <section className="content">
        <div className="board">
          <GameCanvas snapshot={snapshot} />
          <ControlPanel
            activeTeam={activeTeam}
            activeLane={activeLane}
            activeSlot={activeSlot}
            onLaneChange={setActiveLane}
            onSlotChange={setActiveSlot}
            onDeploy={(action) => setSnapshot((current) => {
              playClip(action.team === 0 ? warcraftAudio.orcAcknowledge : warcraftAudio.humanAcknowledge);
              const next = structuredClone(current);
              deployUnit(next, defaultCatalog, action);
              return next;
            })}
            onBuild={(action) => setSnapshot((current) => {
              playClip(action.team === 0 ? warcraftAudio.orcWorkComplete : warcraftAudio.humanWorkComplete);
              const next = structuredClone(current);
              buildTower(next, defaultCatalog, action);
              return next;
            })}
            onAdvance={() => setSnapshot((current) => {
              const next = structuredClone(current);
              advanceTick(next, defaultCatalog);
              if (next.winnerTeam !== null) {
                playClip(next.winnerTeam === 0 ? warcraftAudio.orcWin : warcraftAudio.humanWin);
              }
              return next;
            })}
            onRunDemo={runDemoMatch}
            onReset={resetDemo}
            demoMode={demoMode}
          />
        </div>
        <MatchSidebar snapshot={snapshot} />
      </section>
    </main>
  );
}
