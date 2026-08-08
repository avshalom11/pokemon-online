import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_6_LEARNSETS } from "./index.ts";
import { validateLearnsetList } from "../../validation/learnset-validation.ts";
import { POKEMON_DATA } from "../../../../data/pokemon/pokemon-data.ts";

// NOTE: GENERATION_6_LEARNSETS holds modern (current-generation) level-up
// data filtered to this project's own move database, not a byte-for-byte
// transcription of the original 2013/2014 X/Y/Omega Ruby/Alpha Sapphire
// learnsets — see the top-of-file note in ./index.ts. These completeness
// checks are about coverage (every Kalos species, no duplicates, no unknown
// references, strictly ascending levels), not historical accuracy.
//
// 72 official Kalos base species (#650-#721) + 1 alternate form
// (hoopa-unbound) = 73. This is the one number this file's own database is
// built around; if it drifts, something is missing, duplicated, or
// miscounted.
const EXPECTED_GENERATION_6_LEARNSET_COUNT = 73;

test("exactly 73 Generation 6 Pokémon learnsets are loaded (72 Kalos base species + 1 alternate form)", () => {
  assert.equal(GENERATION_6_LEARNSETS.length, EXPECTED_GENERATION_6_LEARNSET_COUNT);
});

test("nothing is missing: every learnset is present exactly once (count matches unique pokemonId count)", () => {
  const uniqueIds = new Set(GENERATION_6_LEARNSETS.map((learnset) => learnset.pokemonId));
  assert.equal(uniqueIds.size, EXPECTED_GENERATION_6_LEARNSET_COUNT);
});

test("there are no duplicate Pokémon learnsets", () => {
  const ids = GENERATION_6_LEARNSETS.map((learnset) => learnset.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("there are no unknown pokemonIds and no unknown moveIds (validateLearnsetList succeeds with 0 problems)", () => {
  assert.doesNotThrow(() => validateLearnsetList(GENERATION_6_LEARNSETS));
});

test("every learnset passes validation with zero failures", () => {
  const validated = validateLearnsetList(GENERATION_6_LEARNSETS);
  assert.equal(validated.length, EXPECTED_GENERATION_6_LEARNSET_COUNT);
});

// The schema itself only rejects EXACT duplicate entries and a move with two
// different levels — it does not enforce that entries are ordered. Ascending
// order is a data-authoring convention (matching Generation 1-5's own
// precedent), checked explicitly here since nothing else in the pipeline
// verifies it.
test("every learnset's level-up entries are in strictly ascending level order", () => {
  const outOfOrder: string[] = [];
  for (const learnset of GENERATION_6_LEARNSETS) {
    const levels = learnset.entries.map((entry) => (entry.method.kind === "level-up" ? entry.method.level : null));
    for (let i = 1; i < levels.length; i++) {
      if (levels[i]! < levels[i - 1]!) {
        outOfOrder.push(learnset.pokemonId);
        break;
      }
    }
  }
  assert.deepEqual(outOfOrder, []);
});

test("every levels entry is a positive integer", () => {
  const invalid: string[] = [];
  for (const learnset of GENERATION_6_LEARNSETS) {
    for (const entry of learnset.entries) {
      if (entry.method.kind === "level-up" && (!Number.isInteger(entry.method.level) || entry.method.level <= 0)) {
        invalid.push(`${learnset.pokemonId}:${entry.moveId}`);
      }
    }
  }
  assert.deepEqual(invalid, []);
});

test("no TM/HM, breeding (egg), tutor, or event-only (special) moves exist — level-up only, matching every prior generation's own scope", () => {
  const nonLevelUp: string[] = [];
  for (const learnset of GENERATION_6_LEARNSETS) {
    for (const entry of learnset.entries) {
      if (entry.method.kind !== "level-up") {
        nonLevelUp.push(`${learnset.pokemonId}: ${entry.moveId} (${entry.method.kind})`);
      }
    }
  }
  assert.deepEqual(nonLevelUp, []);
});

test("every official Kalos base species (#650-#721, formOf undefined) has its own learnset", () => {
  const kalosBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 650 && species.dexNumber <= 721
  ).map((species) => species.id);

  const learnsetIds = new Set(GENERATION_6_LEARNSETS.map((learnset) => learnset.pokemonId));
  const missing = kalosBaseIds.filter((id) => !learnsetIds.has(id));
  assert.deepEqual(missing, []);
  assert.equal(kalosBaseIds.length, 72);
});

test("all 72 base species have exactly one learnset each", () => {
  const kalosBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 650 && species.dexNumber <= 721
  ).map((species) => species.id);

  for (const id of kalosBaseIds) {
    const matches = GENERATION_6_LEARNSETS.filter((learnset) => learnset.pokemonId === id);
    assert.equal(matches.length, 1, `${id} must have exactly one learnset`);
  }
});

test("Hoopa Unbound (the one approved Kalos alternate form) has exactly one learnset, and it is not empty", () => {
  const matches = GENERATION_6_LEARNSETS.filter((learnset) => learnset.pokemonId === "hoopa-unbound");
  assert.equal(matches.length, 1);
  assert.ok(matches[0]!.entries.length > 0, "hoopa-unbound's learnset must not be empty");
});

test("no unexpected alternate-form learnsets exist beyond hoopa-unbound (no Aegislash Blade Forme, Pumpkaboo/Gourgeist sizes, Vivillon patterns, Flabébé/Floette/Florges colors, or any Mega form)", () => {
  const expectedFormIds = ["hoopa-unbound"];
  const formLikeIds = GENERATION_6_LEARNSETS.map((learnset) => learnset.pokemonId).filter(
    (id) => id.includes("-") && !expectedFormIds.includes(id)
  );
  assert.deepEqual(formLikeIds, []);
});

test("Hoopa has exactly two learnsets across its form group (Confined + Unbound), and they are genuinely distinct", () => {
  const hoopaIds = ["hoopa", "hoopa-unbound"];
  const found = hoopaIds.filter((id) => GENERATION_6_LEARNSETS.some((learnset) => learnset.pokemonId === id));
  assert.deepEqual(found, hoopaIds);

  const entrySets = hoopaIds.map((id) => JSON.stringify(GENERATION_6_LEARNSETS.find((learnset) => learnset.pokemonId === id)!.entries));
  assert.equal(new Set(entrySets).size, 2, "Hoopa and Hoopa Unbound must have genuinely distinct learnsets, not two copies of the same one");
});

test("every Generation 6 learnset entry uses the level-up method only, matching Generation 1-5 precedent", () => {
  for (const learnset of GENERATION_6_LEARNSETS) {
    for (const entry of learnset.entries) {
      assert.equal(entry.method.kind, "level-up", `${learnset.pokemonId} has a non-level-up entry (${entry.moveId})`);
    }
  }
});

test("every Generation 6 learnset is keyed by generation 6", () => {
  assert.ok(GENERATION_6_LEARNSETS.every((learnset) => learnset.generation === 6));
});
