// FIELD BATTLE MOVE LEARNING — POKÉMON NAME IN COPY: the pending-move view
// model must always carry the owning Pokémon's real display name (nickname,
// falling back to species name — same precedent every other party/Known
// Moves surface already uses), resolved server-side from the real Species
// Registry, never hardcoded in a component. Real behavioral checks run the
// actual view-service layer against the in-memory fake DB, same convention
// as move-learning-ux.test.ts.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getFirstPendingMoveLearningView, getPendingMoveLearningView } from "@/features/move-learning/move-learning-view.service";
import { resetFakeDb, seedKnownMove, seedPendingMove, seedPlayerPokemon } from "../../test/support/fakes/prisma.fake.ts";

const FOUR_KNOWN_MOVES = ["growl", "scratch", "ember", "smokescreen"] as const;

function seedFullyKnownCharmander(playerPokemonId: string, playerId: string, nickname?: string | null) {
  seedPlayerPokemon({ id: playerPokemonId, playerId, speciesId: "charmander", nickname: nickname ?? null });
  FOUR_KNOWN_MOVES.forEach((moveId, index) => {
    seedKnownMove({ playerPokemonId, moveId, slot: index + 1 });
  });
}

beforeEach(() => {
  resetFakeDb();
});

test("pokemonName falls back to the real species name (from the Species Registry, never hardcoded) when the Pokémon has no nickname", async () => {
  seedFullyKnownCharmander("p1", "owner-1");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });

  const view = await getPendingMoveLearningView("p1");
  const realSpecies = getSpeciesById("charmander")!;

  assert.equal(view.pokemonName, realSpecies.name);
});

test("pokemonName uses the nickname instead of the species name when one is set", async () => {
  seedFullyKnownCharmander("p1", "owner-1", "Sparky");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });

  const view = await getPendingMoveLearningView("p1");
  assert.equal(view.pokemonName, "Sparky");
});

test("the account-wide Home-safety-net view (getFirstPendingMoveLearningView) carries the same pokemonName", async () => {
  seedFullyKnownCharmander("p1", "owner-1", "Sparky");
  seedPendingMove({ id: "pend1", playerPokemonId: "p1", moveId: "dragon-rage", learnedAtLevel: 16 });

  const view = await getFirstPendingMoveLearningView("owner-1");
  assert.equal(view?.pokemonName, "Sparky");
});
