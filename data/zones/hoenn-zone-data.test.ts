import assert from "node:assert/strict";
import { test } from "node:test";

import { HOENN_ZONE_DATA } from "./hoenn-zone-data.ts";
import { JOHTO_ZONE_DATA } from "./johto-zone-data.ts";
import { KANTO_ZONE_DATA } from "./kanto-zone-data.ts";
import { getZone, getZoneData } from "./zone-data.ts";
import { POKEMON_DATA } from "../pokemon/pokemon-data.ts";

// Focused regression tests for the Hoenn Encounter Tables phase — mirrors
// the validation checklist that phase's own spec required, checked
// directly against the canonical species catalog and Forms data rather
// than a second hardcoded species list here.

function allHoennEncounters() {
  return HOENN_ZONE_DATA.flatMap((zone) => zone.encounters.map((encounter) => ({ zoneId: zone.id, ...encounter })));
}

test("Hoenn contains exactly 138 encounter entries", () => {
  assert.equal(allHoennEncounters().length, 138);
});

test("there are exactly 138 unique species ids across all Hoenn zones", () => {
  const ids = new Set(allHoennEncounters().map((encounter) => encounter.pokemonId));
  assert.equal(ids.size, 138);
});

test("no duplicate species ids across all Hoenn zones", () => {
  const ids = allHoennEncounters().map((encounter) => encounter.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("every official Hoenn base species (#252-#386) appears exactly once", () => {
  const hoennBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 252 && species.dexNumber <= 386
  ).map((species) => species.id);
  assert.equal(hoennBaseIds.length, 135, "test assumption: 135 official Hoenn base species exist");

  const encounterIds = new Set(allHoennEncounters().map((encounter) => encounter.pokemonId));
  const missing = hoennBaseIds.filter((id) => !encounterIds.has(id));
  assert.deepEqual(missing, [], "no Hoenn base species may be missing from the encounter tables");
});

test("all three Deoxys alternate forms each appear exactly once", () => {
  const ids = allHoennEncounters().map((encounter) => encounter.pokemonId);
  for (const formId of ["deoxys-attack", "deoxys-defense", "deoxys-speed"]) {
    assert.equal(ids.filter((id) => id === formId).length, 1, `${formId} must appear exactly once`);
  }
  // The base deoxys is one of the 135 official base species already
  // checked above, but confirmed again here for clarity.
  assert.equal(ids.filter((id) => id === "deoxys").length, 1);
});

test("no Kanto or Johto species appears in the Hoenn pools", () => {
  const kantoJohtoIds = new Set([
    ...KANTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...JOHTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
  ]);
  const overlap = allHoennEncounters()
    .map((encounter) => encounter.pokemonId)
    .filter((id) => kantoJohtoIds.has(id));
  assert.deepEqual(overlap, []);
});

test("every referenced Hoenn species id resolves in the canonical species catalog", () => {
  const speciesIds = new Set(POKEMON_DATA.map((species) => species.id));
  const unknown = allHoennEncounters()
    .map((encounter) => encounter.pokemonId)
    .filter((id) => !speciesIds.has(id));
  assert.deepEqual(unknown, []);
});

test("zone counts match the approved distribution exactly (46/20/20/14/13/25)", () => {
  const counts = Object.fromEntries(HOENN_ZONE_DATA.map((zone) => [zone.id, zone.encounters.length]));
  assert.deepEqual(counts, {
    grassland: 46,
    water: 20,
    cave: 20,
    lava: 14,
    beach: 13,
    "haunted-house": 25,
  });
});

test("Masquerain is in Grassland, not Water — an intentional design decision, not an evolution-line grouping default", () => {
  const grassland = HOENN_ZONE_DATA.find((zone) => zone.id === "grassland")!;
  const water = HOENN_ZONE_DATA.find((zone) => zone.id === "water")!;
  assert.ok(grassland.encounters.some((encounter) => encounter.pokemonId === "masquerain"));
  assert.ok(!water.encounters.some((encounter) => encounter.pokemonId === "masquerain"));
});

test("every zone contains at least one valid encounter", () => {
  for (const zone of HOENN_ZONE_DATA) {
    assert.ok(zone.encounters.length > 0, `${zone.id} must have at least one encounter`);
  }
});

test("Kanto and Johto zone files are unaffected by Hoenn's addition", () => {
  assert.ok(KANTO_ZONE_DATA.length > 0);
  assert.ok(JOHTO_ZONE_DATA.length > 0);
  const kantoJohtoIds = new Set([
    ...KANTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...JOHTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
  ]);
  // Every Kanto/Johto species is still dex 1-251, never touched by the
  // Hoenn range — a coarse but effective "nothing here was edited" guard.
  for (const id of kantoJohtoIds) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must still resolve in the species catalog`);
    assert.ok(species!.dexNumber <= 251, `${id} (dex ${species!.dexNumber}) must never be a Hoenn species`);
  }
});

test("Hoenn resolves through the generic region-aware resolver (getZoneData/getZone), never a special case", () => {
  assert.equal(getZoneData("hoenn").length, 6);
  assert.equal(getZoneData("hoenn"), HOENN_ZONE_DATA);

  const grassland = getZone("hoenn", "grassland");
  assert.ok(grassland);
  assert.equal(grassland!.encounters.length, 46);

  // The same zoneId resolves to a completely different pool per region —
  // Hoenn's own grassland roster must never leak into or from Kanto/Johto.
  const kantoGrassland = getZone("kanto", "grassland");
  const johtoGrassland = getZone("johto", "grassland");
  const hoennIds = new Set(grassland!.encounters.map((e) => e.pokemonId));
  for (const encounter of kantoGrassland!.encounters) {
    assert.ok(!hoennIds.has(encounter.pokemonId), `${encounter.pokemonId} must not appear in both Kanto and Hoenn grassland`);
  }
  for (const encounter of johtoGrassland!.encounters) {
    assert.ok(!hoennIds.has(encounter.pokemonId), `${encounter.pokemonId} must not appear in both Johto and Hoenn grassland`);
  }
});

test("Hoenn is now battle-capable because real zone data exists (getZoneData(\"hoenn\").length > 0)", () => {
  assert.ok(getZoneData("hoenn").length > 0);
});
