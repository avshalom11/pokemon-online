// POKÉDEX / MY POKÉMON — REGION FILTER. Focused coverage for the shared
// region-membership utility both filters reuse — never a duplicated
// species -> region table.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getSpeciesRegionIds, mergeSpeciesRegions, speciesBelongsToRegion } from "./species-region-membership.ts";

test("a Kanto-owned species with a real Kanto encounter reports exactly its home region", () => {
  assert.deepEqual(getSpeciesRegionIds("bulbasaur"), ["kanto"]);
});

test("a Johto-owned species reports its home region, not Kanto's (generation != a formula, but placement is still correct)", () => {
  assert.deepEqual(getSpeciesRegionIds("chikorita"), ["johto"]);
});

test("a regional Form (its own distinct species id) belongs to ITS OWN region, never its base species' region", () => {
  // rattata-alola is a separate id from rattata — pokemon-region-registry.ts's
  // own doc comment: Forms keep the base species' National Dex number but
  // genuinely belong to a different region's own array/zone data.
  assert.deepEqual(getSpeciesRegionIds("rattata-alola"), ["alola"]);
  assert.deepEqual(getSpeciesRegionIds("rattata"), ["kanto"]);
});

test("an unrecognized species id returns an empty list — never a fabricated region", () => {
  assert.deepEqual(getSpeciesRegionIds("no-such-species-id"), []);
});

test("speciesBelongsToRegion matches the species' home region and rejects every other region", () => {
  assert.equal(speciesBelongsToRegion("bulbasaur", "kanto"), true);
  assert.equal(speciesBelongsToRegion("bulbasaur", "johto"), false);
  assert.equal(speciesBelongsToRegion("bulbasaur", "hoenn"), false);
});

test("speciesBelongsToRegion is false for every region on an unrecognized species id", () => {
  assert.equal(speciesBelongsToRegion("no-such-species-id", "kanto"), false);
});

// MULTI-REGION SUPPORT. No real species in today's data spans more than one
// region (every region's zone data only ever places species from its own
// generation array), but the merge algorithm itself must already support a
// species genuinely belonging to more than one region — tested directly via
// its own decoupled pure function with synthetic input, independent of the
// live data.
test("mergeSpeciesRegions unions the home region with every encounter region, deduplicated", () => {
  const merged = mergeSpeciesRegions("kanto", ["johto", "kanto", "hoenn"]);
  assert.deepEqual(new Set(merged), new Set(["kanto", "johto", "hoenn"]));
  assert.equal(merged.length, 3, "kanto must not be duplicated even though it's both the home region and an encounter region");
});

test("mergeSpeciesRegions with no home region still returns the encounter regions", () => {
  const merged = mergeSpeciesRegions(undefined, ["unova"]);
  assert.deepEqual(merged, ["unova"]);
});

test("mergeSpeciesRegions with a home region but no encounter regions returns just the home region", () => {
  assert.deepEqual(mergeSpeciesRegions("paldea", []), ["paldea"]);
});

test("mergeSpeciesRegions with neither returns an empty list", () => {
  assert.deepEqual(mergeSpeciesRegions(undefined, []), []);
});
