import assert from "node:assert/strict";
import { test } from "node:test";

import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import type { PokemonRarity } from "@/shared/types/pokemon";

// Generation 1 (Kanto, #0001-#0151) + Generation 2 (Johto, #0152-#0251) —
// 251 species total. See engine/learnsets/data/generation-1/
// generation-1.completeness.test.ts for the same invariant applied to the
// (still Generation-1-only) learnset database.
const EXPECTED_POKEMON_COUNT = 251;

const VALID_RARITIES: PokemonRarity[] = ["common", "rare", "very-rare", "legendary"];

// Rarity classification as assigned by design decision (2026-07-29,
// extended 2026-08-04 for Generation 2): every species keyed by dexNumber
// -> its intended rarity tier, so a test failure points at exactly which
// Pokémon regressed rather than just a wrong total.
const EXPECTED_RARITY_COUNTS: Record<PokemonRarity, number> = {
  common: 125,
  rare: 85,
  "very-rare": 30,
  legendary: 11,
};

test("exactly 251 Pokémon species are loaded", () => {
  assert.equal(POKEMON_DATA.length, EXPECTED_POKEMON_COUNT);
});

test("nothing is missing: every species id is present exactly once", () => {
  const uniqueIds = new Set(POKEMON_DATA.map((species) => species.id));
  assert.equal(uniqueIds.size, EXPECTED_POKEMON_COUNT);
});

test("no dex number is duplicated", () => {
  const dexNumbers = POKEMON_DATA.map((species) => species.dexNumber);
  const duplicates = dexNumbers.filter((dex, index) => dexNumbers.indexOf(dex) !== index);
  assert.deepEqual(duplicates, []);
});

test("dex numbers cover exactly 1 through 251 with no gaps", () => {
  const dexNumbers = POKEMON_DATA.map((species) => species.dexNumber).sort((a, b) => a - b);
  const expected = Array.from({ length: EXPECTED_POKEMON_COUNT }, (_, i) => i + 1);
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
