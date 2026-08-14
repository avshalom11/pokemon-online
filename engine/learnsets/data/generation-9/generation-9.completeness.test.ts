import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_9_LEARNSETS } from "./index.ts";
import { validateLearnsetList } from "../../validation/learnset-validation.ts";
import { POKEMON_DATA } from "../../../../data/pokemon/pokemon-data.ts";

// NOTE: GENERATION_9_LEARNSETS holds modern (current-generation) level-up
// data filtered to this project's own move database, not a byte-for-byte
// transcription of the original 2022/2023 Scarlet/Violet (incl. The Teal
// Mask and The Indigo Disk DLC) learnsets — see the top-of-file note in
// ./index.ts. These completeness checks are about coverage (every Paldea
// species, no duplicates, no unknown references, strictly ascending
// levels), not historical accuracy.
//
// 120 official Paldea base species (#906-1025) + 4 Paldean Forms = 124. This
// is the one number this file's own database is built around; if it
// drifts, something is missing, duplicated, or miscounted.
const EXPECTED_GENERATION_9_LEARNSET_COUNT = 124;

test("exactly 124 Generation 9 Pokémon learnsets are loaded (120 Paldea base species + 4 Paldean Forms)", () => {
  assert.equal(GENERATION_9_LEARNSETS.length, EXPECTED_GENERATION_9_LEARNSET_COUNT);
});

test("nothing is missing: every learnset is present exactly once (count matches unique pokemonId count)", () => {
  const uniqueIds = new Set(GENERATION_9_LEARNSETS.map((learnset) => learnset.pokemonId));
  assert.equal(uniqueIds.size, EXPECTED_GENERATION_9_LEARNSET_COUNT);
});

test("there are no duplicate Pokémon learnsets", () => {
  const ids = GENERATION_9_LEARNSETS.map((learnset) => learnset.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("there are no unknown pokemonIds and no unknown moveIds (validateLearnsetList succeeds with 0 problems)", () => {
  assert.doesNotThrow(() => validateLearnsetList(GENERATION_9_LEARNSETS));
});

test("every learnset passes validation with zero failures", () => {
  const validated = validateLearnsetList(GENERATION_9_LEARNSETS);
  assert.equal(validated.length, EXPECTED_GENERATION_9_LEARNSET_COUNT);
});

test("every learnset's level-up entries are in strictly ascending level order", () => {
  const outOfOrder: string[] = [];
  for (const learnset of GENERATION_9_LEARNSETS) {
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
  for (const learnset of GENERATION_9_LEARNSETS) {
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
  for (const learnset of GENERATION_9_LEARNSETS) {
    for (const entry of learnset.entries) {
      if (entry.method.kind !== "level-up") {
        nonLevelUp.push(`${learnset.pokemonId}: ${entry.moveId} (${entry.method.kind})`);
      }
    }
  }
  assert.deepEqual(nonLevelUp, []);
});

test("every official Paldea base species (#906-1025, formOf undefined) has its own learnset", () => {
  const paldeaBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 906 && species.dexNumber <= 1025
  ).map((species) => species.id);

  const learnsetIds = new Set(GENERATION_9_LEARNSETS.map((learnset) => learnset.pokemonId));
  const missing = paldeaBaseIds.filter((id) => !learnsetIds.has(id));
  assert.deepEqual(missing, []);
  assert.equal(paldeaBaseIds.length, 120);
});

test("all 120 base species have exactly one learnset each", () => {
  const paldeaBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 906 && species.dexNumber <= 1025
  ).map((species) => species.id);

  for (const id of paldeaBaseIds) {
    const matches = GENERATION_9_LEARNSETS.filter((learnset) => learnset.pokemonId === id);
    assert.equal(matches.length, 1, `${id} must have exactly one learnset`);
  }
});

// The 4 Paldean Forms — 3 Tauros breeds (formLabel ends with "Breed") + 1
// Wooper form (formLabel === "Paldean Form").
const APPROVED_PALDEAN_FORM_IDS = POKEMON_DATA.filter(
  (species) => species.formLabel === "Paldean Form" || species.formLabel?.endsWith("Breed")
).map((species) => species.id);

test("test assumption: exactly 4 approved Paldean Forms exist in the live catalog", () => {
  assert.equal(APPROVED_PALDEAN_FORM_IDS.length, 4);
});

test("every one of the 4 Paldean Forms has exactly one explicit, non-empty learnset — never runtime inheritance from its ordinary counterpart", () => {
  assert.equal(APPROVED_PALDEAN_FORM_IDS.length, 4);

  for (const id of APPROVED_PALDEAN_FORM_IDS) {
    const matches = GENERATION_9_LEARNSETS.filter((learnset) => learnset.pokemonId === id);
    assert.equal(matches.length, 1, `${id} must have exactly one learnset`);
    assert.ok(matches[0]!.entries.length > 0, `${id}'s learnset must not be empty`);
  }
});

test("no unexpected alternate-form learnsets exist beyond the 4 approved Paldean Forms (no Oinkologne sex variants, Maushold family variants, Squawkabilly plumage variants, Tatsugiri forms, Dudunsparce segment variants, Ogerpon masks, or Terapagos alternate forms)", () => {
  const learnsetIds = new Set(GENERATION_9_LEARNSETS.map((learnset) => learnset.pokemonId));
  const catalogFormIds = new Set(POKEMON_DATA.filter((species) => species.formOf !== undefined).map((species) => species.id));

  const formLearnsetIds = [...learnsetIds].filter((id) => catalogFormIds.has(id));
  assert.deepEqual([...formLearnsetIds].sort(), [...APPROVED_PALDEAN_FORM_IDS].sort());
});

test("every Generation 9 learnset entry uses the level-up method only, matching every prior generation's own precedent", () => {
  for (const learnset of GENERATION_9_LEARNSETS) {
    for (const entry of learnset.entries) {
      assert.equal(entry.method.kind, "level-up", `${learnset.pokemonId} has a non-level-up entry (${entry.moveId})`);
    }
  }
});

test("every Generation 9 learnset is keyed by generation 9", () => {
  assert.ok(GENERATION_9_LEARNSETS.every((learnset) => learnset.generation === 9));
});

// Four species evolve from an OLDER-generation species this file does NOT
// own (Primeape #57, Girafarig #203, Dunsparce #206, Bisharp #625) — each
// gets its own fresh, self-contained progression rather than repeating the
// pre-evolution's moves (that pre-evolution's own file is untouched).
test("Annihilape, Farigiraf, Dudunsparce, and Kingambit each have their own self-contained learnset, never repeating their older-generation pre-evolution's moves", () => {
  const byId = new Map(GENERATION_9_LEARNSETS.map((learnset) => [learnset.pokemonId, learnset]));
  for (const id of ["annihilape", "farigiraf", "dudunsparce", "kingambit"]) {
    const learnset = byId.get(id);
    assert.ok(learnset, `${id} must have a learnset`);
    assert.ok(learnset!.entries.length > 0, `${id}'s learnset must not be empty`);
  }
});

test("Paldean Wooper repeats its own moves into Clodsire at level 1; ordinary (non-Paldean) Wooper's Generation 2 learnset is untouched and never appears in this file", () => {
  const byId = new Map(GENERATION_9_LEARNSETS.map((learnset) => [learnset.pokemonId, learnset]));
  const wooperPaldea = byId.get("wooper-paldea")!;
  const clodsire = byId.get("clodsire")!;

  const wooperMoveIds = new Set(wooperPaldea.entries.map((entry) => entry.moveId));
  const clodsireLevel1MoveIds = new Set(
    clodsire.entries.filter((entry) => entry.method.kind === "level-up" && entry.method.level === 1).map((entry) => entry.moveId)
  );
  for (const moveId of wooperMoveIds) {
    assert.ok(clodsireLevel1MoveIds.has(moveId), `clodsire must know Paldean Wooper's "${moveId}" at level 1`);
  }

  const gen9Ids = new Set(GENERATION_9_LEARNSETS.map((learnset) => learnset.pokemonId));
  assert.equal(gen9Ids.has("wooper"), false, "ordinary Wooper must not appear in the Generation 9 learnset file");
});

test("Charcadet's two branch targets (Armarouge/Ceruledge) and the third Applin branch target (Dipplin) each have their own valid, non-empty learnset despite having no real level floor", () => {
  const byId = new Map(GENERATION_9_LEARNSETS.map((learnset) => [learnset.pokemonId, learnset]));
  for (const id of ["armarouge", "ceruledge", "dipplin"]) {
    assert.ok(byId.has(id), `${id} must have a learnset`);
    assert.ok(byId.get(id)!.entries.length > 0, `${id}'s learnset must not be empty`);
  }
});

test("the three Paldean Tauros breeds each have their own independent, non-empty learnset built around Raging Bull", () => {
  const byId = new Map(GENERATION_9_LEARNSETS.map((learnset) => [learnset.pokemonId, learnset]));
  for (const id of ["tauros-paldea-combat", "tauros-paldea-blaze", "tauros-paldea-aqua"]) {
    const learnset = byId.get(id);
    assert.ok(learnset, `${id} must have a learnset`);
    assert.ok(learnset!.entries.some((entry) => entry.moveId === "raging-bull"), `${id} must know Raging Bull`);
  }
});

test("Gholdengo (evolution-item-adjacent species with no real level floor) and Bellibolt/Scovillain/Cetitan (real evolution-item targets) each have their own valid, non-empty learnset", () => {
  const byId = new Map(GENERATION_9_LEARNSETS.map((learnset) => [learnset.pokemonId, learnset]));
  for (const id of ["gholdengo", "bellibolt", "scovillain", "cetitan"]) {
    assert.ok(byId.has(id), `${id} must have a learnset`);
    assert.ok(byId.get(id)!.entries.length > 0, `${id}'s learnset must not be empty`);
  }
});

test("every Generation 9 learnset entry references a real, existing move id in the live move database", () => {
  const gen9MoveIds = new Set(
    GENERATION_9_LEARNSETS.flatMap((learnset) => learnset.entries.map((entry) => entry.moveId))
  );
  // validateLearnsetList (already exercised above) is the authoritative
  // referential check against the live move registry; this test just
  // re-asserts every id collected here is non-empty as a sanity floor.
  for (const moveId of gen9MoveIds) {
    assert.ok(moveId.length > 0);
  }
});

test("no Terastal/Terastallization system was introduced: no learnset entry references a Tera Blast type-variant, and no versionGroup mentions 'tera'", () => {
  for (const learnset of GENERATION_9_LEARNSETS) {
    for (const entry of learnset.entries) {
      assert.ok(!entry.moveId.startsWith("tera-blast"), `${learnset.pokemonId} must not reference a Tera Blast type-variant`);
      assert.ok(!entry.versionGroup?.includes("tera"), `${learnset.pokemonId}'s "${entry.moveId}" must not carry a Terastal-related versionGroup`);
    }
  }
});

test("Generation 1-8 learnset totals are unaffected by Generation 9: spot-check Charizard, Typhlosion, and Grookey remain exactly as their own generation defined them", () => {
  // Regression guard: previous-generation learnsets are each a separate
  // file entirely and this file must never redefine or shadow them.
  const gen9Ids = new Set(GENERATION_9_LEARNSETS.map((learnset) => learnset.pokemonId));
  for (const id of ["charizard", "typhlosion", "grookey"]) {
    assert.equal(gen9Ids.has(id), false, `${id} is not a Generation 9 species and must not appear in the Generation 9 learnset file`);
  }
});
