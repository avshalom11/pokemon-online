// Focused regression tests for the Inventory's evolution-item eligibility
// filter — pure, no DB, no React (see this module's own doc comment).
// Covers both original Stones and the former Trade-item evolutions (now
// merged into the same table).
import assert from "node:assert/strict";
import { test } from "node:test";

import { getEvolutionItemCandidates } from "./evolution-item-eligibility.ts";
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

test("only owned Pokémon whose species matches the selected item are returned", () => {
  const owned = [
    makeOwned("mon-vulpix", "vulpix"),
    makeOwned("mon-charmander", "charmander"),
    makeOwned("mon-poliwhirl", "poliwhirl"),
  ];

  const candidates = getEvolutionItemCandidates("fire-stone", owned);

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.playerPokemonId, "mon-vulpix");
  assert.deepEqual(candidates[0]?.evolvedSpeciesOptions.map((s) => s.id), ["ninetales"]);
});

test("party AND storage Pokémon are both included (partySlot is never filtered on)", () => {
  const owned = [
    makeOwned("mon-in-party", "growlithe", { partySlot: 2 }),
    makeOwned("mon-in-storage", "growlithe", { partySlot: null }),
  ];

  const candidates = getEvolutionItemCandidates("fire-stone", owned);
  const ids = candidates.map((candidate) => candidate.playerPokemonId).sort();

  assert.deepEqual(ids, ["mon-in-party", "mon-in-storage"]);
});

test("no candidates for an item the owned species can't use, even if the species has some other item evolution", () => {
  const owned = [makeOwned("mon-vulpix", "vulpix")];

  assert.deepEqual(getEvolutionItemCandidates("water-stone", owned), []);
});

test("Eevee is returned once per matching stone, resolving to the correct branch each time (Espeon/Umbreon excluded — Branch choice, not an item)", () => {
  const owned = [makeOwned("mon-eevee", "eevee")];

  const fire = getEvolutionItemCandidates("fire-stone", owned);
  const water = getEvolutionItemCandidates("water-stone", owned);
  const thunder = getEvolutionItemCandidates("thunder-stone", owned);
  const leaf = getEvolutionItemCandidates("leaf-stone", owned);
  const ice = getEvolutionItemCandidates("ice-stone", owned);

  assert.deepEqual(fire[0]?.evolvedSpeciesOptions.map((s) => s.id), ["flareon"]);
  assert.deepEqual(water[0]?.evolvedSpeciesOptions.map((s) => s.id), ["vaporeon"]);
  assert.deepEqual(thunder[0]?.evolvedSpeciesOptions.map((s) => s.id), ["jolteon"]);
  // Generation IV (Sinnoh, Phase 2 design correction) — Leafeon/Glaceon are
  // direct evolution-item evolutions (Leaf Stone/Ice Stone), not Branch
  // targets like Espeon/Umbreon.
  assert.deepEqual(leaf[0]?.evolvedSpeciesOptions.map((s) => s.id), ["leafeon"]);
  assert.deepEqual(ice[0]?.evolvedSpeciesOptions.map((s) => s.id), ["glaceon"]);
});

test("former Trade-item evolutions are eligible directly from a kept/remapped item, with no trade of any kind", () => {
  const owned = [makeOwned("mon-onix", "onix"), makeOwned("mon-porygon", "porygon")];

  const metalCoat = getEvolutionItemCandidates("metal-coat", owned);
  const upgrade = getEvolutionItemCandidates("upgrade", owned);

  assert.equal(metalCoat.length, 1);
  assert.deepEqual(metalCoat[0]?.evolvedSpeciesOptions.map((s) => s.id), ["steelix"]);
  assert.equal(upgrade.length, 1);
  assert.deepEqual(upgrade[0]?.evolvedSpeciesOptions.map((s) => s.id), ["porygon2"]);
});

test("Evolution Item Cleanup remapped species: Sneasel (Ice Stone), Electabuzz (Thunder Stone), Magmar (Fire Stone), Gligar (Dusk Stone), Happiny (Moon Stone)", () => {
  const owned = [
    makeOwned("mon-sneasel", "sneasel"),
    makeOwned("mon-electabuzz", "electabuzz"),
    makeOwned("mon-magmar", "magmar"),
    makeOwned("mon-gligar", "gligar"),
    makeOwned("mon-happiny", "happiny"),
  ];

  assert.deepEqual(getEvolutionItemCandidates("ice-stone", owned).map((c) => c.evolvedSpeciesOptions[0]?.id), ["weavile"]);
  assert.deepEqual(getEvolutionItemCandidates("thunder-stone", owned).map((c) => c.evolvedSpeciesOptions[0]?.id), ["electivire"]);
  assert.deepEqual(getEvolutionItemCandidates("fire-stone", owned).map((c) => c.evolvedSpeciesOptions[0]?.id), ["magmortar"]);
  assert.deepEqual(getEvolutionItemCandidates("dusk-stone", owned).map((c) => c.evolvedSpeciesOptions[0]?.id), ["gliscor"]);
  assert.deepEqual(getEvolutionItemCandidates("moon-stone", owned).map((c) => c.evolvedSpeciesOptions[0]?.id), ["chansey"]);
});

test("Clamperl + Water Stone returns one candidate with BOTH branch targets, never auto-picking one", () => {
  const owned = [makeOwned("mon-clamperl", "clamperl")];

  const candidates = getEvolutionItemCandidates("water-stone", owned);

  assert.equal(candidates.length, 1);
  assert.deepEqual(candidates[0]?.evolvedSpeciesOptions.map((s) => s.id).sort(), ["gorebyss", "huntail"]);
});
