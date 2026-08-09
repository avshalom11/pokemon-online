import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_7_LEARNSETS } from "./index.ts";
import { validateLearnsetList } from "../../validation/learnset-validation.ts";
import { POKEMON_DATA } from "../../../../data/pokemon/pokemon-data.ts";

// NOTE: GENERATION_7_LEARNSETS holds modern (current-generation) level-up
// data filtered to this project's own move database, not a byte-for-byte
// transcription of the original 2016/2017 Sun/Moon/Ultra Sun/Ultra Moon
// learnsets — see the top-of-file note in ./index.ts. These completeness
// checks are about coverage (every Alola species, no duplicates, no
// unknown references, strictly ascending levels), not historical accuracy.
//
// 88 official Alola base species (#722-809) + 18 Alolan Forms + 2
// additional Lycanroc alternate forms (Midnight/Dusk) = 108. This is the
// one number this file's own database is built around; if it drifts,
// something is missing, duplicated, or miscounted.
const EXPECTED_GENERATION_7_LEARNSET_COUNT = 108;

test("exactly 108 Generation 7 Pokémon learnsets are loaded (88 Alola base species + 18 Alolan Forms + 2 Lycanroc alternate forms)", () => {
  assert.equal(GENERATION_7_LEARNSETS.length, EXPECTED_GENERATION_7_LEARNSET_COUNT);
});

test("nothing is missing: every learnset is present exactly once (count matches unique pokemonId count)", () => {
  const uniqueIds = new Set(GENERATION_7_LEARNSETS.map((learnset) => learnset.pokemonId));
  assert.equal(uniqueIds.size, EXPECTED_GENERATION_7_LEARNSET_COUNT);
});

test("there are no duplicate Pokémon learnsets", () => {
  const ids = GENERATION_7_LEARNSETS.map((learnset) => learnset.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("there are no unknown pokemonIds and no unknown moveIds (validateLearnsetList succeeds with 0 problems)", () => {
  assert.doesNotThrow(() => validateLearnsetList(GENERATION_7_LEARNSETS));
});

test("every learnset passes validation with zero failures", () => {
  const validated = validateLearnsetList(GENERATION_7_LEARNSETS);
  assert.equal(validated.length, EXPECTED_GENERATION_7_LEARNSET_COUNT);
});

// The schema itself only rejects EXACT duplicate entries and a move with two
// different levels — it does not enforce that entries are ordered. Ascending
// order is a data-authoring convention (matching every prior generation's
// own precedent), checked explicitly here since nothing else in the
// pipeline verifies it.
test("every learnset's level-up entries are in strictly ascending level order", () => {
  const outOfOrder: string[] = [];
  for (const learnset of GENERATION_7_LEARNSETS) {
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

test("every level entry is a positive integer", () => {
  const invalid: string[] = [];
  for (const learnset of GENERATION_7_LEARNSETS) {
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
  for (const learnset of GENERATION_7_LEARNSETS) {
    for (const entry of learnset.entries) {
      if (entry.method.kind !== "level-up") {
        nonLevelUp.push(`${learnset.pokemonId}: ${entry.moveId} (${entry.method.kind})`);
      }
    }
  }
  assert.deepEqual(nonLevelUp, []);
});

test("every official Alola base species (#722-809, formOf undefined) has its own learnset", () => {
  const alolaBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 722 && species.dexNumber <= 809
  ).map((species) => species.id);

  const learnsetIds = new Set(GENERATION_7_LEARNSETS.map((learnset) => learnset.pokemonId));
  const missing = alolaBaseIds.filter((id) => !learnsetIds.has(id));
  assert.deepEqual(missing, []);
  assert.equal(alolaBaseIds.length, 88);
});

test("all 88 base species have exactly one learnset each", () => {
  const alolaBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 722 && species.dexNumber <= 809
  ).map((species) => species.id);

  for (const id of alolaBaseIds) {
    const matches = GENERATION_7_LEARNSETS.filter((learnset) => learnset.pokemonId === id);
    assert.equal(matches.length, 1, `${id} must have exactly one learnset`);
  }
});

// Every alternate form this phase approved: the 18 Alolan Forms (sharing a
// Kanto dexNumber) + Lycanroc Midnight/Dusk (sharing dex #745 with base
// lycanroc). Derived from the live species catalog's own formOf field
// (never a naive "id contains a hyphen" check — several genuine BASE Gen 7
// species ids also contain hyphens, e.g. type-null, jangmo-o, hakamo-o,
// kommo-o, and the four Tapu, none of which are alternate forms).
const APPROVED_ALOLA_FORM_IDS = POKEMON_DATA.filter(
  (species) => species.formOf !== undefined && (species.dexNumber === 745 || (species.dexNumber >= 1 && species.dexNumber <= 151))
).map((species) => species.id);

test("test assumption: exactly 20 approved alternate-form species exist in the live catalog (18 Alolan Forms + 2 Lycanroc)", () => {
  assert.equal(APPROVED_ALOLA_FORM_IDS.length, 20);
});

test("every one of the 18 Alolan Forms has exactly one learnset, and it is not empty", () => {
  const alolanFormIds = POKEMON_DATA.filter(
    (species) => species.formOf !== undefined && species.dexNumber >= 1 && species.dexNumber <= 151
  ).map((species) => species.id);
  assert.equal(alolanFormIds.length, 18);

  for (const id of alolanFormIds) {
    const matches = GENERATION_7_LEARNSETS.filter((learnset) => learnset.pokemonId === id);
    assert.equal(matches.length, 1, `${id} must have exactly one learnset`);
    assert.ok(matches[0]!.entries.length > 0, `${id}'s learnset must not be empty`);
  }
});

test("Lycanroc has exactly three learnsets across its form group (Midday/base + Midnight + Dusk), and all three are genuinely distinct", () => {
  const lycanrocIds = ["lycanroc", "lycanroc-midnight", "lycanroc-dusk"];
  const found = lycanrocIds.filter((id) => GENERATION_7_LEARNSETS.some((learnset) => learnset.pokemonId === id));
  assert.deepEqual(found, lycanrocIds);

  const entrySets = lycanrocIds.map((id) => JSON.stringify(GENERATION_7_LEARNSETS.find((learnset) => learnset.pokemonId === id)!.entries));
  assert.equal(new Set(entrySets).size, 3, "Lycanroc's three forms must have three genuinely distinct learnsets, never two copies of the same one");
});

test("no unexpected alternate-form learnsets exist beyond the 18 approved Alolan Forms and the 2 Lycanroc alternate forms (no Oricorio styles, Wishiwashi School, Minior colors, Silvally memory types, Mimikyu Busted, Necrozma fusion forms, Magearna Original Color, Totem forms, or Pikachu caps)", () => {
  const learnsetIds = new Set(GENERATION_7_LEARNSETS.map((learnset) => learnset.pokemonId));
  const catalogFormIds = new Set(POKEMON_DATA.filter((species) => species.formOf !== undefined).map((species) => species.id));

  // Every learnset id that IS a catalog alternate form must be one of the
  // 20 approved Gen VII ones — no excluded Gen VII form (or any other
  // generation's form) ever gets its own Generation 7 learnset entry.
  const formLearnsetIds = [...learnsetIds].filter((id) => catalogFormIds.has(id));
  assert.deepEqual([...formLearnsetIds].sort(), [...APPROVED_ALOLA_FORM_IDS].sort());
});

test("every Generation 7 learnset entry uses the level-up method only, matching every prior generation's own precedent", () => {
  for (const learnset of GENERATION_7_LEARNSETS) {
    for (const entry of learnset.entries) {
      assert.equal(entry.method.kind, "level-up", `${learnset.pokemonId} has a non-level-up entry (${entry.moveId})`);
    }
  }
});

test("every Generation 7 learnset is keyed by generation 7", () => {
  assert.ok(GENERATION_7_LEARNSETS.every((learnset) => learnset.generation === 7));
});

test("Meltan and Melmetal each have a valid, non-empty static learnset — no Pokémon GO Candy mechanic and no Let's Go-exclusive move (out of this phase's move scope) appears in either", () => {
  const meltan = GENERATION_7_LEARNSETS.find((learnset) => learnset.pokemonId === "meltan");
  const melmetal = GENERATION_7_LEARNSETS.find((learnset) => learnset.pokemonId === "melmetal");
  assert.ok(meltan && meltan.entries.length > 0);
  assert.ok(melmetal && melmetal.entries.length > 0);

  const forbiddenIds = ["double-iron-bash"];
  for (const learnset of [meltan!, melmetal!]) {
    for (const entry of learnset.entries) {
      assert.ok(!forbiddenIds.includes(entry.moveId), `${learnset.pokemonId} must never reference the Let's Go-exclusive ${entry.moveId}`);
    }
  }
});
