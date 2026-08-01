// Focused regression tests for pending-evolution creation — the trigger
// point checked from applyPokemonXpGrant on every wild-battle-victory XP
// grant. Deliberately small (per this phase's own "essential tests only"
// instruction): one test per rule that would silently break the feature,
// not exhaustive coverage of the whole species roster.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { tryCreatePendingEvolution } from "./evolution-progress.service.ts";
import { resetFakeDb, seedPlayerPokemon, getPlayerPokemonRow } from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
});

test("reaching the required level creates one pending evolution", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "charmander", level: 16 });

  const result = await prisma.$transaction((tx) =>
    tryCreatePendingEvolution(tx, "mon-1", "charmander", 16, null, false)
  );

  assert.equal(result, "charmeleon");
  assert.equal(getPlayerPokemonRow("mon-1")?.pendingEvolutionSpeciesId, "charmeleon");
});

test("a repeated check (e.g. a refresh re-triggering the same grant) does not duplicate the pending evolution", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "charmander", level: 16, pendingEvolutionSpeciesId: "charmeleon" });

  const result = await prisma.$transaction((tx) =>
    tryCreatePendingEvolution(tx, "mon-1", "charmander", 16, "charmeleon", false)
  );

  assert.equal(result, null);
  assert.equal(getPlayerPokemonRow("mon-1")?.pendingEvolutionSpeciesId, "charmeleon");
});

test("another owned Pokémon of the same species remains independently eligible", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "charmander", level: 16, evolutionPermanentlyBlocked: true });
  seedPlayerPokemon({ id: "mon-2", playerId: "owner-1", speciesId: "charmander", level: 16 });

  const blocked = await prisma.$transaction((tx) => tryCreatePendingEvolution(tx, "mon-1", "charmander", 16, null, true));
  const eligible = await prisma.$transaction((tx) => tryCreatePendingEvolution(tx, "mon-2", "charmander", 16, null, false));

  assert.equal(blocked, null);
  assert.equal(eligible, "charmeleon");
  assert.equal(getPlayerPokemonRow("mon-1")?.pendingEvolutionSpeciesId, null);
  assert.equal(getPlayerPokemonRow("mon-2")?.pendingEvolutionSpeciesId, "charmeleon");
});

test("a multi-level jump never skips a stage — only the next stage from the current species is offered", async () => {
  // A low-level Charmander that jumped straight to level 40 in one grant
  // already exceeds Charizard's own required level (36), but its CURRENT
  // species is still "charmander" — only Charmeleon (its own next stage)
  // may ever be offered from this check; Charizard is irrelevant until a
  // later, separate call sees speciesId "charmeleon" instead.
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "charmander", level: 40 });

  const result = await prisma.$transaction((tx) => tryCreatePendingEvolution(tx, "mon-1", "charmander", 40, null, false));

  assert.equal(result, "charmeleon");
});

test("a species with no level evolution (e.g. a Stone/Trade-only evolution) never triggers", async () => {
  // Pikachu's only canonical evolution (Raichu) requires a Thunder Stone,
  // not a level — deliberately absent from the Level Evolution table.
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu", level: 50 });

  const result = await prisma.$transaction((tx) => tryCreatePendingEvolution(tx, "mon-1", "pikachu", 50, null, false));

  assert.equal(result, null);
  assert.equal(getPlayerPokemonRow("mon-1")?.pendingEvolutionSpeciesId, null);
});
