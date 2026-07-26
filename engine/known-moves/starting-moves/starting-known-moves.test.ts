import assert from "node:assert/strict";
import { test } from "node:test";

import { getStartingKnownMoves } from "./starting-known-moves.ts";
import { CHARMANDER_LEARNSET } from "../../learnsets/test-fixtures.ts";
import { MAX_KNOWN_MOVES } from "../constants.ts";

// All expected values below are derived directly from this project's real
// (Phase 4B, modern-data) Generation 1 learnsets — never assumed from
// memory or from the original 1996 Red/Blue learnsets. See each
// engine/learnsets/data/generation-1/*.learnset.ts file for the source of
// truth these assertions were read from.

test("a level 1 Pokémon gets exactly its level-1 moves (Bulbasaur)", () => {
  assert.deepEqual(getStartingKnownMoves("bulbasaur", 1), ["growl", "tackle"]);
});

test("fewer than four eligible moves returns all of them (Charmander at level 1)", () => {
  const moves = getStartingKnownMoves("charmander", 1);
  assert.equal(moves.length, 2);
  assert.deepEqual(moves, ["growl", "scratch"]);
});

test("exactly four eligible moves returns all four, in chronological order (Charmander at level 10)", () => {
  const moves = getStartingKnownMoves("charmander", 10);
  assert.deepEqual(moves, ["growl", "scratch", "ember", "smokescreen"]);
});

test("more than four eligible moves keeps only the four most recently learned, in chronological order (Squirtle at level 50)", () => {
  const moves = getStartingKnownMoves("squirtle", 50);
  assert.equal(moves.length, MAX_KNOWN_MOVES);
  assert.deepEqual(moves, ["bite", "bubble", "hydro-pump", "skull-bash"]);
});

test("multiple moves learned at the same level are all kept when four or fewer (Eevee at level 1)", () => {
  const moves = getStartingKnownMoves("eevee", 1);
  assert.deepEqual(moves, ["growl", "tackle", "tail-whip"]);
});

test("more than four moves at the very same level keeps the last four in declared order, not reversed (Dragonite at level 1)", () => {
  // Dragonite has 6 level-1 moves: fire-punch, leer, thunder-punch,
  // thunder-wave, wing-attack, wrap (in that declared order) — this is
  // this project's real-data version of the task's A,B,C,D,E,F -> C,D,E,F
  // example.
  const moves = getStartingKnownMoves("dragonite", 1);
  assert.deepEqual(moves, ["thunder-punch", "thunder-wave", "wing-attack", "wrap"]);
});

test("more than four moves at the same level, mixed with a real cutoff (Snorlax at level 1)", () => {
  // Snorlax has 5 level-1 moves: defense-curl, lick, metronome, screech,
  // tackle — one more than the cap.
  const moves = getStartingKnownMoves("snorlax", 1);
  assert.deepEqual(moves, ["lick", "metronome", "screech", "tackle"]);
});

test("a Pokémon with exactly one eligible move returns just that move (Abra)", () => {
  assert.deepEqual(getStartingKnownMoves("abra", 1), ["teleport"]);
  assert.deepEqual(getStartingKnownMoves("abra", 100), ["teleport"]);
});

test("a Pokémon with exactly one eligible move returns just that move (Metapod)", () => {
  assert.deepEqual(getStartingKnownMoves("metapod", 1), ["harden"]);
});

test("a Pokémon with no eligible moves at the given level returns an empty list, never a fabricated move", () => {
  assert.deepEqual(getStartingKnownMoves("bulbasaur", 0), []);
});

test("an unknown Pokémon id returns an empty list rather than throwing", () => {
  assert.deepEqual(getStartingKnownMoves("not-a-real-pokemon", 50), []);
});

test("duplicate move occurrences (same move at different levels via different version groups) are collapsed to the most recently learned one", () => {
  // The fixture's Ember appears twice: once unscoped at level 9, once
  // under versionGroup "yellow" at level 7. Both are eligible by level 9;
  // the higher (unscoped, level 9) occurrence must be the one kept, and it
  // must not appear twice.
  const moves = getStartingKnownMoves("charmander", 9, CHARMANDER_LEARNSET);
  assert.deepEqual(moves, ["scratch", "growl", "ember"]);
  assert.equal(moves.filter((moveId) => moveId === "ember").length, 1);
});

test("never returns more than MAX_KNOWN_MOVES moves", () => {
  for (const [pokemonId, level] of [
    ["pikachu", 100],
    ["snorlax", 100],
    ["dragonite", 100],
    ["mew", 100],
  ] as const) {
    assert.ok(getStartingKnownMoves(pokemonId, level).length <= MAX_KNOWN_MOVES);
  }
});

test("ordering is deterministic across repeated calls", () => {
  const first = getStartingKnownMoves("pikachu", 100);
  const second = getStartingKnownMoves("pikachu", 100);
  assert.deepEqual(first, second);
});

// --- required spot checks -------------------------------------------------

test("spot check: Bulbasaur", () => {
  assert.deepEqual(getStartingKnownMoves("bulbasaur", 1), ["growl", "tackle"]);
  assert.deepEqual(getStartingKnownMoves("bulbasaur", 100), ["sleep-powder", "take-down", "double-edge", "solar-beam"]);
});

test("spot check: Charmander", () => {
  assert.deepEqual(getStartingKnownMoves("charmander", 1), ["growl", "scratch"]);
  assert.deepEqual(getStartingKnownMoves("charmander", 10), ["growl", "scratch", "ember", "smokescreen"]);
});

test("spot check: Squirtle", () => {
  assert.deepEqual(getStartingKnownMoves("squirtle", 1), ["tackle", "tail-whip"]);
  assert.deepEqual(getStartingKnownMoves("squirtle", 50), ["bite", "bubble", "hydro-pump", "skull-bash"]);
});

test("spot check: Pikachu", () => {
  assert.deepEqual(getStartingKnownMoves("pikachu", 1), ["growl", "quick-attack", "tail-whip", "thunder-shock"]);
  assert.deepEqual(getStartingKnownMoves("pikachu", 100), ["slam", "thunderbolt", "light-screen", "thunder"]);
});

test("spot check: Eevee", () => {
  assert.deepEqual(getStartingKnownMoves("eevee", 1), ["growl", "tackle", "tail-whip"]);
});

test("spot check: Abra", () => {
  assert.deepEqual(getStartingKnownMoves("abra", 50), ["teleport"]);
});

test("spot check: Metapod", () => {
  assert.deepEqual(getStartingKnownMoves("metapod", 50), ["harden"]);
});

test("spot check: Snorlax", () => {
  assert.deepEqual(getStartingKnownMoves("snorlax", 1), ["lick", "metronome", "screech", "tackle"]);
  assert.deepEqual(getStartingKnownMoves("snorlax", 100), ["rest", "body-slam", "amnesia", "hyper-beam"]);
});

test("spot check: Dragonite", () => {
  assert.deepEqual(getStartingKnownMoves("dragonite", 1), ["thunder-punch", "thunder-wave", "wing-attack", "wrap"]);
  assert.deepEqual(getStartingKnownMoves("dragonite", 100), ["dragon-rage", "agility", "slam", "hyper-beam"]);
});

test("spot check: Mew", () => {
  assert.deepEqual(getStartingKnownMoves("mew", 1), ["pound"]);
  assert.deepEqual(getStartingKnownMoves("mew", 100), ["barrier", "metronome", "transform", "psychic"]);
});
