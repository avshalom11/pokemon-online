import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_8_LEARNSETS } from "./index.ts";
import { validateLearnsetList } from "../../validation/learnset-validation.ts";
import { POKEMON_DATA } from "../../../../data/pokemon/pokemon-data.ts";

// NOTE: GENERATION_8_LEARNSETS holds modern (current-generation) level-up
// data filtered to this project's own move database, not a byte-for-byte
// transcription of the original 2019/2020 Sword/Shield (incl. Isle of Armor
// and Crown Tundra) learnsets — see the top-of-file note in ./index.ts.
// These completeness checks are about coverage (every Galar species, no
// duplicates, no unknown references, strictly ascending levels), not
// historical accuracy.
//
// 89 official Galar base species (#810-898) + 19 Galarian Forms = 108. This
// is the one number this file's own database is built around; if it
// drifts, something is missing, duplicated, or miscounted.
const EXPECTED_GENERATION_8_LEARNSET_COUNT = 108;

test("exactly 108 Generation 8 Pokémon learnsets are loaded (89 Galar base species + 19 Galarian Forms)", () => {
  assert.equal(GENERATION_8_LEARNSETS.length, EXPECTED_GENERATION_8_LEARNSET_COUNT);
});

test("nothing is missing: every learnset is present exactly once (count matches unique pokemonId count)", () => {
  const uniqueIds = new Set(GENERATION_8_LEARNSETS.map((learnset) => learnset.pokemonId));
  assert.equal(uniqueIds.size, EXPECTED_GENERATION_8_LEARNSET_COUNT);
});

test("there are no duplicate Pokémon learnsets", () => {
  const ids = GENERATION_8_LEARNSETS.map((learnset) => learnset.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("there are no unknown pokemonIds and no unknown moveIds (validateLearnsetList succeeds with 0 problems)", () => {
  assert.doesNotThrow(() => validateLearnsetList(GENERATION_8_LEARNSETS));
});

test("every learnset passes validation with zero failures", () => {
  const validated = validateLearnsetList(GENERATION_8_LEARNSETS);
  assert.equal(validated.length, EXPECTED_GENERATION_8_LEARNSET_COUNT);
});

// The schema itself only rejects EXACT duplicate entries and a move with two
// different levels — it does not enforce that entries are ordered. Ascending
// order is a data-authoring convention (matching every prior generation's
// own precedent), checked explicitly here since nothing else in the
// pipeline verifies it.
test("every learnset's level-up entries are in strictly ascending level order", () => {
  const outOfOrder: string[] = [];
  for (const learnset of GENERATION_8_LEARNSETS) {
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
  for (const learnset of GENERATION_8_LEARNSETS) {
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
  for (const learnset of GENERATION_8_LEARNSETS) {
    for (const entry of learnset.entries) {
      if (entry.method.kind !== "level-up") {
        nonLevelUp.push(`${learnset.pokemonId}: ${entry.moveId} (${entry.method.kind})`);
      }
    }
  }
  assert.deepEqual(nonLevelUp, []);
});

test("every official Galar base species (#810-898, formOf undefined) has its own learnset", () => {
  const galarBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 810 && species.dexNumber <= 898
  ).map((species) => species.id);

  const learnsetIds = new Set(GENERATION_8_LEARNSETS.map((learnset) => learnset.pokemonId));
  const missing = galarBaseIds.filter((id) => !learnsetIds.has(id));
  assert.deepEqual(missing, []);
  assert.equal(galarBaseIds.length, 89);
});

test("all 89 base species have exactly one learnset each", () => {
  const galarBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 810 && species.dexNumber <= 898
  ).map((species) => species.id);

  for (const id of galarBaseIds) {
    const matches = GENERATION_8_LEARNSETS.filter((learnset) => learnset.pokemonId === id);
    assert.equal(matches.length, 1, `${id} must have exactly one learnset`);
  }
});

// The 19 Galarian Forms, identified by formLabel === "Galarian Form"
// specifically (never a dexNumber-range heuristic — see Galar Phase 1/2's
// own "Kanto/Unova dexNumber range no longer uniquely identifies a form"
// bugfix precedent in pokemon-data.test.ts / generation-7.completeness.test.ts).
const APPROVED_GALARIAN_FORM_IDS = POKEMON_DATA.filter((species) => species.formLabel === "Galarian Form").map(
  (species) => species.id
);

test("test assumption: exactly 19 approved Galarian Forms exist in the live catalog", () => {
  assert.equal(APPROVED_GALARIAN_FORM_IDS.length, 19);
});

test("every one of the 19 Galarian Forms has exactly one explicit, non-empty learnset — never runtime inheritance from its ordinary counterpart", () => {
  assert.equal(APPROVED_GALARIAN_FORM_IDS.length, 19);

  for (const id of APPROVED_GALARIAN_FORM_IDS) {
    const matches = GENERATION_8_LEARNSETS.filter((learnset) => learnset.pokemonId === id);
    assert.equal(matches.length, 1, `${id} must have exactly one learnset`);
    assert.ok(matches[0]!.entries.length > 0, `${id}'s learnset must not be empty`);
  }
});

test("no unexpected alternate-form learnsets exist beyond the 19 approved Galarian Forms (no Toxtricity Low Key, Alcremie decorative forms, Morpeko Hangry Mode, Eiscue Noice Face, Zacian/Zamazenta Crowned, Eternamax, Urshifu Rapid Strike, Calyrex rider/fusion forms, Darmanitan Zen forms, or Gigantamax forms)", () => {
  const learnsetIds = new Set(GENERATION_8_LEARNSETS.map((learnset) => learnset.pokemonId));
  const catalogFormIds = new Set(POKEMON_DATA.filter((species) => species.formOf !== undefined).map((species) => species.id));

  const formLearnsetIds = [...learnsetIds].filter((id) => catalogFormIds.has(id));
  const galarFormLearnsetIds = formLearnsetIds.filter((id) => id.endsWith("-galar"));
  assert.deepEqual([...galarFormLearnsetIds].sort(), [...APPROVED_GALARIAN_FORM_IDS].sort());
});

test("every Generation 8 learnset entry uses the level-up method only, matching every prior generation's own precedent", () => {
  for (const learnset of GENERATION_8_LEARNSETS) {
    for (const entry of learnset.entries) {
      assert.equal(entry.method.kind, "level-up", `${learnset.pokemonId} has a non-level-up entry (${entry.moveId})`);
    }
  }
});

test("every Generation 8 learnset is keyed by generation 8", () => {
  assert.ok(GENERATION_8_LEARNSETS.every((learnset) => learnset.generation === 8));
});

// Galar Phase 2 added six genuinely new evolution relationships originating
// from a Galarian Form into a brand-new Generation 8 base species — each of
// those six evolved-target learnsets must repeat its OWN Galarian-Form
// pre-evolution's moves at level 1 (this file's own top-of-file "evolved
// stage repeats pre-evolution's moves" convention), never the ordinary
// (non-Galarian) counterpart's moves — since the ordinary species never
// gains these evolutions (Galar Phase 2's own explicit scope).
test("the six Galarian-Form-originated evolutions (Meowth-Galar/Corsola-Galar/Farfetch'd-Galar/Mr. Mime-Galar/Linoone-Galar/Yamask-Galar) each repeat their own Galarian-Form pre-evolution's moves, never the ordinary counterpart's", () => {
  const byId = new Map(GENERATION_8_LEARNSETS.map((learnset) => [learnset.pokemonId, learnset]));
  const pairs: [string, string][] = [
    ["meowth-galar", "perrserker"],
    ["corsola-galar", "cursola"],
    ["farfetchd-galar", "sirfetchd"],
    ["mr-mime-galar", "mr-rime"],
    ["linoone-galar", "obstagoon"],
    ["yamask-galar", "runerigus"],
  ];

  for (const [preEvolutionId, evolvedId] of pairs) {
    const preEvolution = byId.get(preEvolutionId)!;
    const evolved = byId.get(evolvedId)!;
    const preEvolutionMoveIds = new Set(preEvolution.entries.map((entry) => entry.moveId));
    const evolvedLevel1MoveIds = new Set(
      evolved.entries.filter((entry) => entry.method.kind === "level-up" && entry.method.level === 1).map((entry) => entry.moveId)
    );

    for (const moveId of preEvolutionMoveIds) {
      assert.ok(evolvedLevel1MoveIds.has(moveId), `${evolvedId} must know ${preEvolutionId}'s "${moveId}" at level 1`);
    }
  }
});

test("ordinary (non-Galarian) forms never accidentally receive a Galar-only evolved-form's learnset moveset: ordinary Meowth/Corsola/Farfetch'd/Mr. Mime/Linoone/Yamask learnsets are untouched by this phase", () => {
  const ordinaryIds = ["meowth", "corsola", "farfetchd", "mr-mime", "linoone", "yamask"];
  const gen8Ids = new Set(GENERATION_8_LEARNSETS.map((learnset) => learnset.pokemonId));
  for (const id of ordinaryIds) {
    assert.equal(gen8Ids.has(id), false, `${id} must not gain a Generation 8 learnset — it never receives a Galar-only evolution`);
  }
});

test("Applin, Flapple, and Appletun (the branch-evolution family) each have their own independent, non-empty learnset", () => {
  const byId = new Map(GENERATION_8_LEARNSETS.map((learnset) => [learnset.pokemonId, learnset]));
  for (const id of ["applin", "flapple", "appletun"]) {
    assert.ok(byId.has(id), `${id} must have a learnset`);
    assert.ok(byId.get(id)!.entries.length > 0, `${id}'s learnset must not be empty`);
  }
});

test("Galarian Slowpoke's evolution-item targets (Galarian Slowbro/Slowking) and Galarian Darumaka's evolution-item target (Galarian Darmanitan) each have their own valid, non-empty learnset despite having no real level floor", () => {
  const byId = new Map(GENERATION_8_LEARNSETS.map((learnset) => [learnset.pokemonId, learnset]));
  for (const id of ["slowbro-galar", "slowking-galar", "darmanitan-galar"]) {
    assert.ok(byId.has(id), `${id} must have a learnset`);
    assert.ok(byId.get(id)!.entries.length > 0, `${id}'s learnset must not be empty`);
  }
});

test("Meltan/Melmetal (Generation 7) and Type: Null/Silvally (Generation 7) learnsets are unaffected by Generation 8", () => {
  // Regression guard: previous-generation learnsets are a separate file
  // entirely (engine/learnsets/data/generation-7/index.ts) and this file
  // must never redefine or shadow them.
  const gen8Ids = new Set(GENERATION_8_LEARNSETS.map((learnset) => learnset.pokemonId));
  for (const id of ["meltan", "melmetal", "type-null", "silvally"]) {
    assert.equal(gen8Ids.has(id), false, `${id} is a Generation 7 species and must not appear in the Generation 8 learnset file`);
  }
});
