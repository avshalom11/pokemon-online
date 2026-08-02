// Focused regression tests for the Stone Evolution data added alongside
// LEVEL_EVOLUTIONS — deliberately small (per this phase's own "essential
// tests only" instruction): one test per rule that would silently break the
// feature, not exhaustive coverage of the whole species roster.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getLevelEvolution, getStoneEvolutionByItem, getStoneEvolutions, isEvolutionStoneItemId } from "./pokemon-evolutions.ts";

test("a species evolves only with its own canonical stone, never a different one", () => {
  assert.equal(getStoneEvolutionByItem("vulpix", "fire-stone")?.evolvesToSpeciesId, "ninetales");
  assert.equal(getStoneEvolutionByItem("vulpix", "water-stone"), undefined);
  assert.equal(getStoneEvolutionByItem("vulpix", "thunder-stone"), undefined);
  assert.equal(getStoneEvolutionByItem("vulpix", "leaf-stone"), undefined);
});

test("Eevee supports exactly its three canonical stone branches", () => {
  const branches = getStoneEvolutions("eevee");
  const byStone = Object.fromEntries(branches.map((branch) => [branch.stoneItemId, branch.evolvesToSpeciesId]));

  assert.equal(branches.length, 3);
  assert.equal(byStone["fire-stone"], "flareon");
  assert.equal(byStone["water-stone"], "vaporeon");
  assert.equal(byStone["thunder-stone"], "jolteon");
  assert.equal(getStoneEvolutionByItem("eevee", "leaf-stone"), undefined, "Eevee has no Leaf Stone branch");
});

test("a species with no stone evolution returns an empty list, never undefined", () => {
  assert.deepEqual(getStoneEvolutions("charmander"), []);
  assert.equal(getStoneEvolutionByItem("charmander", "fire-stone"), undefined);
});

test("stone-evolution species are never also present in the Level Evolution table", () => {
  const stoneOnlySpecies = ["vulpix", "growlithe", "poliwhirl", "shellder", "staryu", "pikachu", "gloom", "weepinbell", "exeggcute", "eevee"];

  for (const speciesId of stoneOnlySpecies) {
    assert.equal(getLevelEvolution(speciesId), undefined, `${speciesId} must have no level evolution entry`);
  }
});

test("isEvolutionStoneItemId only recognizes the four canonical Stone item ids", () => {
  assert.equal(isEvolutionStoneItemId("fire-stone"), true);
  assert.equal(isEvolutionStoneItemId("water-stone"), true);
  assert.equal(isEvolutionStoneItemId("thunder-stone"), true);
  assert.equal(isEvolutionStoneItemId("leaf-stone"), true);
  assert.equal(isEvolutionStoneItemId("moon-stone"), false);
  assert.equal(isEvolutionStoneItemId("poke-ball"), false);
});
