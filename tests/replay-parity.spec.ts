import { strict as assert } from "node:assert";
import { defaultCatalog } from "../apps/web/src/lib/catalog";
import { buildTower, createMatchSnapshot, deployUnit, replayFromActions, advanceTick } from "../apps/web/src/lib/matchEngine";

const players = [
  { player: "a1", team: 0 as const },
  { player: "b1", team: 1 as const },
];

const deployAction = { actor: "a1", team: 0 as const, unitKind: 0, lane: 0 };
const buildAction = { actor: "b1", team: 1 as const, towerKind: 0, lane: 0, slot: 0 };
const actions = [deployAction, buildAction, { kind: "tick" as const, count: 5 }];

const replayed = replayFromActions(defaultCatalog, players, actions);

const manual = createMatchSnapshot(defaultCatalog, players);
deployUnit(manual, defaultCatalog, deployAction);
buildTower(manual, defaultCatalog, buildAction);
for (let index = 0; index < 5; index += 1) {
  advanceTick(manual, defaultCatalog);
}

assert.deepEqual(replayed.fortressHp, manual.fortressHp);
assert.equal(replayed.actionLog.length, manual.actionLog.length);

console.log("replay-parity.spec.ts passed");
