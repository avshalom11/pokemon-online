// Focused regression tests for the Inventory's stone-evolution eligibility
// filter — pure, no DB, no React (see this module's own doc comment).
import assert from "node:assert/strict";
import { test } from "node:test";

import { getStoneEvolutionCandidates } from "./stone-evolution-eligibility.ts";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

function makeOwned(id: string, speciesId: string, overrides: Partial<OwnedPokemon> = {}): OwnedPokemon {
  const species = getSpeciesById(speciesId);
  if (!species) throw new Error(`unknown species in test fixture: ${speciesId}`);

  return {
    id,
    species,
    nickname: null,
    level: 20,
    experience: 0,
    currentHp: 10,
    maxHp: 30,
    isStarter: false,
    caughtAt: new Date(),
    isShiny: false,
    partySlot: null,
    status: null,
    statusTurnsRemaining: null,
    ...overrides,
  };
}

test("only owned Pokémon whose species matches the selected stone are returned", () => {
  const owned = [
    makeOwned("mon-vulpix", "vulpix"),
    makeOwned("mon-charmander", "charmander"),
    makeOwned("mon-poliwhirl", "poliwhirl"),
  ];

  const candidates = getStoneEvolutionCandidates("fire-stone", owned);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.playerPokemonId, "mon-vulpix");
  assert.equal(candidates[0]?.evolvedSpecies.id, "ninetales");
});

test("party AND storage Pokémon are both included (partySlot is never filtered on)", () => {
  const owned = [
    makeOwned("mon-in-party", "growlithe", { partySlot: 2 }),
    makeOwned("mon-in-storage", "growlithe", { partySlot: null }),
  ];

  const candidates = getStoneEvolutionCandidates("fire-stone", owned);
  const ids = candidates.map((candidate) => candidate.playerPokemonId).sort();

  assert.deepEqual(ids, ["mon-in-party", "mon-in-storage"]);
});

test("no candidates for a stone the owned species can't use, even if the species has some other stone evolution", () => {
  const owned = [makeOwned("mon-vulpix", "vulpix")];

  assert.deepEqual(getStoneEvolutionCandidates("water-stone", owned), []);
});

test("Eevee is returned once per matching stone, resolving to the correct branch each time", () => {
  const owned = [makeOwned("mon-eevee", "eevee")];

  const fire = getStoneEvolutionCandidates("fire-stone", owned);
  const water = getStoneEvolutionCandidates("water-stone", owned);
  const thunder = getStoneEvolutionCandidates("thunder-stone", owned);
  const leaf = getStoneEvolutionCandidates("leaf-stone", owned);

  assert.equal(fire[0]?.evolvedSpecies.id, "flareon");
  assert.equal(water[0]?.evolvedSpecies.id, "vaporeon");
  assert.equal(thunder[0]?.evolvedSpecies.id, "jolteon");
  assert.deepEqual(leaf, [], "Eevee has no Leaf Stone branch");
});
