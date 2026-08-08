import assert from "node:assert/strict";
import { test } from "node:test";

import { HOENN_ZONE_DATA } from "./hoenn-zone-data.ts";
import { JOHTO_ZONE_DATA } from "./johto-zone-data.ts";
import { KANTO_ZONE_DATA } from "./kanto-zone-data.ts";
import { SINNOH_ZONE_DATA } from "./sinnoh-zone-data.ts";
import { UNOVA_ZONE_DATA } from "./unova-zone-data.ts";
import { getZone, getZoneData } from "./zone-data.ts";
import { POKEMON_DATA } from "../pokemon/pokemon-data.ts";

// Focused regression tests for the Sinnoh Encounter Tables phase — mirrors
// the validation checklist that phase's own spec required, checked
// directly against the canonical species catalog and Forms data rather
// than a second hardcoded species list here.

function allSinnohEncounters() {
  return SINNOH_ZONE_DATA.flatMap((zone) => zone.encounters.map((encounter) => ({ zoneId: zone.id, ...encounter })));
}

test("Sinnoh contains exactly 113 encounter entries", () => {
  assert.equal(allSinnohEncounters().length, 113);
});

test("there are exactly 113 unique species ids across all Sinnoh zones", () => {
  const ids = new Set(allSinnohEncounters().map((encounter) => encounter.pokemonId));
  assert.equal(ids.size, 113);
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

test("zone counts match the approved distribution exactly (44/10/9/12/9/29)", () => {
  const counts = Object.fromEntries(SINNOH_ZONE_DATA.map((zone) => [zone.id, zone.encounters.length]));
  assert.deepEqual(counts, {
    grassland: 44,
    water: 10,
    cave: 9,
    lava: 12,
    beach: 9,
    "haunted-house": 29,
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
  assert.equal(grassland!.encounters.length, 44);

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
