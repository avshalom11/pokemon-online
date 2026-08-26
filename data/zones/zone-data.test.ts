// POKÉDEX — LOCATION HINTS FOR UNSEEN POKÉMON. Focused coverage for
// getSpeciesEncounterLocations — a plain scan over the real per-region zone
// encounter tables, never a hardcoded species -> location table.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getSpeciesEncounterLocations } from "./zone-data.ts";

test("a species with a real Kanto grassland encounter is reported as (kanto, grassland)", () => {
  const locations = getSpeciesEncounterLocations("bulbasaur");
  assert.ok(locations.some((location) => location.regionId === "kanto" && location.zoneId === "grassland"));
});

test("a species with no encounter entry in any region's zone data returns an empty array — never a fabricated location", () => {
  assert.deepEqual(getSpeciesEncounterLocations("no-such-species-id"), []);
});

test("the same (region, zone) pair is never repeated", () => {
  const locations = getSpeciesEncounterLocations("pidgey");
  const keys = locations.map((location) => `${location.regionId}:${location.zoneId}`);
  assert.equal(keys.length, new Set(keys).size);
});

test("bulbasaur (Kanto-only) is never credited with a Hoenn location it was never actually placed in", () => {
  const locations = getSpeciesEncounterLocations("bulbasaur");
  assert.ok(!locations.some((location) => location.regionId === "hoenn"));
});
