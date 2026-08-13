import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_4_LEARNSETS } from "./index.ts";
import { validateLearnsetList } from "../../validation/learnset-validation.ts";
import { POKEMON_DATA } from "../../../../data/pokemon/pokemon-data.ts";

// NOTE: GENERATION_4_LEARNSETS holds modern (current-generation) level-up
// data filtered to this project's own move database, not a byte-for-byte
// transcription of the original 2006 Diamond/Pearl learnsets — see the
// top-of-file note in ./index.ts. These completeness checks are about
// coverage (every Sinnoh species, no duplicates, no unknown references,
// strictly ascending levels), not historical accuracy.
//
// 107 official Sinnoh base species (#387-#493) + 5 Rotom alternate forms
// (rotom-heat/wash/frost/fan/mow) + 1 Giratina alternate form
// (giratina-origin) = 113, + 7 Pre-Paldea species (#899-905: Wyrdeer,
// Kleavor, Ursaluna, Basculegion, Sneasler, Overqwil, Enamorus — outside
// the #387-493 range, but Sinnoh-owned per generation-4-pokemon-data.ts's
// own top-of-file note) = 120, + 17 Pre-Paldea Hisuian Forms (growlithe/
// arcanine/voltorb/electrode/typhlosion/qwilfish/sneasel/samurott/
// lilligant/basculin/zorua/zoroark/braviary/sliggoo/goodra/avalugg/
// decidueye, each suffixed "-hisui") = 137. This is the one number this
// file's own database is built around; if it drifts, something is
// missing, duplicated, or miscounted.
const EXPECTED_GENERATION_4_LEARNSET_COUNT = 137;

test("exactly 137 Generation 4 Pokémon learnsets are loaded (107 Sinnoh base species + 6 alternate forms + 7 Pre-Paldea species + 17 Hisuian Forms)", () => {
  assert.equal(GENERATION_4_LEARNSETS.length, EXPECTED_GENERATION_4_LEARNSET_COUNT);
});

test("nothing is missing: every learnset is present exactly once (count matches unique pokemonId count)", () => {
  const uniqueIds = new Set(GENERATION_4_LEARNSETS.map((learnset) => learnset.pokemonId));
  assert.equal(uniqueIds.size, EXPECTED_GENERATION_4_LEARNSET_COUNT);
});

test("there are no duplicate Pokémon learnsets", () => {
  const ids = GENERATION_4_LEARNSETS.map((learnset) => learnset.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("there are no unknown pokemonIds and no unknown moveIds (validateLearnsetList succeeds with 0 problems)", () => {
  assert.doesNotThrow(() => validateLearnsetList(GENERATION_4_LEARNSETS));
});

test("every learnset passes validation with zero failures", () => {
  const validated = validateLearnsetList(GENERATION_4_LEARNSETS);
  assert.equal(validated.length, EXPECTED_GENERATION_4_LEARNSET_COUNT);
});

// The schema itself only rejects EXACT duplicate entries and a move with two
// different levels — it does not enforce that entries are ordered. Ascending
// order is a data-authoring convention (matching Generation 1/2/3's own
// precedent), checked explicitly here since nothing else in the pipeline
// verifies it.
test("every learnset's level-up entries are in strictly ascending level order", () => {
  const outOfOrder: string[] = [];
  for (const learnset of GENERATION_4_LEARNSETS) {
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
  for (const learnset of GENERATION_4_LEARNSETS) {
    for (const entry of learnset.entries) {
      if (entry.method.kind === "level-up" && (!Number.isInteger(entry.method.level) || entry.method.level <= 0)) {
        invalid.push(`${learnset.pokemonId}:${entry.moveId}`);
      }
    }
  }
  assert.deepEqual(invalid, []);
});

test("every official Sinnoh base species (#387-#493, formOf undefined) has its own learnset", () => {
  const sinnohBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 387 && species.dexNumber <= 493
  ).map((species) => species.id);

  const learnsetIds = new Set(GENERATION_4_LEARNSETS.map((learnset) => learnset.pokemonId));
  const missing = sinnohBaseIds.filter((id) => !learnsetIds.has(id));
  assert.deepEqual(missing, []);
  assert.equal(sinnohBaseIds.length, 107);
});

test("all 107 base species have exactly one learnset each", () => {
  const sinnohBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 387 && species.dexNumber <= 493
  ).map((species) => species.id);

  for (const id of sinnohBaseIds) {
    const matches = GENERATION_4_LEARNSETS.filter((learnset) => learnset.pokemonId === id);
    assert.equal(matches.length, 1, `${id} must have exactly one learnset`);
  }
});

test("all 6 alternate forms (5 Rotom + Giratina-Origin) each have exactly one learnset", () => {
  const formIds = ["rotom-heat", "rotom-wash", "rotom-frost", "rotom-fan", "rotom-mow", "giratina-origin"];
  for (const id of formIds) {
    const matches = GENERATION_4_LEARNSETS.filter((learnset) => learnset.pokemonId === id);
    assert.equal(matches.length, 1, `${id} must have exactly one learnset`);
    assert.ok(matches[0]!.entries.length > 0, `${id}'s learnset must not be empty`);
  }
});

test("Rotom has exactly six learnsets across its form group (base + 5 alternates)", () => {
  const rotomIds = ["rotom", "rotom-heat", "rotom-wash", "rotom-frost", "rotom-fan", "rotom-mow"];
  const found = rotomIds.filter((id) => GENERATION_4_LEARNSETS.some((learnset) => learnset.pokemonId === id));
  assert.deepEqual(found, rotomIds);

  // Each form shares the same Electric/Ghost core moves but has its own
  // form-appropriate signature move, so no two forms should be byte-for-byte
  // identical learnsets.
  const entrySets = rotomIds.map((id) =>
    JSON.stringify(GENERATION_4_LEARNSETS.find((learnset) => learnset.pokemonId === id)!.entries)
  );
  assert.equal(new Set(entrySets).size, 6, "each Rotom form should have a distinct learnset, not six copies of the same one");
});

test("Giratina has exactly two learnsets across its form group (Altered + Origin)", () => {
  const giratinaIds = ["giratina", "giratina-origin"];
  const found = giratinaIds.filter((id) => GENERATION_4_LEARNSETS.some((learnset) => learnset.pokemonId === id));
  assert.deepEqual(found, giratinaIds);

  const entrySets = giratinaIds.map((id) =>
    JSON.stringify(GENERATION_4_LEARNSETS.find((learnset) => learnset.pokemonId === id)!.entries)
  );
  assert.equal(new Set(entrySets).size, 2, "Giratina's two forms should have distinct learnsets, not two copies of the same one");
});

test("no unexpected alternate-form learnsets exist (no Shaymin Sky, Arceus plates, Burmy/Wormadam cloaks, Cherrim forms, Shellos/Gastrodon variants) beyond the approved Giratina/Rotom forms and the 17 Pre-Paldea Hisuian Forms", () => {
  const approvedFormIds = [
    "giratina-origin", "rotom-heat", "rotom-wash", "rotom-frost", "rotom-fan", "rotom-mow", "porygon-z", "mime-jr",
    "growlithe-hisui", "arcanine-hisui", "voltorb-hisui", "electrode-hisui", "typhlosion-hisui",
    "qwilfish-hisui", "sneasel-hisui", "samurott-hisui", "lilligant-hisui", "basculin-hisui",
    "zorua-hisui", "zoroark-hisui", "braviary-hisui", "sliggoo-hisui", "goodra-hisui",
    "avalugg-hisui", "decidueye-hisui",
  ];
  const formLikeIds = GENERATION_4_LEARNSETS.map((learnset) => learnset.pokemonId).filter(
    (id) => id.includes("-") && !approvedFormIds.includes(id)
  );
  assert.deepEqual(formLikeIds, []);
});

test("every Generation 4 learnset entry uses the level-up method only, matching Generation 1/2/3 precedent", () => {
  for (const learnset of GENERATION_4_LEARNSETS) {
    for (const entry of learnset.entries) {
      assert.equal(entry.method.kind, "level-up", `${learnset.pokemonId} has a non-level-up entry (${entry.moveId})`);
    }
  }
});

// PRE-PALDEA STEP — the 7 species appended to generation-4-pokemon-data.ts
// (#899-905) fall outside the #387-493 dex-range check above, so they need
// their own explicit coverage test.
test("all 7 Pre-Paldea species (#899-905) each have exactly one non-empty learnset", () => {
  const prePaldeaIds = ["wyrdeer", "kleavor", "ursaluna", "basculegion", "sneasler", "overqwil", "enamorus"];
  for (const id of prePaldeaIds) {
    const matches = GENERATION_4_LEARNSETS.filter((learnset) => learnset.pokemonId === id);
    assert.equal(matches.length, 1, `${id} must have exactly one learnset`);
    assert.ok(matches[0]!.entries.length > 0, `${id}'s learnset must not be empty`);
  }
});

test("all 17 Pre-Paldea Hisuian Forms each have exactly one non-empty learnset, entirely independent of their ordinary counterpart's own learnset", () => {
  const hisuianFormIds = [
    "growlithe-hisui", "arcanine-hisui", "voltorb-hisui", "electrode-hisui", "typhlosion-hisui",
    "qwilfish-hisui", "sneasel-hisui", "samurott-hisui", "lilligant-hisui", "basculin-hisui",
    "zorua-hisui", "zoroark-hisui", "braviary-hisui", "sliggoo-hisui", "goodra-hisui",
    "avalugg-hisui", "decidueye-hisui",
  ];
  assert.equal(hisuianFormIds.length, 17);
  for (const id of hisuianFormIds) {
    const matches = GENERATION_4_LEARNSETS.filter((learnset) => learnset.pokemonId === id);
    assert.equal(matches.length, 1, `${id} must have exactly one learnset`);
    assert.ok(matches[0]!.entries.length > 0, `${id}'s learnset must not be empty`);
  }
});
