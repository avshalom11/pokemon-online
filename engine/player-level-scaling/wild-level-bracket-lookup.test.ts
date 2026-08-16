// MAP — SELECTABLE WILD LEVEL RANGE focused coverage for the new pure
// bracket-unlocking helpers — these are the ONLY place player-level ->
// unlocked-bracket derivation happens, reusing the exact same
// WILD_LEVEL_BRACKETS table getWildLevelRangeForPlayerLevel already reads
// (no second hardcoded table).
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getHighestUnlockedBracketIndex,
  getUnlockedWildLevelBrackets,
  getWildLevelRangeForBracketIndex,
  isBracketIndexUnlocked,
} from "./wild-level-bracket-lookup.ts";
import { WILD_LEVEL_BRACKETS } from "./wild-level-brackets.config.ts";

test("player level 6-10 unlocks exactly the first two brackets (1-7, 5-12), per the spec's own example", () => {
  const unlocked = getUnlockedWildLevelBrackets(8);
  assert.deepEqual(
    unlocked.map(({ bracket }) => [bracket.minimumWildLevel, bracket.maximumWildLevel]),
    [
      [1, 7],
      [5, 12],
    ]
  );
});

test("player level 31-35 unlocks exactly the first seven brackets, per the spec's own example", () => {
  const unlocked = getUnlockedWildLevelBrackets(33);
  assert.deepEqual(
    unlocked.map(({ bracket }) => [bracket.minimumWildLevel, bracket.maximumWildLevel]),
    [
      [1, 7],
      [5, 12],
      [9, 17],
      [13, 22],
      [18, 27],
      [23, 32],
      [28, 37],
    ]
  );
});

test("player level 1 unlocks only the very first bracket", () => {
  const unlocked = getUnlockedWildLevelBrackets(1);
  assert.equal(unlocked.length, 1);
  assert.equal(unlocked[0].index, 0);
});

test("player level 56+ unlocks every bracket, including the open-ended last one", () => {
  const unlocked = getUnlockedWildLevelBrackets(999);
  assert.equal(unlocked.length, WILD_LEVEL_BRACKETS.length);
});

test("getHighestUnlockedBracketIndex matches the player's own current bracket (last unlocked entry)", () => {
  assert.equal(getHighestUnlockedBracketIndex(8), 1); // 6-10 -> index 1 (5-12)
  assert.equal(getHighestUnlockedBracketIndex(33), 6); // 31-35 -> index 6 (28-37)
  assert.equal(getHighestUnlockedBracketIndex(1), 0);
});

test("isBracketIndexUnlocked rejects a bracket above the player's current unlocked maximum — never allows selecting a higher bracket", () => {
  // Level 10 (spec's own example) must never be able to select the last
  // bracket (53-60, the highest index).
  assert.equal(isBracketIndexUnlocked(WILD_LEVEL_BRACKETS.length - 1, 10), false);
  assert.equal(isBracketIndexUnlocked(0, 10), true);
  assert.equal(isBracketIndexUnlocked(1, 10), true);
});

test("isBracketIndexUnlocked rejects an out-of-bounds index cleanly, never throws", () => {
  assert.equal(isBracketIndexUnlocked(-1, 100), false);
  assert.equal(isBracketIndexUnlocked(999, 100), false);
});

test("getWildLevelRangeForBracketIndex returns null (never throws) for an out-of-bounds index", () => {
  assert.equal(getWildLevelRangeForBracketIndex(-1), null);
  assert.equal(getWildLevelRangeForBracketIndex(999), null);
});

test("getWildLevelRangeForBracketIndex returns the exact same range as the bracket table for a real index", () => {
  assert.deepEqual(getWildLevelRangeForBracketIndex(0), { minimumLevel: 1, maximumLevel: 7 });
  assert.deepEqual(getWildLevelRangeForBracketIndex(WILD_LEVEL_BRACKETS.length - 1), { minimumLevel: 53, maximumLevel: 60 });
});
