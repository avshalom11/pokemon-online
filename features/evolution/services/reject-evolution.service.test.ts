// Focused regression tests for rejecting an evolution — permanent, and
// scoped to exactly the one PlayerPokemon instance rejected.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { rejectEvolution } from "./reject-evolution.service.ts";
import { tryCreatePendingEvolution } from "./evolution-progress.service.ts";
import { resetFakeDb, seedPlayerPokemon, getPlayerPokemonRow } from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
});

test("rejecting permanently blocks future evolution for that PlayerPokemon", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "charmander", level: 16, pendingEvolutionSpeciesId: "charmeleon" });

  const result = await rejectEvolution("owner-1", "mon-1");

  assert.equal(result.status, "success");
  const row = getPlayerPokemonRow("mon-1");
  assert.equal(row?.speciesId, "charmander", "species left unchanged");
  assert.equal(row?.pendingEvolutionSpeciesId, null);
  assert.equal(row?.evolutionPermanentlyBlocked, true);

  // Simulates the same Pokémon reaching (or already having reached, in one
  // multi-level grant) a later stage's own level — must never be offered
  // again, not even for that later stage of the same evolutionary family.
  const laterAttempt = await prisma.$transaction((tx) =>
    tryCreatePendingEvolution(tx, "mon-1", "charmander", 99, row?.pendingEvolutionSpeciesId ?? null, true)
  );
  assert.equal(laterAttempt, null);
});

test("an unauthorized player cannot reject another player's pending evolution", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "charmander", level: 16, pendingEvolutionSpeciesId: "charmeleon" });

  const result = await rejectEvolution("intruder-1", "mon-1");

  assert.equal(result.status, "not-owned");
  assert.equal(getPlayerPokemonRow("mon-1")?.evolutionPermanentlyBlocked, false, "unaffected by the unauthorized attempt");
});

test("rejecting without a pending evolution is rejected", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "charmander", level: 16 });

  const result = await rejectEvolution("owner-1", "mon-1");

  assert.equal(result.status, "no-pending-evolution");
});
