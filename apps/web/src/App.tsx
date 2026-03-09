import { useState } from "react";
import { defaultCatalog, getFactionTheme } from "@/lib/catalog";
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
  const [demoMode, setDemoMode] = useState(true);
  const orcs = getFactionTheme(0);
  const humans = getFactionTheme(1);

  function resetDemo() {
    setSnapshot(createMatchSnapshot(defaultCatalog, [
      { player: "team-a-player-1", team: 0 },
      { player: "team-a-player-2", team: 0 },
      { player: "team-b-player-1", team: 1 },
      { player: "team-b-player-2", team: 1 },
    ]));
  }

  function runDemoMatch() {
    const next = createMatchSnapshot(defaultCatalog, [
      { player: "team-a-player-1", team: 0 },
      { player: "team-a-player-2", team: 0 },
      { player: "team-b-player-1", team: 1 },
      { player: "team-b-player-2", team: 1 },
    ]);
    deployUnit(next, defaultCatalog, { actor: "team-a-player-1", team: 0, lane: 0, unitKind: 0 });
    deployUnit(next, defaultCatalog, { actor: "team-b-player-1", team: 1, lane: 1, unitKind: 1 });
    buildTower(next, defaultCatalog, { actor: "team-a-player-2", team: 0, lane: 0, towerKind: 0, slot: 0 });
    buildTower(next, defaultCatalog, { actor: "team-b-player-2", team: 1, lane: 1, towerKind: 1, slot: 0 });
    for (let index = 0; index < 12; index += 1) {
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
          <div className="status-row">
            <span className="status-pill">Network: Devnet</span>
            <span className="status-pill">Program: {PROGRAM_ID.toBase58().slice(0, 8)}...</span>
            <span className="status-pill">Demo Mode: {demoMode ? "Enabled" : "Disabled"}</span>
          </div>
        </div>
        <div className="team-toggle">
          <button className={activeTeam === 0 ? "active" : ""} onClick={() => setActiveTeam(0)}>{orcs.name}</button>
          <button className={activeTeam === 1 ? "active" : ""} onClick={() => setActiveTeam(1)}>{humans.name}</button>
          <button className={demoMode ? "active" : ""} onClick={() => setDemoMode((current) => !current)}>{demoMode ? "Demo Enabled" : "Demo Disabled"}</button>
        </div>
      </section>

      <section className="content">
        <div className="board">
          <GameCanvas snapshot={snapshot} />
          <ControlPanel
            activeTeam={activeTeam}
            onDeploy={(action) => setSnapshot((current) => {
              const next = structuredClone(current);
              deployUnit(next, defaultCatalog, action);
              return next;
            })}
            onBuild={(action) => setSnapshot((current) => {
              const next = structuredClone(current);
              buildTower(next, defaultCatalog, action);
              return next;
            })}
            onAdvance={() => setSnapshot((current) => {
              const next = structuredClone(current);
              advanceTick(next, defaultCatalog);
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
