// TURN SAFETY / RACE GUARD (GYM BATTLE POLISH task, section 2) — focused,
// cross-service coverage for the exact race combinations the spec calls
// out by name: attack+item, attack+switch, item+switch (double item and
// double switch are covered in their own dedicated test files, alongside
// their other focused coverage). Every action reads the session ONCE,
// then guards its own first write with the exact `updatedAt` snapshot it
// read — see gym-battle-session.service.ts's guardedSessionUpdate/
// guardedSessionDelete. Two genuinely concurrent requests fired via
// Promise.all (never awaited between them) reproduce the same
// interleaving a real double-click/double-request would.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { executeGymBattleAction } from "@/features/gyms/services/gym-battle-action.service";
import { useGymBattleItem } from "@/features/gyms/services/gym-battle-item.service";
import { voluntarySwitchNpcBattleActivePokemon } from "@/features/gyms/services/gym-battle-switch.service";
import { startNpcBattle, type StartNpcBattleTarget } from "@/features/gyms/services/gym-battle-session.service";
import { resetFakeDb, seedInventoryItem, seedKnownMove, seedPlayerPokemon, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";
const EASY: StartNpcBattleTarget = { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" };
const MAX_ROLL = () => 0.999999;

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0 });
});

async function seedThreeParticipant() {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedPlayerPokemon({ id: "p2", playerId: PLAYER_ID, speciesId: "squirtle", level: 100, currentHp: 100, partySlot: 2 });
  seedPlayerPokemon({ id: "p3", playerId: PLAYER_ID, speciesId: "bulbasaur", level: 100, currentHp: 100, partySlot: 3 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  seedKnownMove({ playerPokemonId: "p2", moveId: "scratch", slot: 1 });
  seedKnownMove({ playerPokemonId: "p3", moveId: "scratch", slot: 1 });
  await startNpcBattle(PLAYER_ID, EASY, ["p1", "p2", "p3"]);
}

function statusesOf(results: readonly { status: string }[]): string[] {
  return results.map((r) => r.status).sort();
}

test("attack+switch race: a concurrent attack and voluntary switch — exactly one lands, the other is rejected as stale-action", async () => {
  await seedThreeParticipant();
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "potion", quantity: 1 });

  const [attackResult, switchResult] = await Promise.all([
    executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL),
    voluntarySwitchNpcBattleActivePokemon(PLAYER_ID, "p2", MAX_ROLL),
  ]);

  const statuses = statusesOf([attackResult, switchResult]);
  assert.deepEqual(statuses, ["stale-action", "success"], `expected exactly one success and one stale-action, got ${JSON.stringify(statuses)}`);
});

test("attack+item race: a concurrent attack and Bag item use — exactly one lands, the other is rejected as stale-action", async () => {
  await seedThreeParticipant();
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "potion", quantity: 1 });

  const [attackResult, itemResult] = await Promise.all([
    executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL),
    useGymBattleItem(PLAYER_ID, "potion", "p2"),
  ]);

  const statuses = statusesOf([attackResult, itemResult]);
  assert.deepEqual(statuses, ["stale-action", "success"], `expected exactly one success and one stale-action, got ${JSON.stringify(statuses)}`);
});

test("item+switch race: a concurrent Bag item use and voluntary switch — exactly one lands, the other is rejected as stale-action", async () => {
  await seedThreeParticipant();
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "potion", quantity: 1 });

  const [itemResult, switchResult] = await Promise.all([
    useGymBattleItem(PLAYER_ID, "potion", "p2"),
    voluntarySwitchNpcBattleActivePokemon(PLAYER_ID, "p3", MAX_ROLL),
  ]);

  const statuses = statusesOf([itemResult, switchResult]);
  assert.deepEqual(statuses, ["stale-action", "success"], `expected exactly one success and one stale-action, got ${JSON.stringify(statuses)}`);
});
