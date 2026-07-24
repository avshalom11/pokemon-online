import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateCaptureXpReward,
  calculateLevelFromTotalXp,
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

test("victory reward formula is correct", () => {
  // 10 + (3 * 5) = 25
  assert.equal(calculateVictoryXpReward(3), 25);
});

test("capture reward formula is correct", () => {
  // 15 + (3 * 5) = 30
  assert.equal(calculateCaptureXpReward(3), 30);
});
