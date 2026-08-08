import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_5_LEARNSETS } from "./index.ts";
import { validateLearnsetList } from "../../validation/learnset-validation.ts";
import { POKEMON_DATA } from "../../../../data/pokemon/pokemon-data.ts";

// NOTE: GENERATION_5_LEARNSETS holds modern (current-generation) level-up
// data filtered to this project's own move database, not a byte-for-byte
// transcription of the original 2010/2012 Black/White/Black2/White2
// learnsets — see the top-of-file note in ./index.ts. These completeness
// checks are about coverage (every Unova species, no duplicates, no unknown
// references, strictly ascending levels), not historical accuracy.
//
// 156 official Unova base species (#494-#649) + 7 alternate forms
// (tornadus-therian, thundurus-therian, landorus-therian, kyurem-black,
// kyurem-white, keldeo-resolute, meloetta-pirouette) = 163. This is the one
// number this file's own database is built around; if it drifts, something
// is missing, duplicated, or miscounted.
const EXPECTED_GENERATION_5_LEARNSET_COUNT = 163;

test("exactly 163 Generation 5 Pokémon learnsets are loaded (156 Unova base species + 7 alternate forms)", () => {
  assert.equal(GENERATION_5_LEARNSETS.length, EXPECTED_GENERATION_5_LEARNSET_COUNT);
});

test("nothing is missing: every learnset is present exactly once (count matches unique pokemonId count)", () => {
  const uniqueIds = new Set(GENERATION_5_LEARNSETS.map((learnset) => learnset.pokemonId));
  assert.equal(uniqueIds.size, EXPECTED_GENERATION_5_LEARNSET_COUNT);
});

test("there are no duplicate Pokémon learnsets", () => {
  const ids = GENERATION_5_LEARNSETS.map((learnset) => learnset.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("there are no unknown pokemonIds and no unknown moveIds (validateLearnsetList succeeds with 0 problems)", () => {
  assert.doesNotThrow(() => validateLearnsetList(GENERATION_5_LEARNSETS));
});

test("every learnset passes validation with zero failures", () => {
  const validated = validateLearnsetList(GENERATION_5_LEARNSETS);
  assert.equal(validated.length, EXPECTED_GENERATION_5_LEARNSET_COUNT);
});

// The schema itself only rejects EXACT duplicate entries and a move with two
// different levels — it does not enforce that entries are ordered. Ascending
// order is a data-authoring convention (matching Generation 1-4's own
// precedent), checked explicitly here since nothing else in the pipeline
// verifies it.
test("every learnset's level-up entries are in strictly ascending level order", () => {
  const outOfOrder: string[] = [];
  for (const learnset of GENERATION_5_LEARNSETS) {
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
  for (const learnset of GENERATION_5_LEARNSETS) {
    for (const entry of learnset.entries) {
      if (entry.method.kind === "level-up" && (!Number.isInteger(entry.method.level) || entry.method.level <= 0)) {
        invalid.push(`${learnset.pokemonId}:${entry.moveId}`);
      }
    }
  }
  assert.deepEqual(invalid, []);
});

test("every official Unova base species (#494-#649, formOf undefined) has its own learnset", () => {
  const unovaBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 494 && species.dexNumber <= 649
  ).map((species) => species.id);

  const learnsetIds = new Set(GENERATION_5_LEARNSETS.map((learnset) => learnset.pokemonId));
  const missing = unovaBaseIds.filter((id) => !learnsetIds.has(id));
  assert.deepEqual(missing, []);
  assert.equal(unovaBaseIds.length, 156);
});

test("all 156 base species have exactly one learnset each", () => {
  const unovaBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 494 && species.dexNumber <= 649
  ).map((species) => species.id);

  for (const id of unovaBaseIds) {
    const matches = GENERATION_5_LEARNSETS.filter((learnset) => learnset.pokemonId === id);
    assert.equal(matches.length, 1, `${id} must have exactly one learnset`);
  }
});

test("all 7 alternate forms (Tornadus/Thundurus/Landorus Therian, Kyurem Black/White, Keldeo Resolute, Meloetta Pirouette) each have exactly one learnset", () => {
  const formIds = ["tornadus-therian", "thundurus-therian", "landorus-therian", "kyurem-black", "kyurem-white", "keldeo-resolute", "meloetta-pirouette"];
  for (const id of formIds) {
    const matches = GENERATION_5_LEARNSETS.filter((learnset) => learnset.pokemonId === id);
    assert.equal(matches.length, 1, `${id} must have exactly one learnset`);
    assert.ok(matches[0]!.entries.length > 0, `${id}'s learnset must not be empty`);
  }
});

test("Tornadus has exactly two learnsets across its form group (Incarnate + Therian)", () => {
  const tornadusIds = ["tornadus", "tornadus-therian"];
  const found = tornadusIds.filter((id) => GENERATION_5_LEARNSETS.some((learnset) => learnset.pokemonId === id));
  assert.deepEqual(found, tornadusIds);

  const entrySets = tornadusIds.map((id) => JSON.stringify(GENERATION_5_LEARNSETS.find((learnset) => learnset.pokemonId === id)!.entries));
  assert.equal(new Set(entrySets).size, 2, "each Tornadus form should have a distinct learnset, not two copies of the same one");
});

test("Thundurus has exactly two learnsets across its form group (Incarnate + Therian)", () => {
  const thundurusIds = ["thundurus", "thundurus-therian"];
  const found = thundurusIds.filter((id) => GENERATION_5_LEARNSETS.some((learnset) => learnset.pokemonId === id));
  assert.deepEqual(found, thundurusIds);

  const entrySets = thundurusIds.map((id) => JSON.stringify(GENERATION_5_LEARNSETS.find((learnset) => learnset.pokemonId === id)!.entries));
  assert.equal(new Set(entrySets).size, 2, "each Thundurus form should have a distinct learnset, not two copies of the same one");
});

test("Landorus has exactly two learnsets across its form group (Incarnate + Therian)", () => {
  const landorusIds = ["landorus", "landorus-therian"];
  const found = landorusIds.filter((id) => GENERATION_5_LEARNSETS.some((learnset) => learnset.pokemonId === id));
  assert.deepEqual(found, landorusIds);

  const entrySets = landorusIds.map((id) => JSON.stringify(GENERATION_5_LEARNSETS.find((learnset) => learnset.pokemonId === id)!.entries));
  assert.equal(new Set(entrySets).size, 2, "each Landorus form should have a distinct learnset, not two copies of the same one");
});

test("Kyurem has exactly three learnsets across its form group (base + Black + White)", () => {
  const kyuremIds = ["kyurem", "kyurem-black", "kyurem-white"];
  const found = kyuremIds.filter((id) => GENERATION_5_LEARNSETS.some((learnset) => learnset.pokemonId === id));
  assert.deepEqual(found, kyuremIds);

  const entrySets = kyuremIds.map((id) => JSON.stringify(GENERATION_5_LEARNSETS.find((learnset) => learnset.pokemonId === id)!.entries));
  assert.equal(new Set(entrySets).size, 3, "each Kyurem form should have a distinct learnset, not three copies of the same one");
});

test("Keldeo has exactly two learnsets across its form group (Ordinary + Resolute)", () => {
  const keldeoIds = ["keldeo", "keldeo-resolute"];
  const found = keldeoIds.filter((id) => GENERATION_5_LEARNSETS.some((learnset) => learnset.pokemonId === id));
  assert.deepEqual(found, keldeoIds);

  const entrySets = keldeoIds.map((id) => JSON.stringify(GENERATION_5_LEARNSETS.find((learnset) => learnset.pokemonId === id)!.entries));
  assert.equal(new Set(entrySets).size, 2, "each Keldeo form should have a distinct learnset, not two copies of the same one");
});

test("Meloetta has exactly two learnsets across its form group (Aria + Pirouette)", () => {
  const meloettaIds = ["meloetta", "meloetta-pirouette"];
  const found = meloettaIds.filter((id) => GENERATION_5_LEARNSETS.some((learnset) => learnset.pokemonId === id));
  assert.deepEqual(found, meloettaIds);

  const entrySets = meloettaIds.map((id) => JSON.stringify(GENERATION_5_LEARNSETS.find((learnset) => learnset.pokemonId === id)!.entries));
  assert.equal(new Set(entrySets).size, 2, "each Meloetta form should have a distinct learnset, not two copies of the same one");
});

test("no unexpected alternate-form learnsets exist (no Basculin stripe forms, Darmanitan Zen, Deerling/Sawsbuck seasonal forms, Genesect Drives)", () => {
  const expectedFormIds = ["tornadus-therian", "thundurus-therian", "landorus-therian", "kyurem-black", "kyurem-white", "keldeo-resolute", "meloetta-pirouette"];
  const formLikeIds = GENERATION_5_LEARNSETS.map((learnset) => learnset.pokemonId).filter(
    (id) => id.includes("-") && !expectedFormIds.includes(id)
  );
  assert.deepEqual(formLikeIds, []);
});

test("every Generation 5 learnset entry uses the level-up method only, matching Generation 1-4 precedent", () => {
  for (const learnset of GENERATION_5_LEARNSETS) {
    for (const entry of learnset.entries) {
      assert.equal(entry.method.kind, "level-up", `${learnset.pokemonId} has a non-level-up entry (${entry.moveId})`);
    }
  }
});
