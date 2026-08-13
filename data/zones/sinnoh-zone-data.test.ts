import assert from "node:assert/strict";
import { test } from "node:test";

import { HOENN_ZONE_DATA } from "./hoenn-zone-data.ts";
import { JOHTO_ZONE_DATA } from "./johto-zone-data.ts";
import { KANTO_ZONE_DATA } from "./kanto-zone-data.ts";
import { SINNOH_ZONE_DATA } from "./sinnoh-zone-data.ts";
import { UNOVA_ZONE_DATA } from "./unova-zone-data.ts";
import { getZone, getZoneData } from "./zone-data.ts";
import { getEffectiveEncounterRarity } from "../../engine/encounter-rarity/get-effective-encounter-rarity.ts";
import { POKEMON_DATA } from "../pokemon/pokemon-data.ts";

// Focused regression tests for the Sinnoh Encounter Tables phase — mirrors
// the validation checklist that phase's own spec required, checked
// directly against the canonical species catalog and Forms data rather
// than a second hardcoded species list here.

function allSinnohEncounters() {
  return SINNOH_ZONE_DATA.flatMap((zone) => zone.encounters.map((encounter) => ({ zoneId: zone.id, ...encounter })));
}

test("Sinnoh contains exactly 137 encounter entries (113 + 7 Pre-Paldea species + 17 Pre-Paldea Hisuian Forms)", () => {
  assert.equal(allSinnohEncounters().length, 137);
});

test("there are exactly 137 unique species ids across all Sinnoh zones", () => {
  const ids = new Set(allSinnohEncounters().map((encounter) => encounter.pokemonId));
  assert.equal(ids.size, 137);
});

test("no duplicate species ids across all Sinnoh zones", () => {
  const ids = allSinnohEncounters().map((encounter) => encounter.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("every official Sinnoh base species (#387-#493) appears exactly once", () => {
  const sinnohBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 387 && species.dexNumber <= 493
  ).map((species) => species.id);
  assert.equal(sinnohBaseIds.length, 107, "test assumption: 107 official Sinnoh base species exist");

  const encounterIds = new Set(allSinnohEncounters().map((encounter) => encounter.pokemonId));
  const missing = sinnohBaseIds.filter((id) => !encounterIds.has(id));
  assert.deepEqual(missing, [], "no Sinnoh base species may be missing from the encounter tables");
});

test("Victini (#494) exists in the global catalog (Unova, Generation 5) but does not appear in Sinnoh's encounter tables", () => {
  // Victini legitimately exists in POKEMON_DATA now that Unova has been
  // added — the old "Victini must not exist in the catalog at all"
  // assumption predates Unova and no longer holds. The real Sinnoh
  // invariant was always region isolation: Victini belongs to Unova, so it
  // must never appear in Sinnoh's own encounter tables, regardless of
  // whether it exists elsewhere in the catalog.
  const victiniSpecies = POKEMON_DATA.find((species) => species.dexNumber === 494);
  assert.ok(victiniSpecies, "Victini must exist in the canonical global catalog as part of Unova");
  assert.equal(victiniSpecies!.id, "victini");

  const ids = allSinnohEncounters().map((encounter) => encounter.pokemonId);
  assert.ok(!ids.includes("victini"), "Victini must never appear in Sinnoh's own encounter tables");
});

test("all five Rotom alternate forms each appear exactly once", () => {
  const ids = allSinnohEncounters().map((encounter) => encounter.pokemonId);
  for (const formId of ["rotom-heat", "rotom-wash", "rotom-frost", "rotom-fan", "rotom-mow"]) {
    assert.equal(ids.filter((id) => id === formId).length, 1, `${formId} must appear exactly once`);
  }
});

test("Giratina Origin Form appears exactly once", () => {
  const ids = allSinnohEncounters().map((encounter) => encounter.pokemonId);
  assert.equal(ids.filter((id) => id === "giratina-origin").length, 1);
});

test("base Rotom and base Giratina also appear exactly once each", () => {
  const ids = allSinnohEncounters().map((encounter) => encounter.pokemonId);
  assert.equal(ids.filter((id) => id === "rotom").length, 1);
  assert.equal(ids.filter((id) => id === "giratina").length, 1);
});

test("no Kanto, Johto, Hoenn, or Unova species appears in the Sinnoh pools", () => {
  const otherRegionIds = new Set([
    ...KANTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...JOHTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...HOENN_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...UNOVA_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
  ]);
  const overlap = allSinnohEncounters()
    .map((encounter) => encounter.pokemonId)
    .filter((id) => otherRegionIds.has(id));
  assert.deepEqual(overlap, []);
});

test("every referenced Sinnoh species id resolves in the canonical species catalog", () => {
  const speciesIds = new Set(POKEMON_DATA.map((species) => species.id));
  const unknown = allSinnohEncounters()
    .map((encounter) => encounter.pokemonId)
    .filter((id) => !speciesIds.has(id));
  assert.deepEqual(unknown, []);
});

test("zone counts match the approved distribution exactly (49/15/16/15/10/32, after the Pre-Paldea 17 Hisuian Forms Encounter Integration step)", () => {
  const counts = Object.fromEntries(SINNOH_ZONE_DATA.map((zone) => [zone.id, zone.encounters.length]));
  assert.deepEqual(counts, {
    grassland: 49,
    water: 15,
    cave: 16,
    lava: 15,
    beach: 10,
    "haunted-house": 32,
  });
});

test("every zone contains at least one valid encounter", () => {
  for (const zone of SINNOH_ZONE_DATA) {
    assert.ok(zone.encounters.length > 0, `${zone.id} must have at least one encounter`);
  }
});

test("Kanto, Johto, and Hoenn zone files are unaffected by Sinnoh's addition", () => {
  assert.ok(KANTO_ZONE_DATA.length > 0);
  assert.ok(JOHTO_ZONE_DATA.length > 0);
  assert.ok(HOENN_ZONE_DATA.length > 0);
  const otherRegionIds = new Set([
    ...KANTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...JOHTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...HOENN_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
  ]);
  // Every Kanto/Johto/Hoenn species is still dex 1-386, never touched by
  // the Sinnoh range — a coarse but effective "nothing here was edited"
  // guard.
  for (const id of otherRegionIds) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must still resolve in the species catalog`);
    assert.ok(species!.dexNumber <= 386, `${id} (dex ${species!.dexNumber}) must never be a Sinnoh species`);
  }
});

test("Sinnoh resolves through the generic region-aware resolver (getZoneData/getZone), never a special case", () => {
  assert.equal(getZoneData("sinnoh").length, 6);
  assert.equal(getZoneData("sinnoh"), SINNOH_ZONE_DATA);

  const grassland = getZone("sinnoh", "grassland");
  assert.ok(grassland);
  assert.equal(grassland!.encounters.length, 49);

  // The same zoneId resolves to a completely different pool per region —
  // Sinnoh's own grassland roster must never leak into or from Kanto/
  // Johto/Hoenn.
  const sinnohIds = new Set(grassland!.encounters.map((e) => e.pokemonId));
  for (const otherRegion of [KANTO_ZONE_DATA, JOHTO_ZONE_DATA, HOENN_ZONE_DATA]) {
    const otherGrassland = otherRegion.find((zone) => zone.id === "grassland");
    for (const encounter of otherGrassland!.encounters) {
      assert.ok(!sinnohIds.has(encounter.pokemonId), `${encounter.pokemonId} must not appear in both another region and Sinnoh grassland`);
    }
  }
});

test("Sinnoh is now battle-capable because real zone data exists (getZoneData(\"sinnoh\").length > 0)", () => {
  assert.ok(getZoneData("sinnoh").length > 0);
});

test("evolution-item targets resolve to effective very-rare while their real PokemonSpecies.rarity stays rare", () => {
  // Sinnoh Rarity Audit approved-design-change: rhyperior, electivire,
  // magmortar, and porygon-z were moved from real "rare" to real
  // "very-rare" — they're still evolution-item targets (still resolve to
  // effective "very-rare"), but they no longer count as a real-rare ->
  // effective-very-rare OVERRIDE, since their real rarity now already
  // matches. Verified separately below. This list keeps only the item
  // targets whose real rarity is still "rare".
  const itemEvolutionTargets = [
    "roserade", "mismagius", "honchkrow", "weavile",
    "togekiss", "leafeon", "glaceon", "gliscor",
    "gallade", "dusknoir", "froslass",
  ];
  for (const id of itemEvolutionTargets) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "rare", `${id}'s real PokemonSpecies.rarity must stay "rare" (only the effective encounter-rarity tier changes)`);
  }
});

test("Sinnoh Rarity Audit: Porygon-Z, Magmortar, Electivire, and Rhyperior are now real very-rare (no longer a rare->very-rare override — effective rarity trivially matches real rarity)", () => {
  for (const id of ["porygon-z", "magmortar", "electivire", "rhyperior"]) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "very-rare", `${id}'s real PokemonSpecies.rarity must now be "very-rare"`);
  }
});

test("Sinnoh Rarity Audit: Magnezone is now real very-rare (not an evolution-item target, so this was a direct rarity change, not an override removal)", () => {
  const magnezone = POKEMON_DATA.find((candidate) => candidate.id === "magnezone");
  assert.ok(magnezone);
  assert.equal(magnezone!.rarity, "very-rare");
});

test("Sinnoh Rarity Audit: Phione and all six Rotom entries are now real legendary", () => {
  for (const id of ["phione", "rotom", "rotom-heat", "rotom-wash", "rotom-frost", "rotom-fan", "rotom-mow"]) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "legendary", `${id}'s real PokemonSpecies.rarity must now be "legendary"`);
  }
});

// ============================================================================
// Pre-Paldea Encounter Integration — #899-905, user-approved zone placement
// ============================================================================

const PRE_PALDEA_PLACEMENT: Array<{ pokemonId: string; zoneId: string; encounterWeight: number; minimumLevel: number; maximumLevel: number }> = [
  { pokemonId: "wyrdeer", zoneId: "grassland", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "ursaluna", zoneId: "cave", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "kleavor", zoneId: "cave", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "sneasler", zoneId: "cave", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "basculegion", zoneId: "water", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "overqwil", zoneId: "water", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "enamorus", zoneId: "haunted-house", encounterWeight: 1, minimumLevel: 55, maximumLevel: 60 },
];

test("all 7 Pre-Paldea species appear in Sinnoh encounters, each exactly once, in exactly their user-approved zone with the correct weight and level range", () => {
  for (const expectation of PRE_PALDEA_PLACEMENT) {
    const matches = allSinnohEncounters().filter((encounter) => encounter.pokemonId === expectation.pokemonId);
    assert.equal(matches.length, 1, `${expectation.pokemonId} must appear exactly once across all Sinnoh zones`);

    const encounter = matches[0]!;
    assert.equal(encounter.zoneId, expectation.zoneId, `${expectation.pokemonId} must be placed in "${expectation.zoneId}"`);
    assert.equal(encounter.encounterWeight, expectation.encounterWeight, `${expectation.pokemonId}'s encounterWeight must follow the established convention`);
    assert.equal(encounter.minimumLevel, expectation.minimumLevel);
    assert.equal(encounter.maximumLevel, expectation.maximumLevel);
  }
});

test("none of the 7 Pre-Paldea species appears in Lava or Beach", () => {
  const prePaldeaIds = new Set(PRE_PALDEA_PLACEMENT.map((expectation) => expectation.pokemonId));
  const lava = getZone("sinnoh", "lava")!;
  const beach = getZone("sinnoh", "beach")!;

  for (const encounter of [...lava.encounters, ...beach.encounters]) {
    assert.ok(!prePaldeaIds.has(encounter.pokemonId), `${encounter.pokemonId} must not appear in Lava or Beach`);
  }
});

test("Lava and Beach encounter counts were unchanged by the Pre-Paldea #899-905 Encounter Integration step (12 and 9 at that time), and now reflect the later Pre-Paldea 17 Hisuian Forms step's own additions (15 and 10)", () => {
  assert.equal(getZone("sinnoh", "lava")!.encounters.length, 15);
  assert.equal(getZone("sinnoh", "beach")!.encounters.length, 10);
});

test("Pre-Paldea REAL rarity matches the final user-approved assignment: Kleavor is very-rare, Enamorus is legendary, the other five stay rare", () => {
  const expectedRarity: Record<string, string> = {
    wyrdeer: "rare",
    ursaluna: "rare",
    kleavor: "very-rare",
    sneasler: "rare",
    basculegion: "rare",
    overqwil: "rare",
    enamorus: "legendary",
  };
  for (const [id, rarity] of Object.entries(expectedRarity)) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, rarity, `${id}'s real PokemonSpecies.rarity must be "${rarity}"`);
  }
});

test("Pre-Paldea EFFECTIVE encounter rarity equals REAL rarity for all 7 species (none are evolution-ITEM targets, only LEVEL-evolution targets, so getEffectiveEncounterRarity applies no override)", () => {
  const expectedRarity: Record<string, string> = {
    wyrdeer: "rare",
    ursaluna: "rare",
    kleavor: "very-rare",
    sneasler: "rare",
    basculegion: "rare",
    overqwil: "rare",
    enamorus: "legendary",
  };
  for (const [id, rarity] of Object.entries(expectedRarity)) {
    assert.equal(getEffectiveEncounterRarity(id), rarity, `${id}'s effective encounter rarity must equal its real rarity "${rarity}"`);
  }
});

test("all pre-existing Sinnoh encounters remain intact: no species disappeared, moved zones, or was duplicated by either the Pre-Paldea Encounter Integration step or the later Pre-Paldea 17 Hisuian Forms step", () => {
  const preExistingCounts: Record<string, number> = {
    grassland: 44,
    water: 10,
    cave: 9,
    lava: 12,
    beach: 9,
    "haunted-house": 29,
  };
  const prePaldeaByZone: Record<string, string[]> = {
    grassland: ["wyrdeer"],
    water: ["basculegion", "overqwil"],
    cave: ["ursaluna", "kleavor", "sneasler"],
    "haunted-house": ["enamorus"],
  };
  const hisuianFormsByZone: Record<string, string[]> = {
    grassland: ["voltorb-hisui", "electrode-hisui", "lilligant-hisui", "decidueye-hisui"],
    water: ["qwilfish-hisui", "basculin-hisui", "samurott-hisui"],
    cave: ["sneasel-hisui", "sliggoo-hisui", "goodra-hisui", "avalugg-hisui"],
    lava: ["growlithe-hisui", "arcanine-hisui", "typhlosion-hisui"],
    beach: ["braviary-hisui"],
    "haunted-house": ["zorua-hisui", "zoroark-hisui"],
  };

  for (const zone of SINNOH_ZONE_DATA) {
    const addedIdsInZone = new Set([...(prePaldeaByZone[zone.id] ?? []), ...(hisuianFormsByZone[zone.id] ?? [])]);
    const preExisting = zone.encounters.filter((encounter) => !addedIdsInZone.has(encounter.pokemonId));
    assert.equal(preExisting.length, preExistingCounts[zone.id], `${zone.id}'s pre-existing encounter count must be unchanged`);
  }
});

test("no duplicate pokemonId exists anywhere in Sinnoh encounters after the Pre-Paldea addition, and every id resolves to a real species", () => {
  const ids = allSinnohEncounters().map((encounter) => encounter.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);

  const speciesIds = new Set(POKEMON_DATA.map((species) => species.id));
  const unknown = ids.filter((id) => !speciesIds.has(id));
  assert.deepEqual(unknown, []);
});

test("every Sinnoh encounter has a positive encounterWeight and minimumLevel <= maximumLevel", () => {
  for (const encounter of allSinnohEncounters()) {
    assert.ok(encounter.encounterWeight > 0, `${encounter.pokemonId}'s encounterWeight must be positive`);
    assert.ok(encounter.minimumLevel <= encounter.maximumLevel, `${encounter.pokemonId}'s minimumLevel must not exceed maximumLevel`);
  }
});

// ============================================================================
// Pre-Paldea 17 Hisuian Forms Encounter Integration — user-approved zone placement
// ============================================================================

const HISUIAN_FORM_PLACEMENT: Array<{ pokemonId: string; zoneId: string; encounterWeight: number; minimumLevel: number; maximumLevel: number }> = [
  { pokemonId: "voltorb-hisui", zoneId: "grassland", encounterWeight: 20, minimumLevel: 2, maximumLevel: 6 },
  { pokemonId: "electrode-hisui", zoneId: "grassland", encounterWeight: 20, minimumLevel: 2, maximumLevel: 6 },
  { pokemonId: "lilligant-hisui", zoneId: "grassland", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "decidueye-hisui", zoneId: "grassland", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "qwilfish-hisui", zoneId: "water", encounterWeight: 10, minimumLevel: 4, maximumLevel: 8 },
  { pokemonId: "basculin-hisui", zoneId: "water", encounterWeight: 10, minimumLevel: 4, maximumLevel: 8 },
  { pokemonId: "samurott-hisui", zoneId: "water", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "sneasel-hisui", zoneId: "cave", encounterWeight: 20, minimumLevel: 2, maximumLevel: 6 },
  { pokemonId: "sliggoo-hisui", zoneId: "cave", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "goodra-hisui", zoneId: "cave", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "avalugg-hisui", zoneId: "cave", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "growlithe-hisui", zoneId: "lava", encounterWeight: 20, minimumLevel: 2, maximumLevel: 6 },
  { pokemonId: "arcanine-hisui", zoneId: "lava", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "typhlosion-hisui", zoneId: "lava", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "braviary-hisui", zoneId: "beach", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "zorua-hisui", zoneId: "haunted-house", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
  { pokemonId: "zoroark-hisui", zoneId: "haunted-house", encounterWeight: 5, minimumLevel: 6, maximumLevel: 10 },
];

test("all 17 Hisuian Forms appear in Sinnoh encounters, each exactly once, in exactly their user-approved zone with the correct weight and level range", () => {
  assert.equal(HISUIAN_FORM_PLACEMENT.length, 17);
  for (const expectation of HISUIAN_FORM_PLACEMENT) {
    const matches = allSinnohEncounters().filter((encounter) => encounter.pokemonId === expectation.pokemonId);
    assert.equal(matches.length, 1, `${expectation.pokemonId} must appear exactly once across all Sinnoh zones`);

    const encounter = matches[0]!;
    assert.equal(encounter.zoneId, expectation.zoneId, `${expectation.pokemonId} must be placed in "${expectation.zoneId}"`);
    assert.equal(encounter.encounterWeight, expectation.encounterWeight, `${expectation.pokemonId}'s encounterWeight must follow the established convention`);
    assert.equal(encounter.minimumLevel, expectation.minimumLevel);
    assert.equal(encounter.maximumLevel, expectation.maximumLevel);
  }
});

test("no Hisuian Form appears in more than one zone", () => {
  const byId = new Map<string, string[]>();
  for (const encounter of allSinnohEncounters()) {
    if (!encounter.pokemonId.endsWith("-hisui")) continue;
    const zones = byId.get(encounter.pokemonId) ?? [];
    zones.push(encounter.zoneId);
    byId.set(encounter.pokemonId, zones);
  }
  for (const [id, zones] of byId) {
    assert.equal(zones.length, 1, `${id} must appear in exactly one zone, found: ${zones.join(", ")}`);
  }
});

test("Hisuian Form REAL rarity is unchanged by encounter placement (still copied from the live ordinary counterpart)", () => {
  const expectedRarity: Record<string, string> = {
    "voltorb-hisui": "common",
    "electrode-hisui": "common",
    "lilligant-hisui": "rare",
    "decidueye-hisui": "very-rare",
    "qwilfish-hisui": "rare",
    "basculin-hisui": "rare",
    "samurott-hisui": "very-rare",
    "sneasel-hisui": "common",
    "sliggoo-hisui": "very-rare",
    "goodra-hisui": "very-rare",
    "avalugg-hisui": "rare",
    "growlithe-hisui": "common",
    "arcanine-hisui": "rare",
    "typhlosion-hisui": "very-rare",
    "braviary-hisui": "rare",
    "zorua-hisui": "very-rare",
    "zoroark-hisui": "very-rare",
  };
  for (const [id, rarity] of Object.entries(expectedRarity)) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, rarity, `${id}'s real PokemonSpecies.rarity must be "${rarity}"`);
  }
});

test("Hisuian Form REAL vs EFFECTIVE encounter rarity: Arcanine-Hisui, Electrode-Hisui, and Lilligant-Hisui are promoted to effective very-rare (evolution-item targets); every other Hisuian Form's effective rarity equals its real rarity", () => {
  const expectedEffectiveRarity: Record<string, string> = {
    "voltorb-hisui": "common",
    "electrode-hisui": "very-rare",
    "lilligant-hisui": "very-rare",
    "decidueye-hisui": "very-rare",
    "qwilfish-hisui": "rare",
    "basculin-hisui": "rare",
    "samurott-hisui": "very-rare",
    "sneasel-hisui": "common",
    "sliggoo-hisui": "very-rare",
    "goodra-hisui": "very-rare",
    "avalugg-hisui": "rare",
    "growlithe-hisui": "common",
    "arcanine-hisui": "very-rare",
    "typhlosion-hisui": "very-rare",
    "braviary-hisui": "rare",
    "zorua-hisui": "very-rare",
    "zoroark-hisui": "very-rare",
  };
  for (const [id, rarity] of Object.entries(expectedEffectiveRarity)) {
    assert.equal(getEffectiveEncounterRarity(id), rarity, `${id}'s effective encounter rarity must be "${rarity}"`);
  }
});
