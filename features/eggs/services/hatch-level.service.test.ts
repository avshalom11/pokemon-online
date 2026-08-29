// EGG HATCH REBALANCE — rollHatchLevel is now player-level-based (never
// species-based, see this file's own hatch-level.service.ts doc comment).
// Covers every approved player-level bracket, both boundaries, and
// deterministic rolling at the extremes of the injected [0,1) source.
import assert from "node:assert/strict";
import { test } from "node:test";

import { rollHatchLevel } from "./hatch-level.service.ts";

const APPROVED_BRACKETS: Array<{ playerLevel: number; minimumLevel: number; maximumLevel: number }> = [
  { playerLevel: 1, minimumLevel: 5, maximumLevel: 11 },
  { playerLevel: 5, minimumLevel: 5, maximumLevel: 11 },
  { playerLevel: 6, minimumLevel: 9, maximumLevel: 17 },
  { playerLevel: 10, minimumLevel: 9, maximumLevel: 17 },
  { playerLevel: 11, minimumLevel: 13, maximumLevel: 23 },
  { playerLevel: 15, minimumLevel: 13, maximumLevel: 23 },
  { playerLevel: 16, minimumLevel: 17, maximumLevel: 29 },
  { playerLevel: 20, minimumLevel: 17, maximumLevel: 29 },
  { playerLevel: 21, minimumLevel: 21, maximumLevel: 35 },
  { playerLevel: 25, minimumLevel: 21, maximumLevel: 35 },
  { playerLevel: 26, minimumLevel: 25, maximumLevel: 41 },
  { playerLevel: 30, minimumLevel: 25, maximumLevel: 41 },
  { playerLevel: 31, minimumLevel: 29, maximumLevel: 47 },
  { playerLevel: 35, minimumLevel: 29, maximumLevel: 47 },
  { playerLevel: 36, minimumLevel: 33, maximumLevel: 53 },
  { playerLevel: 40, minimumLevel: 33, maximumLevel: 53 },
  { playerLevel: 41, minimumLevel: 37, maximumLevel: 59 },
  { playerLevel: 45, minimumLevel: 37, maximumLevel: 59 },
  { playerLevel: 46, minimumLevel: 41, maximumLevel: 65 },
  { playerLevel: 50, minimumLevel: 41, maximumLevel: 65 },
  { playerLevel: 51, minimumLevel: 45, maximumLevel: 70 },
  { playerLevel: 55, minimumLevel: 45, maximumLevel: 70 },
  { playerLevel: 56, minimumLevel: 47, maximumLevel: 73 },
  { playerLevel: 99, minimumLevel: 47, maximumLevel: 73 },
];

for (const { playerLevel, minimumLevel, maximumLevel } of APPROVED_BRACKETS) {
  test(`player level ${playerLevel} rolls a hatch level in [${minimumLevel}, ${maximumLevel}]`, () => {
    assert.equal(rollHatchLevel(playerLevel, () => 0), minimumLevel, "roll()=0 must hit the bracket's own minimum");
    assert.equal(rollHatchLevel(playerLevel, () => 0.999999), maximumLevel, "roll()~1 must hit the bracket's own maximum");
  });
}

test("player level 5 -> hatch range 5-11 (task's own worked boundary)", () => {
  assert.equal(rollHatchLevel(5, () => 0), 5);
  assert.equal(rollHatchLevel(5, () => 0.999999), 11);
});

test("player level 6 -> hatch range 9-17 (task's own worked boundary)", () => {
  assert.equal(rollHatchLevel(6, () => 0), 9);
  assert.equal(rollHatchLevel(6, () => 0.999999), 17);
});

test("player level 15 -> hatch range 13-23 (task's own worked boundary)", () => {
  assert.equal(rollHatchLevel(15, () => 0), 13);
  assert.equal(rollHatchLevel(15, () => 0.999999), 23);
});

test("player level 16 -> hatch range 17-29 (task's own worked boundary)", () => {
  assert.equal(rollHatchLevel(16, () => 0), 17);
  assert.equal(rollHatchLevel(16, () => 0.999999), 29);
});

test("player level 56+ -> hatch range 47-73, and every higher level shares the same open-ended bracket", () => {
  assert.equal(rollHatchLevel(56, () => 0), 47);
  assert.equal(rollHatchLevel(56, () => 0.999999), 73);
  assert.equal(rollHatchLevel(1000, () => 0), 47);
  assert.equal(rollHatchLevel(1000, () => 0.999999), 73);
});

test("a rolled level always stays inside the correct bracket across the full [0,1) domain, never spilling into a neighboring bracket", () => {
  for (const { playerLevel, minimumLevel, maximumLevel } of APPROVED_BRACKETS) {
    for (const roll of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.999999]) {
      const level = rollHatchLevel(playerLevel, () => roll);
      assert.ok(
        level >= minimumLevel && level <= maximumLevel,
        `player level ${playerLevel}, roll ${roll} produced ${level}, expected within [${minimumLevel}, ${maximumLevel}]`
      );
    }
  }
});

test("an invalid/fractional/sub-1 player level is clamped to at least level 1's own bracket, never throwing", () => {
  assert.equal(rollHatchLevel(0, () => 0), 5);
  assert.equal(rollHatchLevel(-5, () => 0), 5);
  assert.equal(rollHatchLevel(Number.NaN, () => 0), 5);
});
