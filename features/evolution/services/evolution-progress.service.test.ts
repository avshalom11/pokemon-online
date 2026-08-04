// Focused regression tests for pending-evolution creation — the trigger
// point checked from applyPokemonXpGrant on every wild-battle-victory XP
// grant — and for the Branch Evolution choice step. Deliberately small (per
// this phase's own "essential tests only" instruction): one test per rule
// that would silently break the feature, not exhaustive coverage of the
// whole species roster.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { chooseEvolutionBranch, tryCreatePendingEvolution } from "./evolution-progress.service.ts";
import { resetFakeDb, seedPlayerPokemon, getPlayerPokemonRow } from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
});

test("reaching the required level creates one pending evolution", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "charmander", level: 16 });

  const result = await prisma.$transaction((tx) => tryCreatePendingEvolution(tx, "mon-1", "charmander", 16, null, false, false));

  assert.deepEqual(result, { pendingEvolutionSpeciesId: "charmeleon", pendingEvolutionBranch: false });
  assert.equal(getPlayerPokemonRow("mon-1")?.pendingEvolutionSpeciesId, "charmeleon");
});

test("a repeated check (e.g. a refresh re-triggering the same grant) does not duplicate the pending evolution", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "charmander", level: 16, pendingEvolutionSpeciesId: "charmeleon" });

  const result = await prisma.$transaction((tx) => tryCreatePendingEvolution(tx, "mon-1", "charmander", 16, "charmeleon", false, false));

  assert.deepEqual(result, { pendingEvolutionSpeciesId: null, pendingEvolutionBranch: false });
  assert.equal(getPlayerPokemonRow("mon-1")?.pendingEvolutionSpeciesId, "charmeleon");
});

test("another owned Pokémon of the same species remains independently eligible", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "charmander", level: 16, evolutionPermanentlyBlocked: true });
  seedPlayerPokemon({ id: "mon-2", playerId: "owner-1", speciesId: "charmander", level: 16 });

  const blocked = await prisma.$transaction((tx) => tryCreatePendingEvolution(tx, "mon-1", "charmander", 16, null, false, true));
  const eligible = await prisma.$transaction((tx) => tryCreatePendingEvolution(tx, "mon-2", "charmander", 16, null, false, false));

  assert.equal(blocked.pendingEvolutionSpeciesId, null);
  assert.equal(eligible.pendingEvolutionSpeciesId, "charmeleon");
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

  const result = await prisma.$transaction((tx) => tryCreatePendingEvolution(tx, "mon-1", "charmander", 40, null, false, false));

  assert.equal(result.pendingEvolutionSpeciesId, "charmeleon");
});

test("a species with no level evolution (e.g. an evolution-item-only species) never triggers", async () => {
  // Pikachu's only canonical evolution (Raichu) requires a Thunder Stone,
  // not a level — deliberately absent from the Level Evolution table.
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "pikachu", level: 50 });

  const result = await prisma.$transaction((tx) => tryCreatePendingEvolution(tx, "mon-1", "pikachu", 50, null, false, false));

  assert.deepEqual(result, { pendingEvolutionSpeciesId: null, pendingEvolutionBranch: false });
  assert.equal(getPlayerPokemonRow("mon-1")?.pendingEvolutionSpeciesId, null);
});

test("former Friendship evolutions now trigger from level alone, with no friendship gate", async () => {
  // Golbat's Generation II evolution (Crobat) used to require Friendship;
  // it's now a plain level evolution — level 36, not 16, so it never
  // collides with Zubat's own real level-22 evolution into Golbat (see
  // pokemon-evolutions.ts's own doc comment on golbat's LEVEL_EVOLUTIONS
  // entry).
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "golbat", level: 36 });

  const result = await prisma.$transaction((tx) => tryCreatePendingEvolution(tx, "mon-1", "golbat", 36, null, false, false));

  assert.equal(result.pendingEvolutionSpeciesId, "crobat");
});

test("a species with a level-stat branch (Tyrogue) resolves from its own calculated Attack/Defense at level 20", async () => {
  // Tyrogue's base stats are perfectly even (35/35/35/35/35/35), so its
  // calculated Attack and Defense stay equal at every level — this exercises
  // the "equal" branch (Hitmontop) deterministically, without needing a
  // second species with lopsided Attack/Defense just to prove the other two
  // branches also exist (resolveLevelStatEvolutionTarget's own unit
  // coverage in pokemon-evolutions.test.ts covers those directly).
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "tyrogue", level: 20 });

  const result = await prisma.$transaction((tx) => tryCreatePendingEvolution(tx, "mon-1", "tyrogue", 20, null, false, false));

  assert.equal(result.pendingEvolutionSpeciesId, "hitmontop");
});

test("Eevee reaching level 16 sets a pending BRANCH choice, never an automatic single target", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "eevee", level: 16 });

  const result = await prisma.$transaction((tx) => tryCreatePendingEvolution(tx, "mon-1", "eevee", 16, null, false, false));

  assert.deepEqual(result, { pendingEvolutionSpeciesId: null, pendingEvolutionBranch: true });
  const row = getPlayerPokemonRow("mon-1");
  assert.equal(row?.pendingEvolutionSpeciesId, null);
  assert.equal(row?.pendingEvolutionBranch, true);
});

test("an Eevee that already has a pending branch choice does not get a second one", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "eevee", level: 16, pendingEvolutionBranch: true });

  const result = await prisma.$transaction((tx) => tryCreatePendingEvolution(tx, "mon-1", "eevee", 16, null, true, false));

  assert.deepEqual(result, { pendingEvolutionSpeciesId: null, pendingEvolutionBranch: false });
});

test("chooseEvolutionBranch turns a pending branch into a normal single-target pending evolution", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "eevee", level: 16, pendingEvolutionBranch: true });

  const result = await chooseEvolutionBranch("owner-1", "mon-1", "umbreon");

  assert.deepEqual(result, { status: "success", chosenSpeciesId: "umbreon" });
  const row = getPlayerPokemonRow("mon-1");
  assert.equal(row?.pendingEvolutionSpeciesId, "umbreon");
  assert.equal(row?.pendingEvolutionBranch, false);
  assert.equal(row?.speciesId, "eevee", "choosing a branch never evolves the Pokémon by itself");
});

test("chooseEvolutionBranch rejects a target that isn't one of the species' own canonical branch targets", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "eevee", level: 16, pendingEvolutionBranch: true });

  const result = await chooseEvolutionBranch("owner-1", "mon-1", "flareon");

  assert.equal(result.status, "invalid-target");
  const row = getPlayerPokemonRow("mon-1");
  assert.equal(row?.pendingEvolutionSpeciesId, null);
  assert.equal(row?.pendingEvolutionBranch, true, "an invalid choice never clears the pending branch state");
});

test("chooseEvolutionBranch is rejected when there is no pending branch to choose", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "eevee", level: 16 });

  const result = await chooseEvolutionBranch("owner-1", "mon-1", "espeon");

  assert.equal(result.status, "no-pending-branch");
});

test("an unauthorized player cannot choose another player's branch evolution", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: "owner-1", speciesId: "eevee", level: 16, pendingEvolutionBranch: true });

  const result = await chooseEvolutionBranch("intruder-1", "mon-1", "espeon");

  assert.equal(result.status, "not-owned");
  assert.equal(getPlayerPokemonRow("mon-1")?.pendingEvolutionBranch, true, "unaffected by the unauthorized attempt");
});
