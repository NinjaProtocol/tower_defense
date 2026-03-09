import { defaultCatalog } from "../../apps/web/src/lib/catalog";
import { replayFromActions } from "../../apps/web/src/lib/matchEngine";

const snapshot = replayFromActions(
  defaultCatalog,
  [
    { player: "team-a-player-1", team: 0 },
    { player: "team-b-player-1", team: 1 },
  ],
  [
    { actor: "team-a-player-1", team: 0, unitKind: 0, lane: 0 },
    { actor: "team-b-player-1", team: 1, towerKind: 0, lane: 0, slot: 0 },
    { kind: "tick", count: 8 },
  ],
);

console.log(JSON.stringify(snapshot, null, 2));
