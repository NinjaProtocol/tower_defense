import type { MatchSnapshot } from "@/lib/types";
import { getFactionTheme } from "@/lib/catalog";

export function MatchSidebar({ snapshot }: { snapshot: MatchSnapshot }) {
  const orcs = getFactionTheme(0);
  const humans = getFactionTheme(1);
  return (
    <aside className="panel sidebar">
      <h2>Fortress State</h2>
      <p>Tick: {snapshot.tick}</p>
      <p>Phase: {snapshot.phase}</p>
      <p>{orcs.name} {orcs.fortress}: {snapshot.fortressHp[0]}</p>
      <p>{humans.name} {humans.fortress}: {snapshot.fortressHp[1]}</p>
      <p>Winner: {snapshot.winnerTeam === null ? "Pending" : snapshot.winnerTeam === 0 ? orcs.name : humans.name}</p>
      <h3>Recent Actions</h3>
      <ul className="action-list">
        {snapshot.actionLog.slice(-8).reverse().map((entry) => (
          <li key={entry.sequence}>#{entry.sequence} {entry.actionType} by {entry.actor}</li>
        ))}
      </ul>
    </aside>
  );
}
