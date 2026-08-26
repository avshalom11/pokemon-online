import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateCaptureXpReward,
  calculateLevelFromTotalXp,
  calculateLevelUpReward,
  calculateVictoryXpReward,
  getPlayerProgress,
  getXpRequiredForNextLevel,
} from "./progression-calculations.ts";

test("level 1 starts at 0 XP", () => {
  assert.equal(calculateLevelFromTotalXp(0), 1);
});

test("999 total XP remains level 1", () => {
  assert.equal(calculateLevelFromTotalXp(999), 1);
});

test("1000 total XP becomes level 2", () => {
  assert.equal(calculateLevelFromTotalXp(1000), 2);
});

test("2999 total XP remains level 2", () => {
  assert.equal(calculateLevelFromTotalXp(2999), 2);
});

test("3000 total XP becomes level 3", () => {
  assert.equal(calculateLevelFromTotalXp(3000), 3);
});

test("6000 total XP becomes level 4", () => {
  assert.equal(calculateLevelFromTotalXp(6000), 4);
});

test("large XP rewards can gain multiple levels", () => {
  // Level 1 -> level 10 requires 1000*(9*10)/2 = 45000 total XP.
  assert.equal(calculateLevelFromTotalXp(45_000), 10);
  assert.equal(calculateLevelFromTotalXp(1_000_000), calculateLevelFromTotalXp(1_000_000));
  assert.ok(calculateLevelFromTotalXp(1_000_000) > 10);
});

test("progress within the current level is calculated correctly", () => {
  // Level 3 starts at 3000 total XP; 4200 total XP -> 1200/3000, not 4200/3000.
  const progress = getPlayerProgress(4200);
  assert.equal(progress.level, 3);
  assert.equal(progress.currentLevelXp, 1200);
  assert.equal(progress.xpRequiredForNextLevel, 3000);
});

test("XP required for the next level is correct", () => {
  assert.equal(getXpRequiredForNextLevel(1), 1000);
  assert.equal(getXpRequiredForNextLevel(2), 2000);
  assert.equal(getXpRequiredForNextLevel(3), 3000);
  assert.equal(getXpRequiredForNextLevel(4), 4000);
});

test("negative XP is rejected/clamped safely", () => {
  const progress = getPlayerProgress(-500);
  assert.equal(progress.level, 1);
  assert.equal(progress.totalXp, 0);
  assert.equal(progress.currentLevelXp, 0);
});

// FIELD BATTLE PLAYER XP — REDUCED BY 50%. VICTORY_XP_BASE/PER_LEVEL were
// halved (10/5 -> 5/2.5) from their original values — see
// progression-config.ts's own doc comment for the full rationale. These
// three wildLevel examples (14/18/22) are the exact ones the rebalance
// task itself was framed around: the OLD formula (10 + wildLevel*5)
// produced 80/100/120 XP for them; the new one must produce exactly half.
test("victory reward formula: wildLevel 14 -> 40 XP (was 80, now exactly 50%)", () => {
  assert.equal(calculateVictoryXpReward(14), 40);
});

test("victory reward formula: wildLevel 18 -> 50 XP (was 100, now exactly 50%)", () => {
  assert.equal(calculateVictoryXpReward(18), 50);
});

test("victory reward formula: wildLevel 22 -> 60 XP (was 120, now exactly 50%)", () => {
  assert.equal(calculateVictoryXpReward(22), 60);
});

test("victory reward formula: an odd wildLevel rounds to the nearest whole XP (5 + 3*2.5 = 12.5 -> 13, half of the old 25)", () => {
  assert.equal(calculateVictoryXpReward(3), 13);
});

test("victory reward is never negative/fractional even for an invalid (zero/negative) wildLevel", () => {
  assert.equal(calculateVictoryXpReward(0), calculateVictoryXpReward(1));
  assert.ok(Number.isInteger(calculateVictoryXpReward(-5)));
});

test("capture reward formula is UNCHANGED by the victory-XP rebalance (still 15 + wildLevel*5 — a completely separate reward)", () => {
  // 15 + (3 * 5) = 30 — same as before this task; capturing a wild
  // Pokémon is a distinct reward from defeating one, and this task only
  // ever touches VICTORY_XP_BASE/VICTORY_XP_PER_LEVEL.
  assert.equal(calculateCaptureXpReward(3), 30);
  assert.equal(calculateCaptureXpReward(14), 85);
});

// ===========================================================================
// PLAYER LEVEL-UP REWARDS — calculateLevelUpReward. Table:
// 2-10 -> 1,500/20, 11-20 -> 1,750/22, 21-30 -> 2,000/24, 31-40 -> 2,500/27,
// 41-50 -> 3,000/30, 51-54 -> 3,250/33, 55+ -> 3,500/35.
// ===========================================================================
test("no level crossed (same level) yields {money: 0, gold: 0}", () => {
  assert.deepEqual(calculateLevelUpReward(5, 5), { money: 0, gold: 0 });
});

test("a same-or-lower level (stale/out-of-order snapshot) yields {money: 0, gold: 0}, never negative", () => {
  assert.deepEqual(calculateLevelUpReward(5, 4), { money: 0, gold: 0 });
});

test("level 1 is never rewarded — the lowest tier starts at level 2", () => {
  assert.deepEqual(calculateLevelUpReward(0, 1), { money: 0, gold: 0 });
});

test("single level up within the 2-10 bracket (1 -> 2): 1,500 money + 20 gold", () => {
  assert.deepEqual(calculateLevelUpReward(1, 2), { money: 1500, gold: 20 });
});

test("reaching level 10 (still the 2-10 bracket, inclusive upper bound)", () => {
  assert.deepEqual(calculateLevelUpReward(9, 10), { money: 1500, gold: 20 });
});

test("reaching level 11 moves into the 11-20 bracket: 1,750 money + 22 gold", () => {
  assert.deepEqual(calculateLevelUpReward(10, 11), { money: 1750, gold: 22 });
});

test("reaching level 21 moves into the 21-30 bracket: 2,000 money + 24 gold", () => {
  assert.deepEqual(calculateLevelUpReward(20, 21), { money: 2000, gold: 24 });
});

test("reaching level 31 moves into the 31-40 bracket: 2,500 money + 27 gold", () => {
  assert.deepEqual(calculateLevelUpReward(30, 31), { money: 2500, gold: 27 });
});

test("reaching level 41 moves into the 41-50 bracket: 3,000 money + 30 gold", () => {
  assert.deepEqual(calculateLevelUpReward(40, 41), { money: 3000, gold: 30 });
});

test("reaching level 51 moves into the 51-54 bracket: 3,250 money + 33 gold", () => {
  assert.deepEqual(calculateLevelUpReward(50, 51), { money: 3250, gold: 33 });
});

test("reaching level 55 moves into the 55+ bracket: 3,500 money + 35 gold", () => {
  assert.deepEqual(calculateLevelUpReward(54, 55), { money: 3500, gold: 35 });
});

test("the 55+ bracket applies to every level beyond it too (no upper bound)", () => {
  assert.deepEqual(calculateLevelUpReward(99, 100), { money: 3500, gold: 35 });
});

// ONE XP GRANT, MULTIPLE LEVELS — a multi-level jump in one grant must sum
// EVERY crossed level's own tier, not just the final level's.
test("multi-level jump within one bracket (1 -> 10) sums all 9 crossed levels: 13,500 money + 180 gold", () => {
  assert.deepEqual(calculateLevelUpReward(1, 10), { money: 9 * 1500, gold: 9 * 20 });
});

test("multi-level jump crossing a tier boundary (9 -> 11) sums each crossed level's own tier (level 10 + level 11)", () => {
  assert.deepEqual(calculateLevelUpReward(9, 11), { money: 1500 + 1750, gold: 20 + 22 });
});

test("multi-level jump spanning several brackets (8 -> 22) sums every crossed level's own tier", () => {
  // Levels 9-10 (2-10 bracket), 11-20 (11-20 bracket), 21-22 (21-30 bracket).
  const expectedMoney = 2 * 1500 + 10 * 1750 + 2 * 2000;
  const expectedGold = 2 * 20 + 10 * 22 + 2 * 24;
  assert.deepEqual(calculateLevelUpReward(8, 22), { money: expectedMoney, gold: expectedGold });
});
