// Phase 4F/5A regression tests for the Battle Action Server Action — the
// dedicated entry point BattleContent now calls instead of computing
// damage itself, now also carrying the player's selected moveId (see
// battle-action.action.ts's own doc comment). Runs the REAL
// executeBattleActionAction unmodified; "@/lib/db/prisma" and
// "@/lib/auth/auth-session"/"@/lib/auth/player-profile" are redirected to
// in-memory fakes by test/support/alias-loader.mjs, for the same reasons
// as every other persistence test in this project (see
// ../services/battle-action.service.persistence.test.ts).
//
// Run via `npm test` (wires up the alias loader).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { TEMPORARY_ATTACK_DAMAGE } from "@/engine/battle/battle-config";
import { executeBattleActionAction } from "@/features/battle/actions/battle-action.action";
import { __setSession } from "../../../test/support/fakes/auth-session.fake.ts";
import {
  resetFakeDb,
  seedPlayerPokemon,
  seedKnownMove,
  seedPlayerProfile,
  seedFieldBattleSession,
} from "../../../test/support/fakes/prisma.fake.ts";

const ZONE_ID = "grassland";

beforeEach(() => {
  resetFakeDb();
  __setSession({ user: { id: "owner-1" } });
});

test("rejects when there is no authenticated session", async () => {
  __setSession(null);

  const result = await executeBattleActionAction(ZONE_ID, "attack", "growl");

  assert.deepEqual(result, { status: "no-session" });
});

test("rejects a malformed action type via schema validation, without reaching the service", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", level: 100, experience: 999_999, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleActionAction(ZONE_ID, "move-selection-not-implemented", "growl");

  assert.deepEqual(result, { status: "invalid-action" });
});

test("rejects a missing/empty moveId via schema validation", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", level: 100, experience: 999_999, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleActionAction(ZONE_ID, "attack", "");

  assert.deepEqual(result, { status: "invalid-action" });
});

test("resolves a valid, authenticated, owned attack with a real known move and returns the Battle Action Service's result", async () => {
  seedPlayerProfile({ id: "owner-1", level: 5, experience: 4000 });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", level: 100, experience: 999_999, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleActionAction(ZONE_ID, "attack", "growl");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.moveId, "growl");
  // Phase 5B.2: growl is a status move, so it now resolves through the
  // Damage Engine's non-damaging result — the wild's HP is untouched. The
  // wild's own counter-attack is still the unchanged fixed amount.
  assert.equal(result.updatedWildHp, 100);
  assert.equal(result.updatedPartyHp, 100 - TEMPORARY_ATTACK_DAMAGE);
});

test("rejects a moveId the active Pokémon does not know, even though the session is otherwise valid", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", level: 100, experience: 999_999, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleActionAction(ZONE_ID, "attack", "hydro-pump");

  assert.deepEqual(result, { status: "invalid-move", moveId: "hydro-pump" });
});

test("rejects a request whose session player does not own the session's active Pokémon", async () => {
  // The session (owner-1) is authenticated, but the FieldBattleSession row
  // itself belongs to a different player's id — never trust the client to
  // only ever ask for its own battle.
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", level: 100, experience: 999_999, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  seedFieldBattleSession({
    playerId: "someone-else",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleActionAction(ZONE_ID, "attack", "growl");

  assert.deepEqual(result, { status: "no-session" });
});
