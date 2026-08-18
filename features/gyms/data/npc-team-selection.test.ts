import assert from "node:assert/strict";
import { test } from "node:test";

import type { PokemonSpecies } from "@/shared/types/pokemon";
import { selectNpcTeam } from "./npc-team-selection.ts";

const BASE_STATS = { health: 50, attack: 50, defense: 50, specialAttack: 50, specialDefense: 50, speed: 50 };

function species(id: string, dexNumber: number, types: PokemonSpecies["types"], rarity: PokemonSpecies["rarity"]): PokemonSpecies {
  return { id, name: id, description: "", dexNumber, types, rarity, baseStats: BASE_STATS, imageUrl: "" };
}

// A tiny fixture pool — deliberately NOT the real catalog (see
// selectNpcTeam's own doc comment for why the pool is injected rather than
// fetched internally): common/rare/very-rare Fire and Water types, plus
// exactly two Legendaries (one Fire, one with no Fire-type Legendary at
// all in a second scenario below).
const POOL: PokemonSpecies[] = [
  species("common-fire-a", 1, ["fire"], "common"),
  species("common-fire-b", 2, ["fire"], "common"),
  species("common-water-a", 3, ["water"], "common"),
  species("rare-fire-a", 4, ["fire"], "rare"),
  species("rare-water-a", 5, ["water"], "rare"),
  species("very-rare-water-a", 6, ["water"], "very-rare"),
  species("legendary-fire-a", 7, ["fire"], "legendary"),
  species("legendary-water-a", 8, ["water"], "legendary"),
];

test("Priority 1: exact rarity + matching type is picked when available", () => {
  const [result] = selectNpcTeam(POOL, [{ targetRarity: "common", preferredType: "fire" }]);
  assert.equal(result?.speciesId, "common-fire-a");
  assert.equal(result?.fallbackTier, "exact-rarity-matching-type");
});

test("Priority 2: exact rarity + any type when no type match exists", () => {
  const [result] = selectNpcTeam(POOL, [{ targetRarity: "very-rare", preferredType: "fire" }]);
  // Only very-rare-water-a exists at this rarity — no Fire very-rare in the pool.
  assert.equal(result?.speciesId, "very-rare-water-a");
  assert.equal(result?.fallbackTier, "exact-rarity-off-type");
});

test("Priority 3/4: one rarity tier lower when the exact rarity is exhausted (already used)", () => {
  const [first, second, third] = selectNpcTeam(POOL, [
    { targetRarity: "rare", preferredType: "fire" },
    { targetRarity: "rare", preferredType: "fire" },
    { targetRarity: "rare", preferredType: "fire" },
  ]);
  // Only two Rare species exist at all (one Fire, one Water) — slot 1 takes
  // the Fire one, slot 2 takes the only Rare left (Water, off-type), and
  // slot 3 — the whole Rare tier now exhausted — falls back one tier to
  // Common.
  assert.equal(first?.speciesId, "rare-fire-a");
  assert.equal(second?.speciesId, "rare-water-a");
  assert.equal(third?.targetRarity, "rare");
  assert.equal(third?.speciesId, "common-fire-a");
  assert.equal(third?.fallbackTier, "lower-rarity-matching-type");
});

test("Legendary never downgrades a tier: once every Legendary in the region is used, the next Legendary slot returns null, not a Very Rare substitute", () => {
  const [first, second, third] = selectNpcTeam(POOL, [
    { targetRarity: "legendary", preferredType: "fire" },
    { targetRarity: "legendary", preferredType: "fire" },
    { targetRarity: "legendary", preferredType: "fire" },
  ]);
  // Only two Legendaries exist at all (one Fire, one Water) — slot 1 takes
  // the Fire one, slot 2 takes the only Legendary left (Water, off-type —
  // exactly the approved "choose another Legendary from the same region"
  // rule), and slot 3 — no Legendary left anywhere — must NOT fall back to
  // very-rare-water-a.
  assert.equal(first?.speciesId, "legendary-fire-a");
  assert.equal(second?.speciesId, "legendary-water-a");
  assert.equal(second?.fallbackTier, "legendary-same-region-off-type");
  assert.equal(third, null);
});

test("no duplicate species within the same team", () => {
  const results = selectNpcTeam(POOL, [
    { targetRarity: "common", preferredType: "fire" },
    { targetRarity: "common", preferredType: "fire" },
  ]);
  const ids = results.map((r) => r?.speciesId);
  assert.deepEqual(ids, ["common-fire-a", "common-fire-b"]);
  assert.notEqual(ids[0], ids[1]);
});

test("Regional Champion slots (no preferredType) are labeled no-type-preference, never a fallback tier", () => {
  const [result] = selectNpcTeam(POOL, [{ targetRarity: "very-rare" }]);
  assert.equal(result?.speciesId, "very-rare-water-a");
  assert.equal(result?.fallbackTier, "no-type-preference");
});

test("an off-type Legendary pick via the deterministic path is labeled legendary-same-region-off-type", () => {
  const [result] = selectNpcTeam(POOL, [{ targetRarity: "legendary", preferredType: "electric" }]);
  // No Electric Legendary in the pool -> falls back to any-type Legendary, still Legendary rarity.
  assert.equal(result?.targetRarity, "legendary");
  assert.equal(result?.fallbackTier, "legendary-same-region-off-type");
});

test("preference hints are tried first, but only when they validate (correct rarity, not already used)", () => {
  const [result] = selectNpcTeam(POOL, [{ targetRarity: "common", preferredType: "fire", preferredSpeciesIds: ["common-fire-b"] }]);
  assert.equal(result?.speciesId, "common-fire-b");
});

test("an invalid preference hint (wrong rarity) is silently skipped, never forced", () => {
  const [result] = selectNpcTeam(POOL, [{ targetRarity: "common", preferredType: "fire", preferredSpeciesIds: ["legendary-fire-a"] }]);
  // legendary-fire-a is not "common" rarity -> hint skipped -> normal search picks common-fire-a.
  assert.equal(result?.speciesId, "common-fire-a");
});

test("a slot that cannot be filled at all (rarity pool exhausted, no lower tier exists below Common) returns null rather than crashing", () => {
  const results = selectNpcTeam(POOL, [
    { targetRarity: "common", preferredType: "fire" },
    { targetRarity: "common", preferredType: "fire" },
    { targetRarity: "common", preferredType: "fire" },
    { targetRarity: "common", preferredType: "fire" },
  ]);
  // Exactly 3 Common species exist in the whole pool (2 fire + 1 water); a
  // 4th Common slot exhausts even the off-type fallback, and there is no
  // tier below Common to fall back to.
  assert.deepEqual(
    results.map((r) => r?.speciesId ?? null),
    ["common-fire-a", "common-fire-b", "common-water-a", null]
  );
});
