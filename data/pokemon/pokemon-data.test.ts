import assert from "node:assert/strict";
import { test } from "node:test";

import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import type { PokemonRarity, PokemonSpecies } from "@/shared/types/pokemon";

// Generation 1 (Kanto, #0001-#0151) + Generation 2 (Johto, #0152-#0251) +
// Generation 3 (Hoenn, #0252-#0386) + Generation 4 (Sinnoh, #0387-#0493) —
// 493 official National Dex entries (one base/headline species row per dex
// number). Victini (#494) is NOT part of Sinnoh and is intentionally not
// present. See engine/learnsets/data/generation-1/generation-1.
// completeness.test.ts for the same invariant applied to the (still
// Generation-1-only) learnset database.
//
// PLUS alternate FORM rows that intentionally share their base's dex
// number rather than getting their own (see features/pokemon/forms/
// pokemon-forms.ts's own doc comment): 3 Deoxys forms (dex #386), 5 Rotom
// forms (dex #479: Heat/Wash/Frost/Fan/Mow), and 1 Giratina form (dex
// #487: Origin). That makes two different, both-correct counts:
//   - EXPECTED_BASE_DEX_COUNT (493): distinct dex numbers / Pokédex rows —
//     what "dex numbers cover 1..N with no gaps" and the Pokédex service's
//     own row count are checked against.
//   - EXPECTED_TOTAL_SPECIES_COUNT (502): every PokemonSpecies row in
//     POKEMON_DATA, including all 9 alternate forms — what "every id is
//     present exactly once" is checked against.
const EXPECTED_BASE_DEX_COUNT = 493;
const EXPECTED_TOTAL_SPECIES_COUNT = 502;

const VALID_RARITIES: PokemonRarity[] = ["common", "rare", "very-rare", "legendary"];

// Rarity classification as assigned by design decision (2026-07-29,
// extended 2026-08-04 for Generation 2, extended 2026-08-05 for Generation
// 3/Hoenn, extended 2026-08-05 for Generation 4/Sinnoh, revised again for
// the Sinnoh Rarity Audit approved-design-change pass): every species keyed
// by dexNumber -> its intended rarity tier, so a test failure points at
// exactly which Pokémon regressed rather than just a wrong total. Includes
// the 3 Deoxys forms (all "legendary"), the 1 Giratina-Origin form
// ("legendary", matching base Giratina), and — as of the Rarity Audit
// change — base Rotom and all 5 Rotom alternate forms are now "legendary"
// (moved from "rare"), and Porygon-Z/Magmortar/Electivire/Rhyperior/
// Magnezone are now "very-rare" (also moved from "rare"); see
// generation-4-pokemon-data.ts's own per-species rarity fields for the
// single source of truth.
const EXPECTED_RARITY_COUNTS: Record<PokemonRarity, number> = {
  common: 205,
  rare: 190,
  "very-rare": 62,
  legendary: 45,
};

test("exactly 502 Pokémon species rows are loaded (493 base Dex entries + 9 alternate forms)", () => {
  assert.equal(POKEMON_DATA.length, EXPECTED_TOTAL_SPECIES_COUNT);
});

test("nothing is missing: every species id is present exactly once", () => {
  const uniqueIds = new Set(POKEMON_DATA.map((species) => species.id));
  assert.equal(uniqueIds.size, EXPECTED_TOTAL_SPECIES_COUNT);
});

// A dex number may legitimately repeat across species that are alternate
// FORMS of the same Pokémon (see features/pokemon/forms's own module doc
// comment) — but only in a specific shape: every species sharing a
// dexNumber with another must have `formOf` pointing at exactly one other
// species in that same group (the base/headline form), and that one base
// species must be the only member of the group WITHOUT formOf. No species
// uses `formOf` yet (Hoenn/Deoxys hasn't been added), so this resolves to
// "every dex number appears exactly once" today — the same invariant the
// old flat "no dex number is duplicated" test asserted — just expressed so
// a future Forms addition doesn't require rewriting this test again.
test("every dex number that repeats belongs to a valid Forms group (exactly one base form + N formOf siblings pointing at it)", () => {
  const speciesByDexNumber = new Map<number, PokemonSpecies[]>();
  for (const species of POKEMON_DATA) {
    const group = speciesByDexNumber.get(species.dexNumber) ?? [];
    group.push(species);
    speciesByDexNumber.set(species.dexNumber, group);
  }

  for (const [dexNumber, group] of speciesByDexNumber) {
    if (group.length === 1) continue;

    const baseForms = group.filter((species) => species.formOf === undefined);
    assert.equal(baseForms.length, 1, `dex #${dexNumber} has ${group.length} entries but not exactly one base form`);

    const baseId = baseForms[0]!.id;
    for (const species of group) {
      if (species.id === baseId) continue;
      assert.equal(species.formOf, baseId, `${species.id} shares dex #${dexNumber} with base "${baseId}" but its formOf doesn't point at it`);
    }
  }
});

test("every formOf reference resolves to a real species sharing the exact same dexNumber", () => {
  const speciesById = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const species of POKEMON_DATA) {
    if (species.formOf === undefined) continue;

    const base = speciesById.get(species.formOf);
    assert.ok(base, `${species.id}'s formOf "${species.formOf}" does not resolve to a real species`);
    assert.equal(
      species.dexNumber,
      base!.dexNumber,
      `${species.id} (dex #${species.dexNumber}) and its base form "${species.formOf}" (dex #${base!.dexNumber}) must share the same dexNumber`
    );
  }
});

// Forms may never chain — a formOf target must itself be a true base (no
// formOf of its own). features/pokemon/forms/pokemon-forms.ts has no
// concept of a form-of-a-form (getFormEntries only ever looks one hop up),
// so this keeps that assumption true at the data level rather than only by
// convention/documentation.
test("no alternate form points at another alternate form (every formOf target is itself a true base)", () => {
  const speciesById = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const species of POKEMON_DATA) {
    if (species.formOf === undefined) continue;

    const base = speciesById.get(species.formOf)!;
    assert.equal(
      base.formOf,
      undefined,
      `${species.id}'s formOf "${species.formOf}" is itself an alternate form — forms may not chain`
    );
  }
});

test("dex numbers, deduped by base form, cover exactly 1 through 493 with no gaps", () => {
  const dexNumbers = POKEMON_DATA.filter((species) => species.formOf === undefined)
    .map((species) => species.dexNumber)
    .sort((a, b) => a - b);
  const expected = Array.from({ length: EXPECTED_BASE_DEX_COUNT }, (_, i) => i + 1);
  assert.deepEqual(dexNumbers, expected);
});

test("no species uses dexNumber 494 or higher (Sinnoh stops at Arceus, #493 — Victini is not part of Sinnoh)", () => {
  const maxDexNumber = Math.max(...POKEMON_DATA.map((species) => species.dexNumber));
  assert.equal(maxDexNumber, 493);
});

test("Victini (#494) is not present in the catalog", () => {
  const victini = POKEMON_DATA.find((species) => species.id === "victini" || species.dexNumber === 494);
  assert.equal(victini, undefined, "Victini is not part of Sinnoh Phase 1 and must not be added");
});

test("no species uses the temporary Deoxys-form sprite filenames (669/670/671) as a dexNumber", () => {
  const forbidden = [669, 670, 671];
  for (const species of POKEMON_DATA) {
    assert.ok(
      !forbidden.includes(species.dexNumber),
      `${species.id} must never use ${species.dexNumber} as dexNumber — that was only ever a temporary sprite filename`
    );
  }
});

test("exactly 135 official Hoenn base species exist for #252-386", () => {
  const hoennBase = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 252 && species.dexNumber <= 386
  );
  assert.equal(hoennBase.length, 135);
});

test("exactly 107 official Sinnoh base species exist for #387-493", () => {
  const sinnohBase = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 387 && species.dexNumber <= 493
  );
  assert.equal(sinnohBase.length, 107);
});

test("Deoxys has exactly four internal form entries, all sharing dexNumber 386", () => {
  const deoxysGroup = POKEMON_DATA.filter((species) => species.id === "deoxys" || species.formOf === "deoxys");

  assert.deepEqual(
    deoxysGroup.map((species) => species.id).sort(),
    ["deoxys", "deoxys-attack", "deoxys-defense", "deoxys-speed"]
  );
  for (const species of deoxysGroup) {
    assert.equal(species.dexNumber, 386, `${species.id} must share dexNumber 386`);
    assert.equal(species.rarity, "legendary", `${species.id} must be rarity "legendary"`);
  }
});

test("Deoxys form sprite ids resolve to the real on-disk sprite filenames (0386/0386A/0386D/0386S)", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.equal(byId.get("deoxys")!.spriteId, undefined, "deoxys (Normal Form) has no override — resolves via dexNumber to 0386");
  assert.equal(byId.get("deoxys-attack")!.spriteId, "0386A");
  assert.equal(byId.get("deoxys-defense")!.spriteId, "0386D");
  assert.equal(byId.get("deoxys-speed")!.spriteId, "0386S");
});

test("Castform has no alternate-form entries yet (no form-specific sprite assets exist on disk)", () => {
  const castformGroup = POKEMON_DATA.filter((species) => species.id === "castform" || species.formOf === "castform");
  assert.deepEqual(castformGroup.map((species) => species.id), ["castform"]);
});

test("Rotom has exactly six internal form entries (base + 5 alternates), all sharing dexNumber 479", () => {
  const rotomGroup = POKEMON_DATA.filter((species) => species.id === "rotom" || species.formOf === "rotom");

  assert.deepEqual(
    rotomGroup.map((species) => species.id).sort(),
    ["rotom", "rotom-fan", "rotom-frost", "rotom-heat", "rotom-mow", "rotom-wash"]
  );
  for (const species of rotomGroup) {
    assert.equal(species.dexNumber, 479, `${species.id} must share dexNumber 479`);
    // Sinnoh Rarity Audit approved-design-change: Rotom (and all five
    // alternate forms) moved from "rare" to "legendary".
    assert.equal(species.rarity, "legendary", `${species.id} must be rarity "legendary"`);
  }
});

test("Rotom form sprite ids resolve to the real on-disk sprite filenames (0479/0479H/0479W/0479F/0479N/0479M)", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.equal(byId.get("rotom")!.spriteId, undefined, "rotom (base form) has no override — resolves via dexNumber to 0479");
  assert.equal(byId.get("rotom-heat")!.spriteId, "0479H");
  assert.equal(byId.get("rotom-wash")!.spriteId, "0479W");
  assert.equal(byId.get("rotom-frost")!.spriteId, "0479F");
  assert.equal(byId.get("rotom-fan")!.spriteId, "0479N");
  assert.equal(byId.get("rotom-mow")!.spriteId, "0479M");
});

test("Giratina has exactly two internal form entries (Altered + Origin), both sharing dexNumber 487", () => {
  const giratinaGroup = POKEMON_DATA.filter((species) => species.id === "giratina" || species.formOf === "giratina");

  assert.deepEqual(
    giratinaGroup.map((species) => species.id).sort(),
    ["giratina", "giratina-origin"]
  );
  for (const species of giratinaGroup) {
    assert.equal(species.dexNumber, 487, `${species.id} must share dexNumber 487`);
    assert.equal(species.rarity, "legendary", `${species.id} must be rarity "legendary"`);
  }
});

test("Giratina form sprite ids resolve to the real on-disk sprite filenames (0487/0487O)", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.equal(byId.get("giratina")!.spriteId, undefined, "giratina (Altered Form) has no override — resolves via dexNumber to 0487");
  assert.equal(byId.get("giratina-origin")!.spriteId, "0487O");
});

test("no unexpected alternate forms exist beyond Deoxys, Rotom, and Giratina (Shaymin/Arceus/Burmy-Wormadam/Shellos-Gastrodon stay single-entry)", () => {
  const formGroupBases = new Set(
    POKEMON_DATA.filter((species) => species.formOf !== undefined).map((species) => species.formOf)
  );
  assert.deepEqual([...formGroupBases].sort(), ["deoxys", "giratina", "rotom"]);
});

test("no Hoenn starter-line species (Treecko/Torchic/Mudkip lines) is marked isStarter", () => {
  const hoennStarterLineIds = [
    "treecko", "grovyle", "sceptile",
    "torchic", "combusken", "blaziken",
    "mudkip", "marshtomp", "swampert",
  ];
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const id of hoennStarterLineIds) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to exist in the catalog`);
    assert.notEqual(species!.isStarter, true, `${id} must not be an onboarding starter`);
  }
});

test("no Sinnoh starter-line species (Turtwig/Chimchar/Piplup lines) is marked isStarter", () => {
  const sinnohStarterLineIds = [
    "turtwig", "grotle", "torterra",
    "chimchar", "monferno", "infernape",
    "piplup", "prinplup", "empoleon",
  ];
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const id of sinnohStarterLineIds) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to exist in the catalog`);
    assert.notEqual(species!.isStarter, true, `${id} must not be an onboarding starter`);
  }
});

test("onboarding starters remain exactly Bulbasaur/Charmander/Squirtle", () => {
  const starterIds = POKEMON_DATA.filter((species) => species.isStarter)
    .map((species) => species.id)
    .sort();
  assert.deepEqual(starterIds, ["bulbasaur", "charmander", "squirtle"]);
});

test("every species has one valid rarity value", () => {
  for (const species of POKEMON_DATA) {
    assert.ok(
      VALID_RARITIES.includes(species.rarity),
      `${species.id} has invalid rarity "${species.rarity}"`
    );
  }
});

test("rarity tier counts match the assigned classification exactly", () => {
  const actualCounts: Record<PokemonRarity, number> = {
    common: 0,
    rare: 0,
    "very-rare": 0,
    legendary: 0,
  };
  for (const species of POKEMON_DATA) {
    actualCounts[species.rarity] += 1;
  }
  assert.deepEqual(actualCounts, EXPECTED_RARITY_COUNTS);
});
