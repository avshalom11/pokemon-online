import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateBaseBattlePokemonXp,
  distributeBattlePokemonXp,
  getEligibleParticipantIds,
  getLevelDifferenceXpMultiplier,
  getPokemonLevelFromTotalXp,
  getPokemonLevelProgress,
  getTotalXpRequiredForPokemonLevel,
  getXpRequiredForNextPokemonLevel,
  withParticipant,
  withParticipantFainted,
} from "./pokemon-progression-calculations.ts";
import { MAX_LEVEL_MULTIPLIER, MAX_POKEMON_LEVEL, MIN_LEVEL_MULTIPLIER } from "./pokemon-progression-config.ts";

// --- Level curve -----------------------------------------------------

test("a level-1 Pokemon starts at 0 XP", () => {
  assert.equal(getPokemonLevelFromTotalXp(0), 1);
});

test("level 1 -> 2 requires exactly 100 XP", () => {
  assert.equal(getPokemonLevelFromTotalXp(99), 1);
  assert.equal(getPokemonLevelFromTotalXp(100), 2);
  assert.equal(getXpRequiredForNextPokemonLevel(1), 100);
});

test("cumulative XP thresholds match the spec examples", () => {
  assert.equal(getTotalXpRequiredForPokemonLevel(1), 0);
  assert.equal(getTotalXpRequiredForPokemonLevel(2), 100);
  assert.equal(getTotalXpRequiredForPokemonLevel(3), 300);
  assert.equal(getTotalXpRequiredForPokemonLevel(4), 600);
  assert.equal(getTotalXpRequiredForPokemonLevel(5), 1000);
});

test("a single large reward can gain multiple levels at once", () => {
  // Level 1 -> level 4 requires exactly 600 total XP (spec example).
  assert.equal(getPokemonLevelFromTotalXp(600), 4);
  assert.equal(getPokemonLevelFromTotalXp(650), 4);
});

test("level is capped at MAX_POKEMON_LEVEL no matter how much XP accumulates", () => {
  const hugeXp = getTotalXpRequiredForPokemonLevel(MAX_POKEMON_LEVEL) + 1_000_000;
  assert.equal(getPokemonLevelFromTotalXp(hugeXp), MAX_POKEMON_LEVEL);
  assert.equal(getXpRequiredForNextPokemonLevel(MAX_POKEMON_LEVEL), 0);
});

// --- Progress within a level ------------------------------------------

test("progress at a normal level is calculated correctly", () => {
  // Level 3 starts at 300 total XP; 420 total XP -> 120/200 into level 3.
  const progress = getPokemonLevelProgress(420);
  assert.equal(progress.level, 3);
  assert.equal(progress.currentLevelXp, 120);
  assert.equal(progress.xpRequiredForNextLevel, 300);
  assert.equal(progress.remainingXp, 180);
  assert.equal(progress.progressPercent, 40);
  assert.equal(progress.isMaxLevel, false);
});

test("progress at level 100 never divides by zero and reports max level", () => {
  const totalXp = getTotalXpRequiredForPokemonLevel(MAX_POKEMON_LEVEL) + 5000;
  const progress = getPokemonLevelProgress(totalXp);
  assert.equal(progress.level, MAX_POKEMON_LEVEL);
  assert.equal(progress.isMaxLevel, true);
  assert.equal(progress.xpRequiredForNextLevel, 0);
  assert.equal(progress.remainingXp, 0);
  assert.equal(progress.progressPercent, 100);
  assert.ok(Number.isFinite(progress.progressPercent));
});

test("negative XP is rejected/clamped safely", () => {
  const progress = getPokemonLevelProgress(-500);
  assert.equal(progress.level, 1);
  assert.equal(progress.totalXp, 0);
  assert.equal(progress.currentLevelXp, 0);
});

// --- Level-difference multiplier -----------------------------------------

test("equal levels produce a 1.0x multiplier", () => {
  assert.equal(getLevelDifferenceXpMultiplier(5, 5), 1);
  assert.equal(getLevelDifferenceXpMultiplier(25, 25), 1);
});

test("a higher-level wild than the recipient increases the multiplier", () => {
  // 5 levels higher * 0.05 step = +25%.
  assert.equal(getLevelDifferenceXpMultiplier(5, 10), 1.25);
});

test("a lower-level wild than the recipient decreases the multiplier", () => {
  // 5 levels lower * 0.05 step = -25%.
  assert.equal(getLevelDifferenceXpMultiplier(10, 5), 0.75);
});

test("the multiplier clamps at MIN_LEVEL_MULTIPLIER for a far weaker wild", () => {
  assert.equal(getLevelDifferenceXpMultiplier(50, 5), MIN_LEVEL_MULTIPLIER);
});

test("the multiplier clamps at MAX_LEVEL_MULTIPLIER for a far stronger wild", () => {
  assert.equal(getLevelDifferenceXpMultiplier(5, 50), MAX_LEVEL_MULTIPLIER);
});

// --- Base battle XP -----------------------------------------------------

test("base battle XP is defeatedWildLevel * BASE_POKEMON_XP_MULTIPLIER, scaled by the level-difference multiplier", () => {
  // Equal levels: 10 * 10 * 1.0 = 100.
  assert.equal(calculateBaseBattlePokemonXp(10, 10), 100);
});

test("verification scenario: level 5 defeats level 5 -> normal XP", () => {
  assert.equal(calculateBaseBattlePokemonXp(5, 5), 50);
});

test("verification scenario: level 5 defeats level 10 -> higher XP", () => {
  assert.equal(calculateBaseBattlePokemonXp(10, 5), 125);
});

test("verification scenario: level 10 defeats level 5 -> lower XP", () => {
  assert.equal(calculateBaseBattlePokemonXp(5, 10), 38);
});

test("verification scenario: level 25 defeats level 25 -> normal XP", () => {
  assert.equal(calculateBaseBattlePokemonXp(25, 25), 250);
});

test("verification scenario: level 50 defeats level 5 -> strong XP reduction (floor)", () => {
  assert.equal(calculateBaseBattlePokemonXp(5, 50), 25);
});

test("verification scenario: level 5 defeats level 50 -> maximum XP bonus (capped)", () => {
  assert.equal(calculateBaseBattlePokemonXp(50, 5), 1000);
});

// --- Distribution --------------------------------------------------------

test("one eligible participant receives 100% of the reward pool", () => {
  const shares = distributeBattlePokemonXp(200, ["charmander"], "charmander");
  assert.deepEqual(shares, [{ playerPokemonId: "charmander", role: "finisher", xpAmount: 200, xpShare: 1 }]);
});

test("two eligible participants split 65/35, finisher first", () => {
  const shares = distributeBattlePokemonXp(200, ["charmander", "pikachu"], "pikachu");
  const finisher = shares.find((s) => s.playerPokemonId === "pikachu")!;
  const other = shares.find((s) => s.playerPokemonId === "charmander")!;
  assert.equal(finisher.role, "finisher");
  assert.equal(finisher.xpAmount, 130);
  assert.equal(other.role, "participant");
  assert.equal(other.xpAmount, 70);
});

test("a fainted starter is excluded and the surviving finisher gets 100%", () => {
  const participants = withParticipantFainted(
    [
      { playerPokemonId: "charmander", fainted: false, order: 0 },
      { playerPokemonId: "pikachu", fainted: false, order: 1 },
    ],
    "charmander"
  );
  const eligible = getEligibleParticipantIds(participants);
  assert.deepEqual(eligible, ["pikachu"]);

  const shares = distributeBattlePokemonXp(200, eligible, "pikachu");
  assert.deepEqual(shares, [{ playerPokemonId: "pikachu", role: "finisher", xpAmount: 200, xpShare: 1 }]);
});

test("if one of two participants fainted, the surviving finisher receives 100%", () => {
  // Same scenario phrased the other way around per the spec's own item 12.
  const eligible = getEligibleParticipantIds([
    { playerPokemonId: "charmander", fainted: true, order: 0 },
    { playerPokemonId: "pikachu", fainted: false, order: 1 },
  ]);
  const shares = distributeBattlePokemonXp(200, eligible, "pikachu");
  assert.equal(shares.length, 1);
  assert.equal(shares[0].xpAmount, 200);
});

test("three eligible participants: finisher gets 65%, the rest split the remaining 35% evenly", () => {
  const shares = distributeBattlePokemonXp(200, ["a", "b", "c"], "c");
  const byId = Object.fromEntries(shares.map((s) => [s.playerPokemonId, s]));
  assert.equal(byId.c.role, "finisher");
  assert.equal(byId.c.xpAmount, 130);
  assert.equal(byId.a.xpAmount, 35);
  assert.equal(byId.b.xpAmount, 35);
});

test("integer rounding never breaks the exact total for an uneven split", () => {
  // 200 * 0.35 / 3 = 23.33... -> floors to 23 each, finisher absorbs the remainder.
  const shares = distributeBattlePokemonXp(200, ["a", "b", "c", "d"], "d");
  const byId = Object.fromEntries(shares.map((s) => [s.playerPokemonId, s.xpAmount]));
  assert.equal(byId.a, 23);
  assert.equal(byId.b, 23);
  assert.equal(byId.c, 23);
  assert.equal(byId.d, 200 - 23 * 3);

  const total = shares.reduce((sum, s) => sum + s.xpAmount, 0);
  assert.equal(total, 200);
});

test("the total distributed XP always equals BaseBattleXp, across many participant counts", () => {
  for (const baseXp of [1, 7, 20, 199, 200, 201, 997]) {
    for (let count = 1; count <= 6; count++) {
      const ids = Array.from({ length: count }, (_, i) => `p${i}`);
      const shares = distributeBattlePokemonXp(baseXp, ids, ids[ids.length - 1]);
      const total = shares.reduce((sum, s) => sum + s.xpAmount, 0);
      assert.equal(total, baseXp, `baseXp=${baseXp} count=${count}`);
    }
  }
});

test("a Pokemon not passed in the participant list receives nothing", () => {
  const shares = distributeBattlePokemonXp(200, ["a", "b"], "b");
  assert.equal(
    shares.some((s) => s.playerPokemonId === "c"),
    false
  );
});

test("duplicate participant IDs are deduplicated before distribution", () => {
  const shares = distributeBattlePokemonXp(200, ["a", "a", "b"], "b");
  assert.equal(shares.length, 2);
  const total = shares.reduce((sum, s) => sum + s.xpAmount, 0);
  assert.equal(total, 200);
});

// --- Participant-list bookkeeping ----------------------------------------

test("switching to the same Pokemon repeatedly records it only once", () => {
  let participants = withParticipant([], "a");
  participants = withParticipant(participants, "b");
  participants = withParticipant(participants, "a");
  participants = withParticipant(participants, "a");
  participants = withParticipant(participants, "b");

  assert.equal(participants.length, 2);
  assert.deepEqual(
    participants.map((p) => p.playerPokemonId),
    ["a", "b"]
  );
});

test("a fainted Pokemon remains ineligible even if it participated earlier and is targeted again", () => {
  let participants = withParticipant([], "a");
  participants = withParticipant(participants, "b");
  participants = withParticipantFainted(participants, "a");
  // Re-adding/re-fainting an already-fainted participant must not resurrect it.
  participants = withParticipant(participants, "a");
  participants = withParticipantFainted(participants, "a");

  assert.deepEqual(getEligibleParticipantIds(participants), ["b"]);
});
