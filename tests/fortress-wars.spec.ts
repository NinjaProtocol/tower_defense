import { strict as assert } from "node:assert";
import { defaultCatalog } from "../apps/web/src/lib/catalog";

assert.equal(defaultCatalog.laneCount, 3);
assert.equal(defaultCatalog.units.length >= 2, true);
assert.equal(defaultCatalog.towers.length >= 1, true);

console.log("fortress-wars.spec.ts passed");
