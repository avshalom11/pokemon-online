import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getLearnsetEntries,
  getLevelUpEntries,
  getMachineEntries,
  getTutorEntries,
  getEggEntries,
  getSpecialEntries,
  getMovesLearnedAtLevel,
  getMovesLearnedBetweenLevels,
  getAvailableLevelUpMovesAtLevel,
  getStartingMoves,
} from "./learnset-queries.ts";
import { BULBASAUR_LEARNSET, CHARMANDER_LEARNSET, PIKACHU_LEARNSET, SQUIRTLE_LEARNSET } from "../test-fixtures.ts";

function ids(entries: { moveId: string }[]): string[] {
  return entries.map((entry) => entry.moveId);
}

test("getLearnsetEntries returns every entry for the species", () => {
  const entries = getLearnsetEntries("bulbasaur", BULBASAUR_LEARNSET);
  assert.equal(entries.length, BULBASAUR_LEARNSET.entries.length);
});

test("getLearnsetEntries returns an empty array for a species with no learnset (boundary case)", () => {
  assert.deepEqual(getLearnsetEntries("not-a-real-pokemon"), []);
});

// --- method filtering ---

test("getLevelUpEntries returns only level-up entries", () => {
  const entries = getLevelUpEntries("bulbasaur", BULBASAUR_LEARNSET);
  assert.ok(entries.every((entry) => entry.method.kind === "level-up"));
  assert.deepEqual(ids(entries), ["tackle", "growl", "leech-seed", "vine-whip"]);
});

test("getMachineEntries returns only machine entries", () => {
  const entries = getMachineEntries("bulbasaur", BULBASAUR_LEARNSET);
  assert.deepEqual(ids(entries), ["razor-leaf"]);
  assert.equal(entries[0].method.kind, "machine");
});

test("getTutorEntries returns only tutor entries", () => {
  const entries = getTutorEntries("bulbasaur", BULBASAUR_LEARNSET);
  assert.deepEqual(ids(entries), ["swords-dance"]);
});

test("getEggEntries returns only egg entries", () => {
  const entries = getEggEntries("bulbasaur", BULBASAUR_LEARNSET);
  assert.deepEqual(ids(entries), ["amnesia"]);
});

test("getSpecialEntries returns only special entries", () => {
  const entries = getSpecialEntries("bulbasaur", BULBASAUR_LEARNSET);
  assert.deepEqual(ids(entries), ["transform"]);
});

test("method filters return an empty array when a species has none of that method (boundary case)", () => {
  assert.deepEqual(getMachineEntries("squirtle", SQUIRTLE_LEARNSET), []);
  assert.deepEqual(getTutorEntries("squirtle", SQUIRTLE_LEARNSET), []);
  assert.deepEqual(getEggEntries("squirtle", SQUIRTLE_LEARNSET), []);
  assert.deepEqual(getSpecialEntries("squirtle", SQUIRTLE_LEARNSET), []);
});

// --- exact-level queries ---

test("getMovesLearnedAtLevel returns moves learned at exactly that level, including multiple moves at the same level", () => {
  const atLevel1 = getMovesLearnedAtLevel("bulbasaur", 1, BULBASAUR_LEARNSET);
  assert.deepEqual(ids(atLevel1), ["tackle", "growl"]);
});

test("getMovesLearnedAtLevel returns an empty array when nothing is learned at that level (boundary case)", () => {
  assert.deepEqual(getMovesLearnedAtLevel("bulbasaur", 2, BULBASAUR_LEARNSET), []);
});

// --- moves learned across multiple gained levels ---

test("getMovesLearnedBetweenLevels returns moves learned after previousLevel and up to and including newLevel", () => {
  // previousLevel=4, newLevel=13 should include levels 7 and 13, not level 1.
  const gained = getMovesLearnedBetweenLevels("bulbasaur", 4, 13, BULBASAUR_LEARNSET);
  assert.deepEqual(ids(gained), ["leech-seed", "vine-whip"]);
});

test("getMovesLearnedBetweenLevels excludes previousLevel itself", () => {
  // A move learned exactly at previousLevel must not be re-returned.
  const gained = getMovesLearnedBetweenLevels("bulbasaur", 1, 6, BULBASAUR_LEARNSET);
  assert.deepEqual(ids(gained), []);
});

test("getMovesLearnedBetweenLevels includes newLevel itself", () => {
  const gained = getMovesLearnedBetweenLevels("bulbasaur", 6, 7, BULBASAUR_LEARNSET);
  assert.deepEqual(ids(gained), ["leech-seed"]);
});

test("getMovesLearnedBetweenLevels returns an empty array when no level-up move falls in range (boundary case)", () => {
  assert.deepEqual(getMovesLearnedBetweenLevels("bulbasaur", 20, 30, BULBASAUR_LEARNSET), []);
});

// --- available moves at a requested level ---

test("getAvailableLevelUpMovesAtLevel returns every level-up move whose level is <= the requested level", () => {
  const available = getAvailableLevelUpMovesAtLevel("bulbasaur", 10, BULBASAUR_LEARNSET);
  assert.deepEqual(ids(available), ["tackle", "growl", "leech-seed"]);
});

test("getAvailableLevelUpMovesAtLevel at level 1 returns only the starting moves", () => {
  const available = getAvailableLevelUpMovesAtLevel("bulbasaur", 1, BULBASAUR_LEARNSET);
  assert.deepEqual(ids(available), ["tackle", "growl"]);
});

// --- starting move queries ---

test("getStartingMoves returns the level-up moves available by the starting level", () => {
  const starting = getStartingMoves("bulbasaur", 5, BULBASAUR_LEARNSET);
  assert.deepEqual(ids(starting), ["tackle", "growl"]);
});

test("getStartingMoves at level 1 matches getMovesLearnedAtLevel(pokemonId, 1)", () => {
  const starting = getStartingMoves("bulbasaur", 1, BULBASAUR_LEARNSET);
  const atLevel1 = getMovesLearnedAtLevel("bulbasaur", 1, BULBASAUR_LEARNSET);
  assert.deepEqual(starting, atLevel1);
});

// --- deterministic ordering ---

test("results are ordered by learning level ascending, then original entry order", () => {
  const all = getAvailableLevelUpMovesAtLevel("bulbasaur", 100, BULBASAUR_LEARNSET);
  const levels = all.map((entry) => (entry.method.kind === "level-up" ? entry.method.level : -1));
  assert.deepEqual(levels, [1, 1, 7, 13]);
  // Same-level tie (both level 1) preserves original fixture declaration order.
  assert.deepEqual(ids(all.slice(0, 2)), ["tackle", "growl"]);
});

test("ordering is stable across repeated calls (deterministic)", () => {
  const first = ids(getAvailableLevelUpMovesAtLevel("pikachu", 50, PIKACHU_LEARNSET));
  const second = ids(getAvailableLevelUpMovesAtLevel("pikachu", 50, PIKACHU_LEARNSET));
  assert.deepEqual(first, second);
  assert.deepEqual(first, ["thunder-shock", "quick-attack"]);
});

// --- distinct version-group records don't interfere with level queries ---

test("a versionGroup-scoped level-up entry is included in level queries alongside the unscoped one", () => {
  const atLevel9 = getMovesLearnedAtLevel("charmander", 9, CHARMANDER_LEARNSET);
  const atLevel7 = getMovesLearnedAtLevel("charmander", 7, CHARMANDER_LEARNSET);
  assert.deepEqual(ids(atLevel9), ["ember"]);
  assert.deepEqual(ids(atLevel7), ["ember"]);
});
