// Phase 4F/5A regression tests for the Battle Action Service — the single
// server-side entry point that resolves a player's attack, now with a
// selected Known Move's moveId flowing through it (see
// battle-action.service.ts's own doc comment). Runs the REAL
// executeBattleAction unmodified; only "@/lib/db/prisma" is redirected to
// an in-memory fake (test/support/fakes/prisma.fake.ts — see
// test/support/alias-loader.mjs), since this project has no disposable
// database to run automated tests against and must never run destructive
// tests against the shared live Neon DB.
//
// Run via `npm test` (wires up the alias loader).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { TEMPORARY_ATTACK_DAMAGE } from "@/engine/battle/battle-config";
import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { executeBattleAction, type BattleActionType } from "@/features/battle/services/battle-action.service";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import {
  resetFakeDb,
  seedPlayerPokemon,
  seedKnownMove,
  seedPlayerProfile,
  seedFieldBattleSession,
  getFieldBattleSessionRow,
  getPlayerPokemonRow,
  getPlayerPokemonUpdateCallCount,
} from "../../../test/support/fakes/prisma.fake.ts";

const ZONE_ID = "grassland";

// Level 100 (MAX_POKEMON_LEVEL) so any Pokémon-XP grant in the "wild
// defeated" tests is a guaranteed no-op level-wise (already capped) — this
// keeps those tests from having to also fake a Known Move/learnset level-up
// cascade, which is unrelated, untouched territory for this phase. Known
// two moves by default (growl, scratch) so Phase 5A's "selecting a known
// move succeeds"/"a move known by a different Pokémon is rejected" tests
// have something real to pick from without every test needing its own
// bespoke setup.
function seedMaxLevelActivePokemon(id: string, playerId: string, currentHp: number) {
  const pokemon = seedPlayerPokemon({
    id,
    playerId,
    speciesId: "charmander",
    level: 100,
    experience: 999_999,
    currentHp,
    partySlot: 1,
  });
  seedKnownMove({ playerPokemonId: id, moveId: "growl", slot: 1 });
  seedKnownMove({ playerPokemonId: id, moveId: "scratch", slot: 2 });
  return pokemon;
}

// syncWildHp (battle-session.service.ts, reused unchanged by the Battle
// Action Service) re-derives the wild's max HP from its own species+level
// rather than trusting a stored value, and clamps the persisted HP to it —
// exactly like it always has. Seeding a wildMaxHp inconsistent with that
// real formula would make the *persisted* HP diverge from the value these
// tests assert on, so every wild HP here is derived from the same formula
// the production code uses instead of a guessed constant.
function bulbasaurMaxHpAtLevel(level: number): number {
  const species = getSpeciesById("bulbasaur");
  if (!species) throw new Error("test setup: bulbasaur species not found in the catalog");
  return calculatePokemonHpStat(species.baseStats.health, level);
}

beforeEach(() => {
  resetFakeDb();
});

test("executes an attack: reduces the wild's HP by the fixed damage amount and applies the wild's counter-attack in the same call", async () => {
  const wildMaxHp = bulbasaurMaxHpAtLevel(3);
  seedPlayerProfile({ id: "owner-1", level: 5, experience: 4000 });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: wildMaxHp,
    wildMaxHp,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.moveId, "growl");
  assert.equal(result.playerDamage, TEMPORARY_ATTACK_DAMAGE);
  assert.equal(result.enemyDamage, TEMPORARY_ATTACK_DAMAGE);
  assert.equal(result.updatedWildHp, wildMaxHp - TEMPORARY_ATTACK_DAMAGE);
  assert.equal(result.updatedPartyHp, 100 - TEMPORARY_ATTACK_DAMAGE);
  assert.equal(result.wildFainted, false);
  assert.equal(result.partyPokemonFainted, false);
  assert.equal(result.battleEnded, false);
  assert.equal(result.winner, null);
  assert.equal(result.experienceGranted, null);

  assert.equal(getFieldBattleSessionRow("owner-1")?.wildCurrentHp, wildMaxHp - TEMPORARY_ATTACK_DAMAGE);
  assert.equal(getPlayerPokemonRow("p1")?.currentHp, 100 - TEMPORARY_ATTACK_DAMAGE);
  // Exactly one write to the acting Pokémon's HP — the action was resolved
  // exactly once, not applied twice.
  assert.equal(getPlayerPokemonUpdateCallCount(), 1);
});

test("rejects when there is no battle session for the requested zone", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  // No session seeded at all.

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.deepEqual(result, { status: "no-session" });
});

test("rejects when the session belongs to a different zone", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: "cave",
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.deepEqual(result, { status: "no-session" });
});

test("rejects when the battle is already inactive (the wild has already fainted)", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 0,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
    wildDefeatRewardGranted: true,
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.deepEqual(result, { status: "battle-inactive" });
  assert.equal(getPlayerPokemonUpdateCallCount(), 0);
});

test("rejects when the session's active Pokémon does not belong to this player", async () => {
  seedPlayerProfile({ id: "owner-1" });
  // Deliberately NOT seeding "p1" under owner-1's party at all — simulates a
  // session pointing at a Pokémon this player doesn't (or no longer) own.
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "someone-elses-pokemon",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.deepEqual(result, { status: "not-owned" });
  assert.equal(getFieldBattleSessionRow("owner-1")?.wildCurrentHp, 100, "the wild must be untouched when ownership fails");
});

test("rejects when the active Pokémon has already fainted", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 0);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.deepEqual(result, { status: "invalid-active-pokemon" });
});

test("rejects an unrecognized action type", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "not-a-real-action" as unknown as BattleActionType, "growl");

  assert.deepEqual(result, { status: "invalid-action" });
});

test("defeating the wild grants the reward, ends the encounter without a counter-attack, and reports the player as the winner", async () => {
  seedPlayerProfile({ id: "owner-1", level: 5, experience: 4000 });
  seedMaxLevelActivePokemon("p1", "owner-1", 50);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 2,
    wildCurrentHp: TEMPORARY_ATTACK_DAMAGE,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.updatedWildHp, 0);
  assert.equal(result.wildFainted, true);
  assert.equal(result.enemyDamage, 0);
  assert.equal(result.updatedPartyHp, 50, "no counter-attack lands once the wild has fainted");
  assert.equal(result.partyPokemonFainted, false);
  assert.equal(result.battleEnded, false);
  assert.equal(result.winner, "player");
  assert.ok(result.experienceGranted, "a reward must be granted the first time the wild is defeated");
  assert.ok(result.experienceGranted?.player);
  assert.ok(Array.isArray(result.experienceGranted?.pokemon));

  assert.equal(getFieldBattleSessionRow("owner-1")?.wildDefeatRewardGranted, true);

  // Re-submitting against the now-already-defeated wild must never grant a
  // second reward — the battle is inactive from here until the encounter
  // advances.
  const retry = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");
  assert.deepEqual(retry, { status: "battle-inactive" });
});

test("the wild's counter-attack ending the player's only usable Pokémon ends the battle and deletes the session", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", TEMPORARY_ATTACK_DAMAGE);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.updatedPartyHp, 0);
  assert.equal(result.partyPokemonFainted, true);
  assert.equal(result.battleEnded, true);
  assert.equal(result.winner, "wild");
  assert.equal(getFieldBattleSessionRow("owner-1"), undefined, "the session must be deleted once the whole party is defeated");
});

test("a fainted Pokémon does not end the battle while another party member is still usable", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", TEMPORARY_ATTACK_DAMAGE);
  seedPlayerPokemon({ id: "p2", playerId: "owner-1", speciesId: "squirtle", currentHp: 30, partySlot: 2 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.partyPokemonFainted, true);
  assert.equal(result.battleEnded, false);
  assert.equal(result.winner, null);
  assert.notEqual(getFieldBattleSessionRow("owner-1"), undefined, "the session must survive a single faint while the party still has a usable member");
});

// ===========================================================================
// Phase 5A — moveId validation and pipeline plumbing
// ===========================================================================

test("selecting each of the active Pokémon's known moves succeeds", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100); // knows growl (slot 1) and scratch (slot 2)
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const growlResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");
  assert.equal(growlResult.status, "success");

  const scratchResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch");
  assert.equal(scratchResult.status, "success");
});

test("rejects a moveId that does not exist in the Move Registry", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "not-a-real-move");

  assert.deepEqual(result, { status: "invalid-move", moveId: "not-a-real-move" });
  assert.equal(getPlayerPokemonUpdateCallCount(), 0, "an invalid move must never apply any damage");
});

test("rejects a real registry move the active Pokémon does not actually know", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100); // knows only growl and scratch
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  // "ember" is a real Move Registry entry, but this Pokémon never learned it.
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "ember");

  assert.deepEqual(result, { status: "invalid-move", moveId: "ember" });
});

test("rejects a move that is known, but only by a different Pokémon", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100); // active — knows growl, scratch
  const p2 = seedPlayerPokemon({ id: "p2", playerId: "owner-1", speciesId: "squirtle", currentHp: 30, partySlot: 2 });
  seedKnownMove({ playerPokemonId: p2.id, moveId: "water-gun", slot: 1 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  // "water-gun" is real and known, but only by p2, which isn't the active
  // Pokémon in this session.
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "water-gun");

  assert.deepEqual(result, { status: "invalid-move", moveId: "water-gun" });
});

test("the pipeline carries the selected moveId through to the result unchanged", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.moveId, "scratch");
});

test("every legal known move produces exactly the same fixed damage — the move itself never changes gameplay", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedMaxLevelActivePokemon("p1", "owner-1", 100);
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const growlResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl");
  assert.equal(growlResult.status, "success");
  if (growlResult.status !== "success") return;
  assert.equal(growlResult.playerDamage, TEMPORARY_ATTACK_DAMAGE);
  assert.equal(growlResult.enemyDamage, TEMPORARY_ATTACK_DAMAGE);

  const scratchResult = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch");
  assert.equal(scratchResult.status, "success");
  if (scratchResult.status !== "success") return;
  assert.equal(scratchResult.playerDamage, TEMPORARY_ATTACK_DAMAGE);
  assert.equal(scratchResult.enemyDamage, TEMPORARY_ATTACK_DAMAGE);
});
