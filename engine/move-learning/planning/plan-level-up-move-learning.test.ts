import assert from "node:assert/strict";
import { test } from "node:test";

import { planLevelUpMoveLearning } from "./plan-level-up-move-learning.ts";
import { CHARMANDER_LEARNSET } from "../../learnsets/test-fixtures.ts";

function plan(input: Parameters<typeof planLevelUpMoveLearning>[0]) {
  const result = planLevelUpMoveLearning(input);
  assert.equal(result.status, "success", `expected success, got ${JSON.stringify(result)}`);
  if (result.status !== "success") throw new Error("unreachable");
  return result.plan;
}

// ===========================================================================
// PURE MOVE DETECTION
// ===========================================================================

test("no level increase detects no moves (a normal no-op, not an error)", () => {
  const result = planLevelUpMoveLearning({
    pokemonId: "bulbasaur",
    oldLevel: 10,
    newLevel: 10,
    currentKnownMoveIds: ["growl"],
    existingPendingMoveIds: [],
  });
  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.deepEqual(result.plan.detectedMoves, []);
});

test("a one-level increase detects moves learned at exactly the new level", () => {
  const p = plan({
    pokemonId: "bulbasaur",
    oldLevel: 5,
    newLevel: 6,
    currentKnownMoveIds: [],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.detectedMoves, [{ moveId: "growth", learnedAtLevel: 6 }]);
});

test("a multi-level increase detects every move across the whole interval", () => {
  const p = plan({
    pokemonId: "bulbasaur",
    oldLevel: 5,
    newLevel: 13,
    currentKnownMoveIds: [],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(
    p.detectedMoves.map((m) => m.moveId),
    ["growth", "leech-seed", "razor-leaf"]
  );
});

test("a move learned exactly at newLevel is included", () => {
  const p = plan({
    pokemonId: "bulbasaur",
    oldLevel: 8,
    newLevel: 9,
    currentKnownMoveIds: [],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.detectedMoves, [{ moveId: "leech-seed", learnedAtLevel: 9 }]);
});

test("a move learned at oldLevel is excluded (oldLevel is exclusive)", () => {
  const p = plan({
    pokemonId: "bulbasaur",
    oldLevel: 9,
    newLevel: 12,
    currentKnownMoveIds: [],
    existingPendingMoveIds: [],
  });
  assert.ok(!p.detectedMoves.some((m) => m.moveId === "leech-seed"));
  assert.deepEqual(
    p.detectedMoves.map((m) => m.moveId),
    ["razor-leaf"]
  );
});

test("multiple moves learned at the same level are all detected, in canonical order", () => {
  const p = plan({
    pokemonId: "mew",
    oldLevel: 1,
    newLevel: 10,
    currentKnownMoveIds: [],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(
    p.detectedMoves.map((m) => m.moveId),
    ["amnesia", "mega-punch"]
  );
});

test("canonical ordering: lower learned levels are processed first", () => {
  const p = plan({
    pokemonId: "snorlax",
    oldLevel: 15,
    newLevel: 21,
    currentKnownMoveIds: [],
    existingPendingMoveIds: [],
  });
  const levels = p.detectedMoves.map((m) => m.learnedAtLevel);
  assert.deepEqual(levels, [...levels].sort((a, b) => a - b));
});

test("an unknown Pokémon id detects no moves rather than erroring", () => {
  const p = plan({
    pokemonId: "not-a-real-pokemon",
    oldLevel: 1,
    newLevel: 50,
    currentKnownMoveIds: [],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.detectedMoves, []);
});

test("a descending level range is rejected as invalid", () => {
  const result = planLevelUpMoveLearning({
    pokemonId: "bulbasaur",
    oldLevel: 10,
    newLevel: 5,
    currentKnownMoveIds: [],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(result, { status: "invalidLevelRange", oldLevel: 10, newLevel: 5 });
});

test("no moves in the level interval detects nothing (Abra, Metapod)", () => {
  assert.deepEqual(
    plan({ pokemonId: "abra", oldLevel: 1, newLevel: 100, currentKnownMoveIds: ["teleport"], existingPendingMoveIds: [] })
      .detectedMoves,
    []
  );
  assert.deepEqual(
    plan({ pokemonId: "metapod", oldLevel: 1, newLevel: 100, currentKnownMoveIds: ["harden"], existingPendingMoveIds: [] })
      .detectedMoves,
    []
  );
});

test("a duplicate Learnset move occurrence in the interval is detected only once", () => {
  // The fixture's Ember appears twice: unscoped at level 9, and under
  // versionGroup "yellow" at level 7 — both fall in (1, 9].
  const p = plan({
    pokemonId: "charmander",
    oldLevel: 1,
    newLevel: 9,
    currentKnownMoveIds: [],
    existingPendingMoveIds: [],
    learnset: CHARMANDER_LEARNSET,
  });
  const emberOccurrences = p.detectedMoves.filter((m) => m.moveId === "ember");
  assert.equal(emberOccurrences.length, 1);
  // First eligible occurrence in canonical (level-ascending) processing
  // order is the level-7 (versionGroup "yellow") one.
  assert.equal(emberOccurrences[0].learnedAtLevel, 7);
});

// ===========================================================================
// MOVE-LEARNING PLAN
// ===========================================================================

test("zero current Known Moves: everything eligible auto-learns up to the cap", () => {
  const p = plan({
    pokemonId: "charmander",
    oldLevel: 1,
    newLevel: 8,
    currentKnownMoveIds: [],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.automaticallyLearnedMoveIds, ["ember", "smokescreen"]);
  assert.deepEqual(p.pendingMoves, []);
  assert.deepEqual(p.finalKnownMoveIds, ["ember", "smokescreen"]);
});

test("one current Known Move leaves three open slots", () => {
  const p = plan({
    pokemonId: "charmander",
    oldLevel: 1,
    newLevel: 8,
    currentKnownMoveIds: ["growl"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.finalKnownMoveIds, ["growl", "ember", "smokescreen"]);
});

test("two current Known Moves leave two open slots", () => {
  const p = plan({
    pokemonId: "charmander",
    oldLevel: 1,
    newLevel: 8,
    currentKnownMoveIds: ["growl", "scratch"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.automaticallyLearnedMoveIds, ["ember", "smokescreen"]);
  assert.deepEqual(p.finalKnownMoveIds, ["growl", "scratch", "ember", "smokescreen"]);
});

test("three current Known Moves leave exactly one open slot", () => {
  const p = plan({
    pokemonId: "snorlax",
    oldLevel: 15,
    newLevel: 21,
    currentKnownMoveIds: ["tackle", "defense-curl", "screech"],
    existingPendingMoveIds: [],
  });
  // Eligible in order: bite@16, headbutt@17, rest@20 — only one slot open.
  assert.deepEqual(p.automaticallyLearnedMoveIds, ["bite"]);
  assert.deepEqual(
    p.pendingMoves.map((m) => m.moveId),
    ["headbutt", "rest"]
  );
  assert.equal(p.finalKnownMoveIds.length, 4);
});

test("exactly four current Known Moves: nothing can auto-learn, everything eligible becomes pending", () => {
  const p = plan({
    pokemonId: "squirtle",
    oldLevel: 6,
    newLevel: 13,
    currentKnownMoveIds: ["tackle", "tail-whip", "water-gun", "withdraw"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.automaticallyLearnedMoveIds, []);
  assert.deepEqual(p.pendingMoves, [
    { moveId: "bite", learnedAtLevel: 12 },
    { moveId: "bubble", learnedAtLevel: 13 },
  ]);
  assert.deepEqual(p.finalKnownMoveIds, ["tackle", "tail-whip", "water-gun", "withdraw"]);
});

test("exactly one move auto-learned when only one is eligible", () => {
  const p = plan({
    pokemonId: "eevee",
    oldLevel: 1,
    newLevel: 5,
    currentKnownMoveIds: ["growl", "tackle", "tail-whip"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.automaticallyLearnedMoveIds, ["sand-attack"]);
  assert.deepEqual(p.finalKnownMoveIds, ["growl", "tackle", "tail-whip", "sand-attack"]);
});

test("multiple moves auto-learn in one plan when enough slots are open", () => {
  const p = plan({
    pokemonId: "mew",
    oldLevel: 1,
    newLevel: 50,
    currentKnownMoveIds: ["pound"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.automaticallyLearnedMoveIds, ["amnesia", "mega-punch", "barrier"]);
  assert.deepEqual(p.finalKnownMoveIds, ["pound", "amnesia", "mega-punch", "barrier"]);
  assert.deepEqual(p.pendingMoves, []);
});

test("automatic learning fills exactly up to the fourth slot, then the rest become pending", () => {
  // The task's own A,B known; C,D,E newly learned -> C,D auto-learn, E
  // pending example, using real data (Snorlax 15->20).
  const p = plan({
    pokemonId: "snorlax",
    oldLevel: 15,
    newLevel: 20,
    currentKnownMoveIds: ["tackle", "growl"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.automaticallyLearnedMoveIds, ["bite", "headbutt"]);
  assert.deepEqual(p.pendingMoves, [{ moveId: "rest", learnedAtLevel: 20 }]);
  assert.deepEqual(p.finalKnownMoveIds, ["tackle", "growl", "bite", "headbutt"]);
});

test("an already-known move is skipped, not re-learned or duplicated", () => {
  const p = plan({
    pokemonId: "bulbasaur",
    oldLevel: 5,
    newLevel: 9,
    currentKnownMoveIds: ["growl", "tackle", "vine-whip", "leech-seed"],
    existingPendingMoveIds: [],
  });
  // leech-seed is in the (5,9] interval but already known.
  assert.deepEqual(p.alreadyKnownMoveIds, ["leech-seed"]);
  assert.deepEqual(p.automaticallyLearnedMoveIds, []);
  assert.deepEqual(p.finalKnownMoveIds, ["growl", "tackle", "vine-whip", "leech-seed"]);
});

test("an already-pending move is skipped, not queued a second time", () => {
  const p = plan({
    pokemonId: "snorlax",
    oldLevel: 15,
    newLevel: 17,
    currentKnownMoveIds: ["tackle", "growl", "defense-curl", "screech"],
    existingPendingMoveIds: ["bite"],
  });
  assert.deepEqual(p.alreadyPendingMoveIds, ["bite"]);
  assert.deepEqual(p.pendingMoves, [{ moveId: "headbutt", learnedAtLevel: 17 }]);
});

test("a duplicate move inside the same plan is only ever decided once", () => {
  const p = plan({
    pokemonId: "charmander",
    oldLevel: 1,
    newLevel: 9,
    currentKnownMoveIds: [],
    existingPendingMoveIds: [],
    learnset: CHARMANDER_LEARNSET,
  });
  const emberDecisions =
    p.automaticallyLearnedMoveIds.filter((id) => id === "ember").length +
    p.pendingMoves.filter((m) => m.moveId === "ember").length +
    p.alreadyKnownMoveIds.filter((id) => id === "ember").length +
    p.alreadyPendingMoveIds.filter((id) => id === "ember").length;
  assert.equal(emberDecisions, 1);
});

test("existing pending moves do not consume Known Move slots", () => {
  // Known: A,B,C (3). Pending: D. New eligible: E. E must fill slot 4.
  const p = plan({
    pokemonId: "snorlax",
    oldLevel: 17,
    newLevel: 20,
    currentKnownMoveIds: ["tackle", "growl", "defense-curl"],
    existingPendingMoveIds: ["bite"],
  });
  assert.deepEqual(p.automaticallyLearnedMoveIds, ["rest"]);
  assert.equal(p.finalKnownMoveIds.length, 4);
});

test("existing Known Move order is preserved exactly", () => {
  const p = plan({
    pokemonId: "bulbasaur",
    oldLevel: 5,
    newLevel: 6,
    currentKnownMoveIds: ["vine-whip", "growl", "tackle"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.finalKnownMoveIds.slice(0, 3), ["vine-whip", "growl", "tackle"]);
});

test("automatically learned moves are appended in the order they were learned", () => {
  const p = plan({
    pokemonId: "mew",
    oldLevel: 1,
    newLevel: 40,
    currentKnownMoveIds: ["pound"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.finalKnownMoveIds, ["pound", "amnesia", "mega-punch", "barrier"]);
});

test("pending moves preserve their learned level and Learnset order", () => {
  const p = plan({
    pokemonId: "dragonite",
    oldLevel: 1,
    newLevel: 25,
    currentKnownMoveIds: ["thunder-punch", "thunder-wave", "wing-attack", "wrap"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.pendingMoves, [
    { moveId: "dragon-rage", learnedAtLevel: 15 },
    { moveId: "agility", learnedAtLevel: 20 },
    { moveId: "slam", learnedAtLevel: 25 },
  ]);
});

test("final Known Move count never exceeds four, however many moves are eligible", () => {
  const p = plan({
    pokemonId: "snorlax",
    oldLevel: 1,
    newLevel: 60,
    currentKnownMoveIds: [],
    existingPendingMoveIds: [],
  });
  assert.ok(p.finalKnownMoveIds.length <= 4);
});

test("repeated execution with identical input is deterministic", () => {
  const input = {
    pokemonId: "pikachu" as const,
    oldLevel: 20,
    newLevel: 40,
    currentKnownMoveIds: ["growl", "quick-attack", "tail-whip", "thunder-shock"],
    existingPendingMoveIds: [],
  };
  const first = plan(input);
  const second = plan(input);
  assert.deepEqual(first, second);
});

// ===========================================================================
// REAL DATA SPOT CHECKS
// ===========================================================================

test("spot check: Bulbasaur (5 -> 13, 3 known)", () => {
  const p = plan({
    pokemonId: "bulbasaur",
    oldLevel: 5,
    newLevel: 13,
    currentKnownMoveIds: ["growl", "tackle", "vine-whip"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.automaticallyLearnedMoveIds, ["growth"]);
  assert.deepEqual(p.pendingMoves, [
    { moveId: "leech-seed", learnedAtLevel: 9 },
    { moveId: "razor-leaf", learnedAtLevel: 12 },
  ]);
  assert.deepEqual(p.finalKnownMoveIds, ["growl", "tackle", "vine-whip", "growth"]);
});

test("spot check: Charmander (1 -> 8, 2 known)", () => {
  const p = plan({
    pokemonId: "charmander",
    oldLevel: 1,
    newLevel: 8,
    currentKnownMoveIds: ["growl", "scratch"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.finalKnownMoveIds, ["growl", "scratch", "ember", "smokescreen"]);
  assert.deepEqual(p.pendingMoves, []);
});

test("spot check: Squirtle (6 -> 13, 4 known/full)", () => {
  const p = plan({
    pokemonId: "squirtle",
    oldLevel: 6,
    newLevel: 13,
    currentKnownMoveIds: ["tackle", "tail-whip", "water-gun", "withdraw"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.pendingMoves, [
    { moveId: "bite", learnedAtLevel: 12 },
    { moveId: "bubble", learnedAtLevel: 13 },
  ]);
  assert.deepEqual(p.finalKnownMoveIds, ["tackle", "tail-whip", "water-gun", "withdraw"]);
});

test("spot check: Pikachu (1 -> 4, already full at level 1)", () => {
  const p = plan({
    pokemonId: "pikachu",
    oldLevel: 1,
    newLevel: 4,
    currentKnownMoveIds: ["growl", "quick-attack", "tail-whip", "thunder-shock"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.pendingMoves, [{ moveId: "thunder-wave", learnedAtLevel: 4 }]);
});

test("spot check: Eevee (1 -> 5, 3 known)", () => {
  const p = plan({
    pokemonId: "eevee",
    oldLevel: 1,
    newLevel: 5,
    currentKnownMoveIds: ["growl", "tackle", "tail-whip"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.finalKnownMoveIds, ["growl", "tackle", "tail-whip", "sand-attack"]);
});

test("spot check: Abra (1 -> 100, single move, nothing further to learn)", () => {
  const p = plan({
    pokemonId: "abra",
    oldLevel: 1,
    newLevel: 100,
    currentKnownMoveIds: ["teleport"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.detectedMoves, []);
  assert.deepEqual(p.finalKnownMoveIds, ["teleport"]);
});

test("spot check: Metapod (1 -> 100, single move, nothing further to learn)", () => {
  const p = plan({
    pokemonId: "metapod",
    oldLevel: 1,
    newLevel: 100,
    currentKnownMoveIds: ["harden"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.detectedMoves, []);
});

test("spot check: Snorlax (15 -> 21, 2 known)", () => {
  const p = plan({
    pokemonId: "snorlax",
    oldLevel: 15,
    newLevel: 21,
    currentKnownMoveIds: ["tackle", "defense-curl"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.automaticallyLearnedMoveIds, ["bite", "headbutt"]);
  assert.deepEqual(p.pendingMoves, [{ moveId: "rest", learnedAtLevel: 20 }]);
});

test("spot check: Dragonite (1 -> 25, already full at level 1)", () => {
  const p = plan({
    pokemonId: "dragonite",
    oldLevel: 1,
    newLevel: 25,
    currentKnownMoveIds: ["thunder-punch", "thunder-wave", "wing-attack", "wrap"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(
    p.pendingMoves.map((m) => m.moveId),
    ["dragon-rage", "agility", "slam"]
  );
});

test("spot check: Mew (1 -> 50, 1 known)", () => {
  const p = plan({
    pokemonId: "mew",
    oldLevel: 1,
    newLevel: 50,
    currentKnownMoveIds: ["pound"],
    existingPendingMoveIds: [],
  });
  assert.deepEqual(p.automaticallyLearnedMoveIds, ["amnesia", "mega-punch", "barrier"]);
  assert.deepEqual(p.finalKnownMoveIds, ["pound", "amnesia", "mega-punch", "barrier"]);
});
