import { strict as assert } from "node:assert";

function splitSettlement(total: number, winners: number): number[] {
  const share = Math.floor(total / winners);
  let remainder = total % winners;
  return new Array(winners).fill(share).map((value) => {
    if (remainder === 0) {
      return value;
    }
    remainder -= 1;
    return value + 1;
  });
}

assert.deepEqual(splitSettlement(10, 3), [4, 3, 3]);
assert.deepEqual(splitSettlement(12, 3), [4, 4, 4]);

console.log("settlement.spec.ts passed");
