import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyStatStagesToStats,
  changeStatStage,
  clampStatStage,
  getAccuracyStageMultiplier,
  getStatStageMultiplier,
} from "./stat-stages.ts";

test("canonical stat-stage multipliers match the spec examples", () => {
  assert.equal(getStatStageMultiplier(1), 1.5);
  assert.equal(getStatStageMultiplier(2), 2);
  assert.equal(getStatStageMultiplier(-1), 2 / 3);
  assert.equal(getStatStageMultiplier(-2), 0.5);
  assert.equal(getStatStageMultiplier(0), 1);
});

test("accuracy/evasion stage multipliers use the denominator-3 table", () => {
  assert.equal(getAccuracyStageMultiplier(1), 4 / 3);
  assert.equal(getAccuracyStageMultiplier(-1), 3 / 4);
  assert.equal(getAccuracyStageMultiplier(0), 1);
});

test("stages clamp at -6 and +6", () => {
  assert.equal(clampStatStage(10), 6);
  assert.equal(clampStatStage(-10), -6);
});

test("changeStatStage reports limited: true once the stage is already at the cap", () => {
  const atCap = changeStatStage({ attack: 6 }, "attack", 1);
  assert.equal(atCap.newStage, 6);
  assert.equal(atCap.previousStage, 6);
  assert.equal(atCap.limited, true);

  const withinRange = changeStatStage({ attack: 5 }, "attack", 1);
  assert.equal(withinRange.newStage, 6);
  assert.equal(withinRange.limited, false);
});

test("applyStatStagesToStats scales the affected stats and leaves maxHp untouched", () => {
  const base = { maxHp: 100, attack: 50, defense: 50, specialAttack: 50, specialDefense: 50, speed: 50 };
  const result = applyStatStagesToStats(base, { attack: 1, speed: -1 });
  assert.equal(result.maxHp, 100);
  assert.equal(result.attack, 75); // floor(50*1.5)
  assert.equal(result.speed, Math.floor((50 * 2) / 3));
  assert.equal(result.defense, 50); // unaffected stat stays at 1x
});
