import assert from "node:assert/strict";
import { test } from "node:test";

import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import type { PokemonRarity } from "@/shared/types/pokemon";

// Generation 1 has exactly 151 species (Bulbasaur #0001 through Mew #0151).
// See engine/learnsets/data/generation-1/generation-1.completeness.test.ts
// for the same invariant applied to the learnset database.
const EXPECTED_GENERATION_1_POKEMON_COUNT = 151;

const VALID_RARITIES: PokemonRarity[] = ["common", "rare", "very-rare", "legendary"];

// Rarity classification as assigned by design decision (2026-07-29): every
// species keyed by dexNumber -> its intended rarity tier, so a test failure
// points at exactly which Pokémon regressed rather than just a wrong total.
const EXPECTED_RARITY_COUNTS: Record<PokemonRarity, number> = {
  common: 85,
  rare: 45,
  "very-rare": 16,
  legendary: 5,
};

test("exactly 151 Generation 1 Pokémon species are loaded", () => {
  assert.equal(POKEMON_DATA.length, EXPECTED_GENERATION_1_POKEMON_COUNT);
});

test("nothing is missing: every species id is present exactly once", () => {
  const uniqueIds = new Set(POKEMON_DATA.map((species) => species.id));
  assert.equal(uniqueIds.size, EXPECTED_GENERATION_1_POKEMON_COUNT);
});

test("no dex number is duplicated", () => {
  const dexNumbers = POKEMON_DATA.map((species) => species.dexNumber);
  const duplicates = dexNumbers.filter((dex, index) => dexNumbers.indexOf(dex) !== index);
  assert.deepEqual(duplicates, []);
});

test("dex numbers cover exactly 1 through 151 with no gaps", () => {
  const dexNumbers = POKEMON_DATA.map((species) => species.dexNumber).sort((a, b) => a - b);
  const expected = Array.from({ length: EXPECTED_GENERATION_1_POKEMON_COUNT }, (_, i) => i + 1);
  assert.deepEqual(dexNumbers, expected);
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
