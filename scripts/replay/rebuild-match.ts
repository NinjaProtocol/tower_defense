import { defaultCatalog } from "../../apps/web/src/lib/catalog";
import { replayFromActions } from "../../apps/web/src/lib/matchEngine";

const snapshot = replayFromActions(
  defaultCatalog,
  [
    { player: "team-a-player-1", team: 0 },
    { player: "team-b-player-1", team: 1 },
  ],
  [
    { actor: "team-a-player-1", team: 0, unitKind: 1, lane: 0 },
    { actor: "team-b-player-1", team: 1, unitKind: 0, lane: 2 },
    { actor: "team-b-player-1", team: 1, towerKind: 0, lane: 0, slot: 0 },
    { actor: "team-a-player-1", team: 0, towerKind: 1, lane: 2, slot: 1 },
    { kind: "tick", count: 65 },
  ],
);

console.log(JSON.stringify(snapshot, null, 2));

