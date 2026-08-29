// BATTLE UI — TYPE DISPLAY. Focused coverage for the pure English
// type-label formatter used by components/battle/BattleHUD.tsx to show a
// Pokémon's type(s) directly under its name.
import assert from "node:assert/strict";
import { test } from "node:test";

import { formatPokemonTypesLabel } from "./pokemonTypeLabel.ts";
import type { PokemonType } from "@/shared/types/pokemon";

test("a single-type Pokémon renders exactly one capitalized English type (e.g. Pikachu -> Electric)", () => {
  assert.equal(formatPokemonTypesLabel(["electric"]), "Electric");
});

test("a dual-type Pokémon renders both types separated by ' / ', in the original data order (e.g. Charizard -> Fire / Flying)", () => {
  assert.equal(formatPokemonTypesLabel(["fire", "flying"]), "Fire / Flying");
});

test("data order is preserved even when it doesn't match alphabetical order (e.g. Gengar -> Ghost / Poison)", () => {
  assert.equal(formatPokemonTypesLabel(["ghost", "poison"]), "Ghost / Poison");
  // The reverse order must render reversed too — this is never re-sorted.
  assert.equal(formatPokemonTypesLabel(["poison", "ghost"]), "Poison / Ghost");
});

test("every canonical PokemonType value capitalizes correctly", () => {
  const allTypes: Array<[PokemonType, string]> = [
    ["normal", "Normal"],
    ["fire", "Fire"],
    ["water", "Water"],
    ["electric", "Electric"],
    ["grass", "Grass"],
    ["ice", "Ice"],
    ["fighting", "Fighting"],
    ["poison", "Poison"],
    ["ground", "Ground"],
    ["flying", "Flying"],
    ["psychic", "Psychic"],
    ["bug", "Bug"],
    ["rock", "Rock"],
    ["ghost", "Ghost"],
    ["dragon", "Dragon"],
    ["dark", "Dark"],
    ["steel", "Steel"],
    ["fairy", "Fairy"],
  ];

  for (const [raw, expected] of allTypes) {
    assert.equal(formatPokemonTypesLabel([raw]), expected);
  }
});
