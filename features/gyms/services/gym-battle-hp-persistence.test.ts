// HP PERSISTENCE (later task, sections 8/9) — focused coverage for the rule
// change that overrides Phase 3/4's original "battle-local only, always
// starts at full HP" design: Gym/Regional Champion battles now use the
// player's REAL, persistent PlayerPokemon HP/status, never auto-healed on
// start/win/lose/abandon/return. League PvP (LeagueBattleSession) and Field
// Battle must both stay completely unaffected by this rule change.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { executeGymBattleAction } from "@/features/gyms/services/gym-battle-action.service";
import {
  abandonNpcBattleSession,
  startNpcBattle,
  syncParticipantToRealPokemon,
  type StartNpcBattleTarget,
} from "@/features/gyms/services/gym-battle-session.service";
import { prisma } from "@/lib/db/prisma";
import { getPlayerPokemonRow, resetFakeDb, seedKnownMove, seedPlayerPokemon, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";
const EASY: StartNpcBattleTarget = { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" };
const MAX_ROLL = () => 0.999999;
const MIN_ROLL_NO_CRIT = () => 0.05;

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0 });
});

test("a damaging turn immediately persists the player's new HP to the real PlayerPokemon row — no lost update on refresh/re-entry", async () => {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 5, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  await startNpcBattle(PLAYER_ID, EASY, ["p1"]);

  const result = await executeGymBattleAction(PLAYER_ID, "growl", MIN_ROLL_NO_CRIT);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  // The turn didn't end the battle (a single hit at 100 HP survives) — the
  // real row must already reflect the exact same HP the session itself now
  // holds, immediately, not only once the battle later ends.
  assert.equal(getPlayerPokemonRow("p1")?.currentHp, result.updatedPlayerHp);
});

test("real HP at 100/150 becomes 37/150 after a battle — the next attempt starts at 37, not a fresh full heal (explicit spec example)", async () => {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 5, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  const started = await startNpcBattle(PLAYER_ID, EASY, ["p1"]);
  assert.equal(started.status, "started");

  // Simulate the battle ending with the real primitive every action
  // actually uses (syncParticipantToRealPokemon), rather than depending on
  // exact combat-RNG damage — the property under test is the SEEDING rule
  // on the NEXT attempt, not this turn's own damage math (covered
  // elsewhere).
  await prisma.$transaction((tx) => syncParticipantToRealPokemon(tx, "p1", { currentHp: 37, status: null, statusTurnsRemaining: null }));
  await abandonNpcBattleSession(PLAYER_ID);

  const second = await startNpcBattle(PLAYER_ID, EASY, ["p1"]);
  assert.equal(second.status, "started");
  if (second.status !== "started") return;
  const secondBattleHp = second.session.playerBattleHp as unknown as Record<string, number>;
  assert.equal(secondBattleHp.p1, 37, "the second attempt must start at the carried-over real HP, never a fresh full heal");
  assert.equal(getPlayerPokemonRow("p1")?.currentHp, 37);
});

test("victory persists the winning Pokémon's final HP/status to the real PlayerPokemon row", async () => {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  await startNpcBattle(PLAYER_ID, EASY, ["p1"]);

  let final;
  for (let i = 0; i < 3; i++) {
    final = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  }
  const success = final as Extract<Awaited<ReturnType<typeof executeGymBattleAction>>, { status: "success" }>;
  assert.equal(success.victoryCompleted, true);
  assert.equal(getPlayerPokemonRow("p1")?.currentHp, success.updatedPlayerHp);
});

test("a loss persists the fainted Pokémon's real HP at 0 — never a reset-by-losing exploit that secretly restores HP", async () => {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 5, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  await startNpcBattle(PLAYER_ID, EASY, ["p1"]);
  await prisma.npcBattleSession.updateMany({ where: { playerId: PLAYER_ID }, data: { playerBattleHp: { p1: 1 } } });

  const result = await executeGymBattleAction(PLAYER_ID, "growl", MIN_ROLL_NO_CRIT);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.winner, "npc");
  assert.equal(getPlayerPokemonRow("p1")?.currentHp, 0);
});

test("abandoning mid-battle does NOT heal the participant — real HP stays exactly whatever the last synced turn already persisted", async () => {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 5, currentHp: 100, partySlot: 1 });
  seedPlayerPokemon({ id: "p2", playerId: PLAYER_ID, speciesId: "squirtle", level: 100, currentHp: 100, partySlot: 2 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  seedKnownMove({ playerPokemonId: "p2", moveId: "scratch", slot: 1 });
  await startNpcBattle(PLAYER_ID, EASY, ["p1", "p2"]);

  await executeGymBattleAction(PLAYER_ID, "growl", MIN_ROLL_NO_CRIT);
  const hpBeforeAbandon = getPlayerPokemonRow("p1")!.currentHp;
  assert.ok(hpBeforeAbandon < 100, "the turn must have already damaged p1");

  await abandonNpcBattleSession(PLAYER_ID);

  assert.equal(getPlayerPokemonRow("p1")?.currentHp, hpBeforeAbandon, "abandon must not additionally change HP either way");
});

test("only the participating Pokémon's HP is ever touched — an unrelated, non-participating party member stays exactly as seeded", async () => {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 5, currentHp: 100, partySlot: 1 });
  seedPlayerPokemon({ id: "bench", playerId: PLAYER_ID, speciesId: "squirtle", level: 50, currentHp: 77, partySlot: 2 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  await startNpcBattle(PLAYER_ID, EASY, ["p1"]);

  await executeGymBattleAction(PLAYER_ID, "growl", MIN_ROLL_NO_CRIT);

  assert.equal(getPlayerPokemonRow("bench")?.currentHp, 77, "a non-participating Pokémon must never be touched by Gym battle HP sync");
});

test("a status condition applied mid-battle also persists to the real PlayerPokemon row alongside HP", async () => {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 5, currentHp: 100, partySlot: 1, status: "poison", statusTurnsRemaining: 3 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  await startNpcBattle(PLAYER_ID, EASY, ["p1"]);

  const started = await prisma.npcBattleSession.findUnique({ where: { playerId: PLAYER_ID } });
  const statusMap = started!.playerBattleStatus as unknown as Record<string, { status: string | null; turnsRemaining: number | null }>;
  assert.equal(statusMap.p1.status, "poison", "battle-local status must itself be seeded from the real, existing status");

  await executeGymBattleAction(PLAYER_ID, "growl", MIN_ROLL_NO_CRIT);
  assert.equal(getPlayerPokemonRow("p1")?.status, "poison");
});

test("Field Battle isolation: Gym battle service files never reference Field Battle's own HP-sync/reward primitives", async () => {
  const fs = await import("node:fs");
  const combined =
    fs.readFileSync("features/gyms/services/gym-battle-action.service.ts", "utf8") +
    fs.readFileSync("features/gyms/services/gym-battle-session.service.ts", "utf8") +
    fs.readFileSync("features/gyms/services/gym-battle-item.service.ts", "utf8") +
    fs.readFileSync("features/gyms/services/gym-battle-switch.service.ts", "utf8") +
    fs.readFileSync("features/gyms/services/gym-battle-solo-strike.service.ts", "utf8");

  for (const forbidden of ["applyWildHpSync", "rollAndAwardEgg", "rollAndAwardChest", "grantFieldBattleCurrencyRewards"]) {
    assert.ok(!combined.includes(forbidden), `Gym battle code must never reference Field Battle's own ${forbidden}`);
  }
});

test("League PvP isolation: League battle service files never reference the Gym HP-persistence primitive — League PvP stays battle-local, never real permanent damage", async () => {
  const fs = await import("node:fs");
  const combined =
    fs.readFileSync("features/leagues/services/league-battle-action.service.ts", "utf8") +
    fs.readFileSync("features/leagues/services/league-battle-session.service.ts", "utf8");

  assert.ok(!combined.includes("syncParticipantToRealPokemon"), "League PvP must never call the Gym-only real-HP sync primitive");
  assert.ok(!combined.includes("gym-battle-session.service"), "League PvP must never import from the Gym battle session service");
});
