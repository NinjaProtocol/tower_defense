import type { MatchSnapshot } from "@/lib/types";
import { getFactionTheme, laneLabels } from "@/lib/catalog";
import { socVisuals } from "@/lib/assets";

export function MatchSidebar({ snapshot }: { snapshot: MatchSnapshot }) {
  const orcs = getFactionTheme(0);
  const humans = getFactionTheme(1);
  return (
    <aside className="panel sidebar">
      <h2>Fortress State</h2>
      <div className="preview-strip">
        <img src={socVisuals.orcWorker} alt="Orc unit preview" className="preview-icon" />
        <img src={socVisuals.humanWorker} alt="Human unit preview" className="preview-icon" />
      </div>
      <p>Tick: {snapshot.tick}</p>
      <p>Phase: {snapshot.phase}</p>
      <p>{orcs.name} {orcs.fortress}: {snapshot.fortressHp[0]}</p>
      <p>{humans.name} {humans.fortress}: {snapshot.fortressHp[1]}</p>
      <p>Winner: {snapshot.winnerTeam === null ? "Pending" : snapshot.winnerTeam === 0 ? orcs.name : humans.name}</p>
      <h3>Queued Wave Units</h3>
      <ul className="action-list">
        {laneLabels.map((label, lane) => {
          const count = snapshot.pendingSpawns.filter((spawn) => spawn.lane === lane).length;
          return <li key={label}>{label}: {count}</li>;
        })}
      </ul>
      <h3>Recent Actions</h3>
      <ul className="action-list">
        {snapshot.actionLog.slice(-8).reverse().map((entry) => (
          <li key={entry.sequence}>#{entry.sequence} {entry.actionType} by {entry.actor}</li>
        ))}
      </ul>
    </aside>
  );
}
