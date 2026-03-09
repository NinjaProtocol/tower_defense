import { strict as assert } from "node:assert";
import { createMatchSnapshot } from "../apps/web/src/lib/matchEngine";
import { defaultCatalog } from "../apps/web/src/lib/catalog";

const snapshot = createMatchSnapshot(defaultCatalog, [
  { player: "a1", team: 0 },
  { player: "a2", team: 0 },
  { player: "a3", team: 0 },
  { player: "b1", team: 1 },
  { player: "b2", team: 1 },
  { player: "b3", team: 1 },
]);

assert.equal(snapshot.players.length, 6);
assert.equal(Object.values(snapshot.playerTeams).filter((team) => team === 0).length, 3);
assert.equal(Object.values(snapshot.playerTeams).filter((team) => team === 1).length, 3);

console.log("multiplayer.spec.ts passed");
