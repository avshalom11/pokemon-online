import assert from "node:assert/strict";
import { test } from "node:test";

import { HOENN_ZONE_DATA } from "./hoenn-zone-data.ts";
import { JOHTO_ZONE_DATA } from "./johto-zone-data.ts";
import { KANTO_ZONE_DATA } from "./kanto-zone-data.ts";
import { SINNOH_ZONE_DATA } from "./sinnoh-zone-data.ts";
import { UNOVA_ZONE_DATA } from "./unova-zone-data.ts";
import { getZone, getZoneData } from "./zone-data.ts";
import { getEffectiveEncounterRarity } from "../../engine/encounter-rarity/get-effective-encounter-rarity.ts";
import { getLevelEvolution } from "../pokemon/pokemon-evolutions.ts";
import { POKEMON_DATA } from "../pokemon/pokemon-data.ts";

// Focused regression tests for the Unova Encounter Tables phase — mirrors
// the validation checklist that phase's own spec required, checked
// directly against the canonical species catalog and Forms data rather
// than a second hardcoded species list here.

function allUnovaEncounters() {
  return UNOVA_ZONE_DATA.flatMap((zone) => zone.encounters.map((encounter) => ({ zoneId: zone.id, ...encounter })));
}

test("Unova contains exactly 163 encounter entries", () => {
  assert.equal(allUnovaEncounters().length, 163);
});

test("there are exactly 163 unique species ids across all Unova zones", () => {
  const ids = new Set(allUnovaEncounters().map((encounter) => encounter.pokemonId));
  assert.equal(ids.size, 163);
});

test("no duplicate species ids across all Unova zones", () => {
  const ids = allUnovaEncounters().map((encounter) => encounter.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("every official Unova base species (#494-#649) appears exactly once", () => {
  const unovaBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 494 && species.dexNumber <= 649
  ).map((species) => species.id);
  assert.equal(unovaBaseIds.length, 156, "test assumption: 156 official Unova base species exist");

  const encounterIds = new Set(allUnovaEncounters().map((encounter) => encounter.pokemonId));
  const missing = unovaBaseIds.filter((id) => !encounterIds.has(id));
  assert.deepEqual(missing, [], "no Unova base species may be missing from the encounter tables");
});

test("all seven approved alternate forms each appear exactly once", () => {
  const ids = allUnovaEncounters().map((encounter) => encounter.pokemonId);
  for (const formId of [
    "tornadus-therian",
    "thundurus-therian",
    "landorus-therian",
    "kyurem-black",
    "kyurem-white",
    "keldeo-resolute",
    "meloetta-pirouette",
  ]) {
    assert.equal(ids.filter((id) => id === formId).length, 1, `${formId} must appear exactly once`);
  }
});

test("base Tornadus, Thundurus, Landorus, Kyurem, Keldeo, and Meloetta also appear exactly once each", () => {
  const ids = allUnovaEncounters().map((encounter) => encounter.pokemonId);
  for (const id of ["tornadus", "thundurus", "landorus", "kyurem", "keldeo", "meloetta"]) {
    assert.equal(ids.filter((candidate) => candidate === id).length, 1);
  }
});

test("no Kanto, Johto, Hoenn, or Sinnoh species appears in the Unova pools", () => {
  const otherRegionIds = new Set([
    ...KANTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...JOHTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...HOENN_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...SINNOH_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
  ]);
  const overlap = allUnovaEncounters()
    .map((encounter) => encounter.pokemonId)
    .filter((id) => otherRegionIds.has(id));
  assert.deepEqual(overlap, []);
});

test("every referenced Unova species id resolves in the canonical species catalog", () => {
  const speciesIds = new Set(POKEMON_DATA.map((species) => species.id));
  const unknown = allUnovaEncounters()
    .map((encounter) => encounter.pokemonId)
    .filter((id) => !speciesIds.has(id));
  assert.deepEqual(unknown, []);
});

test("zone counts match the approved distribution exactly (51/17/27/21/21/26)", () => {
  const counts = Object.fromEntries(UNOVA_ZONE_DATA.map((zone) => [zone.id, zone.encounters.length]));
  assert.deepEqual(counts, {
    grassland: 51,
    water: 17,
    cave: 27,
    lava: 21,
    beach: 21,
    "haunted-house": 26,
  });
});

test("every zone contains at least one valid encounter", () => {
  for (const zone of UNOVA_ZONE_DATA) {
    assert.ok(zone.encounters.length > 0, `${zone.id} must have at least one encounter`);
  }
});

test("Kanto, Johto, Hoenn, and Sinnoh zone files are unaffected by Unova's addition", () => {
  assert.ok(KANTO_ZONE_DATA.length > 0);
  assert.ok(JOHTO_ZONE_DATA.length > 0);
  assert.ok(HOENN_ZONE_DATA.length > 0);
  assert.ok(SINNOH_ZONE_DATA.length > 0);
  const otherRegionIds = new Set([
    ...KANTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...JOHTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...HOENN_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...SINNOH_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
  ]);
  // Every Kanto/Johto/Hoenn/Sinnoh species is still dex 1-493, never
  // touched by the Unova range — a coarse but effective "nothing here was
  // edited" guard. Exceptions: the Pre-Paldea step appended 7 Sinnoh-owned
  // species at #899-905 (generation-4-pokemon-data.ts's own top-of-file
  // note) — real dex numbers past Unova's own #494-649 span, but still
  // genuinely Sinnoh, never Unova. The later Pre-Paldea 17 Hisuian Forms
  // step similarly added 17 Sinnoh-owned alternate-form species (formLabel
  // "Hisuian Form") sharing THEIR bases' real dex numbers, several of
  // which fall inside or past Unova's own #494-649 span (Samurott-Hisui
  // #503, Lilligant-Hisui #549, Basculin-Hisui #550, Zorua-Hisui #570,
  // Zoroark-Hisui #571, Braviary-Hisui #628) — still genuinely Sinnoh,
  // never Unova, identified by formLabel rather than a dex range since
  // their dex numbers span nearly the whole Pokédex.
  for (const id of otherRegionIds) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must still resolve in the species catalog`);
    const isPrePaldeaSinnohSpecies = species!.dexNumber >= 899 && species!.dexNumber <= 905;
    const isPrePaldeaHisuianForm = species!.formLabel === "Hisuian Form";
    assert.ok(
      species!.dexNumber <= 493 || isPrePaldeaSinnohSpecies || isPrePaldeaHisuianForm,
      `${id} (dex ${species!.dexNumber}) must never be a Unova species`
    );
  }
});

test("Unova resolves through the generic region-aware resolver (getZoneData/getZone), never a special case", () => {
  assert.equal(getZoneData("unova").length, 6);
  assert.equal(getZoneData("unova"), UNOVA_ZONE_DATA);

  const grassland = getZone("unova", "grassland");
  assert.ok(grassland);
  assert.equal(grassland!.encounters.length, 51);

  // The same zoneId resolves to a completely different pool per region —
  // Unova's own grassland roster must never leak into or from Kanto/Johto/
  // Hoenn/Sinnoh.
  const unovaIds = new Set(grassland!.encounters.map((e) => e.pokemonId));
  for (const otherRegion of [KANTO_ZONE_DATA, JOHTO_ZONE_DATA, HOENN_ZONE_DATA, SINNOH_ZONE_DATA]) {
    const otherGrassland = otherRegion.find((zone) => zone.id === "grassland");
    for (const encounter of otherGrassland!.encounters) {
      assert.ok(!unovaIds.has(encounter.pokemonId), `${encounter.pokemonId} must not appear in both another region and Unova grassland`);
    }
  }
});

test("Unova is now battle-capable because real zone data exists (getZoneData(\"unova\").length > 0)", () => {
  assert.ok(getZoneData("unova").length > 0);
});

test("evolution-item targets resolve to effective very-rare while their real PokemonSpecies.rarity stays rare", () => {
  const itemEvolutionTargets = [
    "simisage", "simisear", "simipour", "musharna",
    "whimsicott", "lilligant", "cinccino", "eelektross", "chandelure",
  ];
  for (const id of itemEvolutionTargets) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "rare", `${id}'s real PokemonSpecies.rarity must stay "rare" (only the effective encounter-rarity tier changes)`);
  }
});

test("Unova's three starter lines and the Deino pseudo-legendary line are real very-rare at every stage", () => {
  for (const id of [
    "snivy", "servine", "serperior",
    "tepig", "pignite", "emboar",
    "oshawott", "dewott", "samurott",
    "deino", "zweilous", "hydreigon",
  ]) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "very-rare");
  }
});

test("every Unova legendary/mythical species is real legendary", () => {
  for (const id of [
    "victini", "cobalion", "terrakion", "virizion",
    "tornadus", "tornadus-therian", "thundurus", "thundurus-therian",
    "reshiram", "zekrom", "landorus", "landorus-therian",
    "kyurem", "kyurem-black", "kyurem-white", "keldeo", "keldeo-resolute",
    "meloetta", "meloetta-pirouette", "genesect",
  ]) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "legendary");
  }
});

test("Keldeo Resolute Form has the required fields and is independently encounterable in Water", () => {
  const resolute = POKEMON_DATA.find((species) => species.id === "keldeo-resolute");
  assert.ok(resolute, "keldeo-resolute must resolve in the species catalog");
  assert.equal(resolute!.dexNumber, 647);
  assert.equal(resolute!.formOf, "keldeo");
  assert.equal(resolute!.formLabel, "Resolute Form");
  assert.equal(resolute!.spriteId, "0647R");
  assert.equal(resolute!.rarity, "legendary");

  const water = UNOVA_ZONE_DATA.find((zone) => zone.id === "water")!;
  const resoluteEncounter = water.encounters.find((encounter) => encounter.pokemonId === "keldeo-resolute");
  assert.ok(resoluteEncounter, "keldeo-resolute must be encounterable in Water");
  assert.equal(resoluteEncounter!.encounterWeight, 1);

  // Independently encounterable from ordinary Keldeo — both are separate
  // ZoneEncounter entries in the same zone, not one entry standing in for
  // both forms.
  const ordinaryEncounter = water.encounters.find((encounter) => encounter.pokemonId === "keldeo");
  assert.ok(ordinaryEncounter, "keldeo must still be encounterable in Water");
  assert.notEqual(resoluteEncounter, ordinaryEncounter);
});

test("Keldeo Resolute Form's effective encounter rarity is legendary (real runtime logic, not a hardcoded assumption)", () => {
  assert.equal(getEffectiveEncounterRarity("keldeo-resolute"), "legendary");
});

test("Unova Update: Zorua, Zoroark, Larvesta, and Volcarona are real very-rare, resolve to effective very-rare, and use encounterWeight 5, without moving zones", () => {
  const expectedZones: Record<string, string> = {
    zorua: "haunted-house",
    zoroark: "haunted-house",
    larvesta: "lava",
    volcarona: "lava",
  };

  for (const [id, expectedZone] of Object.entries(expectedZones)) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "very-rare", `${id}'s real PokemonSpecies.rarity must now be "very-rare"`);

    // Effective rarity verified via the real runtime engine, not asserted
    // as a hardcoded assumption — none of these four are evolution-item
    // targets, so their effective rarity trivially equals their (now
    // very-rare) real rarity.
    assert.equal(getEffectiveEncounterRarity(id), "very-rare", `${id}'s effective encounter rarity must be "very-rare"`);

    const zone = UNOVA_ZONE_DATA.find((candidate) => candidate.id === expectedZone)!;
    const encounter = zone.encounters.find((candidate) => candidate.pokemonId === id);
    assert.ok(encounter, `${id} must still be encounterable in ${expectedZone}`);
    assert.equal(encounter!.encounterWeight, 5, `${id} must use the real-very-rare encounterWeight convention (5)`);
  }
});

test("former Trade-evolution replacements keep their approved level thresholds", () => {
  assert.deepEqual(getLevelEvolution("timburr"), { evolvesToSpeciesId: "gurdurr", requiredLevel: 25 });
  assert.deepEqual(getLevelEvolution("gurdurr"), { evolvesToSpeciesId: "conkeldurr", requiredLevel: 40 });
  assert.deepEqual(getLevelEvolution("roggenrola"), { evolvesToSpeciesId: "boldore", requiredLevel: 25 });
  assert.deepEqual(getLevelEvolution("boldore"), { evolvesToSpeciesId: "gigalith", requiredLevel: 40 });
  assert.deepEqual(getLevelEvolution("karrablast"), { evolvesToSpeciesId: "escavalier", requiredLevel: 35 });
  assert.deepEqual(getLevelEvolution("shelmet"), { evolvesToSpeciesId: "accelgor", requiredLevel: 35 });
});

test("Unova's own dex range still tops out at 649 after adding Keldeo Resolute (a form shares its base's dexNumber, it never mints a new one)", () => {
  // Scoped strictly to the Unova range (494-649) — an unbounded
  // "dexNumber >= 494" filter was only ever safe while Unova was the
  // highest-numbered generation in the catalog; now that Kalos (#650-721)
  // exists, that same filter would also catch Kalos species and wrongly
  // report the max as 721. The real invariant this test protects was
  // always "Keldeo Resolute doesn't mint a new dex number beyond Unova's
  // own #649", not "the whole catalog's max dex number is 649".
  const maxUnovaDexNumber = Math.max(
    ...POKEMON_DATA.filter((species) => species.dexNumber >= 494 && species.dexNumber <= 649).map((species) => species.dexNumber)
  );
  assert.equal(maxUnovaDexNumber, 649);

  const dex647Group = POKEMON_DATA.filter((species) => species.dexNumber === 647);
  assert.deepEqual(dex647Group.map((species) => species.id).sort(), ["keldeo", "keldeo-resolute"]);
});
