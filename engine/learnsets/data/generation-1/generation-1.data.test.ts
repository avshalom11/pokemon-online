import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_1_LEARNSETS } from "./index.ts";
import { validateLearnset } from "../../validation/learnset-validation.ts";
import { getAllLearnsets, getLearnsetByPokemonId, hasLearnset } from "../../registry/learnset-registry.ts";
import { getLevelUpEntries, getMovesLearnedAtLevel } from "../../queries/learnset-queries.ts";
import { getMoveById } from "../../../moves/index.ts";
import { POKEMON_DATA } from "../../../../data/pokemon/pokemon-data.ts";

// NOTE: the spot checks below assert that known moves appear in a
// species' learnset (e.g. Bulbasaur knows Tackle) — they do not assert
// historical 1996 levels, because this data is modern (current-
// generation) level-up data, not authentic Generation 1 data. See the
// IMPORTANT note atop ./index.ts.

test("every learnset validates individually", () => {
  const failures: string[] = [];
  for (const learnset of GENERATION_1_LEARNSETS) {
    try {
      validateLearnset(learnset);
    } catch (error) {
      failures.push(`${learnset.pokemonId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("every Pokémon has exactly one learnset in the registry", () => {
  for (const learnset of GENERATION_1_LEARNSETS) {
    assert.equal(hasLearnset(learnset.pokemonId), true);
    assert.equal(getLearnsetByPokemonId(learnset.pokemonId)?.pokemonId, learnset.pokemonId);
  }
  // The real registry is every generation's learnsets combined (see
  // engine/learnsets/data/index.ts) — Generation 2 exists alongside
  // Generation 1 as of Phase 3, so this only asserts the
  // Generation-1-tagged subset of the real registry matches this file's
  // own GENERATION_1_LEARNSETS array, never a raw getAllLearnsets().length
  // equality.
  assert.equal(getAllLearnsets().filter((l) => l.generation === 1).length, GENERATION_1_LEARNSETS.length);
});

test("every learnset references only existing moves", () => {
  const unresolved: string[] = [];
  for (const learnset of GENERATION_1_LEARNSETS) {
    for (const entry of learnset.entries) {
      if (getMoveById(entry.moveId) === undefined) {
        unresolved.push(`${learnset.pokemonId} -> ${entry.moveId}`);
      }
    }
  }
  assert.deepEqual(unresolved, []);
});

test("every learnset references only existing Pokémon", () => {
  const knownSpeciesIds = new Set(POKEMON_DATA.map((species) => species.id));
  const unresolved = GENERATION_1_LEARNSETS.map((l) => l.pokemonId).filter((id) => !knownSpeciesIds.has(id));
  assert.deepEqual(unresolved, []);
});

test("every entry uses kind: \"level-up\" — no TM, HM, egg, tutor, or special entries exist yet", () => {
  const nonLevelUp: string[] = [];
  for (const learnset of GENERATION_1_LEARNSETS) {
    for (const entry of learnset.entries) {
      if (entry.method.kind !== "level-up") {
        nonLevelUp.push(`${learnset.pokemonId}: ${entry.moveId} (${entry.method.kind})`);
      }
    }
  }
  assert.deepEqual(nonLevelUp, []);
});

test("every level-up entry has a positive integer level (never 0)", () => {
  for (const learnset of GENERATION_1_LEARNSETS) {
    for (const entry of learnset.entries) {
      if (entry.method.kind === "level-up") {
        assert.ok(Number.isInteger(entry.method.level) && entry.method.level >= 1, `${learnset.pokemonId}: ${entry.moveId} has level ${entry.method.level}`);
      }
    }
  }
});

test("the real registry loads all Generation 1, Generation 2, Generation 3, Generation 4, Generation 5, Generation 6, Generation 7, and Generation 8 learnsets", () => {
  // 151 Generation 1 + 100 Generation 2 + 138 Generation 3 + 113
  // Generation 4 (Sinnoh Moves & Learnsets Phase 3 — 107 Sinnoh base
  // species + 6 alternate forms) + 163 Generation 5 (Unova Moves &
  // Learnsets Phase 3, extended by the Unova Update phase — 156 Unova base
  // species + 7 alternate forms) + 73 Generation 6 (Kalos Moves &
  // Learnsets Phase 3 — 72 Kalos base species + 1 alternate form) + 108
  // Generation 7 (Alola Moves & Learnsets Phase 3 — 88 Alola base species
  // + 18 Alolan Forms + 2 Lycanroc alternate forms) + 108 Generation 8
  // (Galar Moves & Learnsets Phase 3 — 89 Galar base species + 19
  // Galarian Forms) = 954, + 7 Pre-Paldea learnsets (#899-905, appended to
  // the Generation 4/Sinnoh learnset file) = 961, + 17 Pre-Paldea Hisuian
  // Forms (also appended to the Generation 4/Sinnoh learnset file) = 978.
  // Update this number deliberately whenever a new generation's learnset
  // data is registered — see engine/learnsets/data/index.ts.
  assert.equal(getAllLearnsets().length, 978);
});

test("queries continue to work correctly against the populated registry", () => {
  const bulbasaurLevel1 = getMovesLearnedAtLevel("bulbasaur", 1);
  assert.ok(bulbasaurLevel1.length > 0);
  assert.ok(bulbasaurLevel1.every((entry) => entry.method.kind === "level-up" && entry.method.level === 1));

  const bulbasaurLevelUp = getLevelUpEntries("bulbasaur");
  assert.equal(bulbasaurLevelUp.length, getLearnsetByPokemonId("bulbasaur")?.entries.length);
});

// --- spot checks ---
// Confirms basic shape (has a learnset, all level-up, level 1 covered,
// known moves present) for the species this phase specifically calls out.
// Exact levels are sourced data, not asserted move-by-move here (that's
// what the completeness + full-validation tests already guarantee at
// scale) — these checks instead prove the pipeline produced sane,
// well-known results for recognizable Pokémon.

const SPOT_CHECK_SPECIES = [
  "bulbasaur",
  "charmander",
  "squirtle",
  "pikachu",
  "eevee",
  "snorlax",
  "lapras",
  "dragonite",
  "mewtwo",
  "mew",
];

test("spot check: every named species has a non-empty, all-level-up learnset with real moves", () => {
  for (const pokemonId of SPOT_CHECK_SPECIES) {
    const learnset = getLearnsetByPokemonId(pokemonId);
    assert.ok(learnset, `expected a learnset for ${pokemonId}`);
    assert.ok(learnset.entries.length > 0, `expected ${pokemonId} to know at least one move`);
    assert.ok(
      learnset.entries.every((entry) => entry.method.kind === "level-up"),
      `expected every ${pokemonId} entry to be level-up`
    );
    for (const entry of learnset.entries) {
      assert.ok(getMoveById(entry.moveId), `${pokemonId}'s move "${entry.moveId}" must exist in the move registry`);
    }
  }
});

test("spot check: Bulbasaur starts with Tackle and Growl", () => {
  const startingMoveIds = getMovesLearnedAtLevel("bulbasaur", 1).map((entry) => entry.moveId);
  assert.ok(startingMoveIds.includes("tackle"));
  assert.ok(startingMoveIds.includes("growl"));
});

test("spot check: Charmander learns Ember by level-up", () => {
  const moveIds = getLevelUpEntries("charmander").map((entry) => entry.moveId);
  assert.ok(moveIds.includes("ember"));
});

test("spot check: Squirtle learns Water Gun by level-up", () => {
  const moveIds = getLevelUpEntries("squirtle").map((entry) => entry.moveId);
  assert.ok(moveIds.includes("water-gun"));
});

test("spot check: Pikachu learns Thunder Shock and Thunderbolt by level-up", () => {
  const moveIds = getLevelUpEntries("pikachu").map((entry) => entry.moveId);
  assert.ok(moveIds.includes("thunder-shock"));
  assert.ok(moveIds.includes("thunderbolt"));
});

test("spot check: Mewtwo learns Psychic by level-up", () => {
  const moveIds = getLevelUpEntries("mewtwo").map((entry) => entry.moveId);
  assert.ok(moveIds.includes("psychic"));
});

test("spot check: Mew learns Transform by level-up", () => {
  const moveIds = getLevelUpEntries("mew").map((entry) => entry.moveId);
  assert.ok(moveIds.includes("transform"));
});

test("spot check: Dragonite's learnset is ordered by level ascending", () => {
  const entries = getLevelUpEntries("dragonite");
  const levels = entries.map((entry) => (entry.method.kind === "level-up" ? entry.method.level : -1));
  const sortedLevels = [...levels].sort((a, b) => a - b);
  assert.deepEqual(levels, sortedLevels);
});
