import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_3_LEARNSETS } from "./index.ts";
import { validateLearnsetList } from "../../validation/learnset-validation.ts";
import { POKEMON_DATA } from "../../../../data/pokemon/pokemon-data.ts";

// NOTE: GENERATION_3_LEARNSETS holds modern (current-generation) level-up
// data filtered to this project's own move database, not a byte-for-byte
// transcription of the original 2002 Ruby/Sapphire learnsets — see the
// top-of-file note in ./index.ts. These completeness checks are about
// coverage (every Hoenn species, no duplicates, no unknown references,
// strictly ascending levels), not historical accuracy.
//
// 135 official Hoenn base species (#252-#386) + 3 Deoxys alternate forms
// (deoxys-attack/defense/speed — see features/pokemon/forms's own Forms
// architecture) = 138. This is the one number this file's own database is
// built around; if it drifts, something is missing, duplicated, or
// miscounted.
const EXPECTED_GENERATION_3_LEARNSET_COUNT = 138;

test("exactly 138 Generation 3 Pokémon learnsets are loaded (135 Hoenn base species + 3 Deoxys forms)", () => {
  assert.equal(GENERATION_3_LEARNSETS.length, EXPECTED_GENERATION_3_LEARNSET_COUNT);
});

test("nothing is missing: every learnset is present exactly once (count matches unique pokemonId count)", () => {
  const uniqueIds = new Set(GENERATION_3_LEARNSETS.map((learnset) => learnset.pokemonId));
  assert.equal(uniqueIds.size, EXPECTED_GENERATION_3_LEARNSET_COUNT);
});

test("there are no duplicate Pokémon learnsets", () => {
  const ids = GENERATION_3_LEARNSETS.map((learnset) => learnset.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("there are no unknown pokemonIds and no unknown moveIds (validateLearnsetList succeeds with 0 problems)", () => {
  assert.doesNotThrow(() => validateLearnsetList(GENERATION_3_LEARNSETS));
});

test("every learnset passes validation with zero failures", () => {
  const validated = validateLearnsetList(GENERATION_3_LEARNSETS);
  assert.equal(validated.length, EXPECTED_GENERATION_3_LEARNSET_COUNT);
});

// The schema itself only rejects EXACT duplicate entries and a move with
// two different levels — it does not enforce that entries are ordered.
// Ascending order is a data-authoring convention (matching Generation 1/2's
// own precedent), checked explicitly here since nothing else in the
// pipeline verifies it.
test("every learnset's level-up entries are in strictly ascending level order", () => {
  const outOfOrder: string[] = [];
  for (const learnset of GENERATION_3_LEARNSETS) {
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

test("every Hoenn base species (#252-#386, formOf undefined) has its own learnset", () => {
  const hoennBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 252 && species.dexNumber <= 386
  ).map((species) => species.id);

  const learnsetIds = new Set(GENERATION_3_LEARNSETS.map((learnset) => learnset.pokemonId));
  const missing = hoennBaseIds.filter((id) => !learnsetIds.has(id));
  assert.deepEqual(missing, []);
  assert.equal(hoennBaseIds.length, 135);
});

test("all four Deoxys forms each have their own independent learnset", () => {
  const deoxysIds = ["deoxys", "deoxys-attack", "deoxys-defense", "deoxys-speed"];
  for (const id of deoxysIds) {
    const learnset = GENERATION_3_LEARNSETS.find((entry) => entry.pokemonId === id);
    assert.ok(learnset, `expected a learnset for ${id}`);
    assert.ok(learnset!.entries.length > 0, `${id}'s learnset must not be empty`);
  }
  // Not literally identical move lists — each form's own learnset was tuned
  // to its own stat spread (see this generation's own top-of-file note).
  const deoxysEntrySets = deoxysIds.map((id) =>
    JSON.stringify(GENERATION_3_LEARNSETS.find((entry) => entry.pokemonId === id)!.entries)
  );
  assert.equal(new Set(deoxysEntrySets).size, 4, "each Deoxys form should have a distinct learnset, not four copies of the same one");
});

test("Castform has exactly one learnset — no Sunny/Rainy/Snowy alternate-form learnsets exist", () => {
  const castformLearnsets = GENERATION_3_LEARNSETS.filter((learnset) => learnset.pokemonId.startsWith("castform"));
  assert.deepEqual(castformLearnsets.map((learnset) => learnset.pokemonId), ["castform"]);
});

test("every Generation 3 learnset entry uses the level-up method only, matching Generation 1/2 precedent", () => {
  for (const learnset of GENERATION_3_LEARNSETS) {
    for (const entry of learnset.entries) {
      assert.equal(entry.method.kind, "level-up", `${learnset.pokemonId} has a non-level-up entry (${entry.moveId})`);
    }
  }
});
