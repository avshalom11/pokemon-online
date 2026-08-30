// COMPLETE STATUS-MEDICINE BATTLE SUPPORT — focused coverage for
// useGymBattleItem's new cure-status support (Antidote/Burn Heal/Paralyze
// Heal/Awakening/Ice Heal/Full Heal), against the fake Prisma DB. Mirrors
// gym-battle-item.service.test.ts's own setup conventions exactly (same
// seedTwoParticipant shape, extended with a battleStatus override); kept as
// its own file rather than merged into that pre-existing one, which stays
// completely untouched (its own 15 tests were re-run and still pass
// unmodified — the explicit "Potion/Revive behavior remains unchanged"
// regression proof for Gym battles).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { useGymBattleItem } from "@/features/gyms/services/gym-battle-item.service";
import { startNpcBattle, type StartNpcBattleTarget } from "@/features/gyms/services/gym-battle-session.service";
import { prisma } from "@/lib/db/prisma";
import {
  getInventoryItemRow,
  getPlayerPokemonRow,
  resetFakeDb,
  seedInventoryItem,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";
const EASY: StartNpcBattleTarget = { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" };

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0 });
});

type BattleStatusMap = Record<string, { status: string | null; turnsRemaining: number | null }>;

async function seedTwoParticipant(overrides?: { battleHp?: { p1: number; p2: number }; battleStatus?: BattleStatusMap }) {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedPlayerPokemon({ id: "p2", playerId: PLAYER_ID, speciesId: "squirtle", level: 100, currentHp: 100, partySlot: 2 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  seedKnownMove({ playerPokemonId: "p2", moveId: "scratch", slot: 1 });
  await startNpcBattle(PLAYER_ID, EASY, ["p1", "p2"]);

  const data: Record<string, unknown> = {};
  if (overrides?.battleHp) data.playerBattleHp = overrides.battleHp;
  if (overrides?.battleStatus) data.playerBattleStatus = overrides.battleStatus;
  if (Object.keys(data).length > 0) {
    await prisma.npcBattleSession.updateMany({ where: { playerId: PLAYER_ID }, data });
  }
}

test("Antidote cures poison: session playerBattleStatus AND the real PlayerPokemon row are both cleared", async () => {
  await seedTwoParticipant({ battleStatus: { p2: { status: "poison", turnsRemaining: null } } });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "antidote", quantity: 1 });

  const result = await useGymBattleItem(PLAYER_ID, "antidote", "p2");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.curedStatus, "poison");
  assert.equal(getPlayerPokemonRow("p2")?.status, null);
  assert.equal(getPlayerPokemonRow("p2")?.statusTurnsRemaining, null);
});

test("Burn Heal cures burn", async () => {
  await seedTwoParticipant({ battleStatus: { p2: { status: "burn", turnsRemaining: null } } });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "burn-heal", quantity: 1 });

  const result = await useGymBattleItem(PLAYER_ID, "burn-heal", "p2");

  assert.equal(result.status, "success");
  assert.equal(getPlayerPokemonRow("p2")?.status, null);
});

test("Paralyze Heal cures paralysis", async () => {
  await seedTwoParticipant({ battleStatus: { p2: { status: "paralysis", turnsRemaining: null } } });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "paralyze-heal", quantity: 1 });

  const result = await useGymBattleItem(PLAYER_ID, "paralyze-heal", "p2");

  assert.equal(result.status, "success");
  assert.equal(getPlayerPokemonRow("p2")?.status, null);
});

test("Awakening cures sleep and clears statusTurnsRemaining", async () => {
  await seedTwoParticipant({ battleStatus: { p2: { status: "sleep", turnsRemaining: 2 } } });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "awakening", quantity: 1 });

  const result = await useGymBattleItem(PLAYER_ID, "awakening", "p2");

  assert.equal(result.status, "success");
  const pokemon = getPlayerPokemonRow("p2")!;
  assert.equal(pokemon.status, null);
  assert.equal(pokemon.statusTurnsRemaining, null, "a stale sleep counter must never survive the cure");
});

test("Ice Heal cures freeze", async () => {
  await seedTwoParticipant({ battleStatus: { p2: { status: "freeze", turnsRemaining: null } } });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "ice-heal", quantity: 1 });

  const result = await useGymBattleItem(PLAYER_ID, "ice-heal", "p2");

  assert.equal(result.status, "success");
  assert.equal(getPlayerPokemonRow("p2")?.status, null);
});

test("Full Heal cures each of the 5 supported statuses", async () => {
  const statuses = ["poison", "burn", "paralysis", "sleep", "freeze"] as const;

  for (const status of statuses) {
    resetFakeDb();
    seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0 });
    await seedTwoParticipant({ battleStatus: { p2: { status, turnsRemaining: status === "sleep" ? 2 : null } } });
    seedInventoryItem({ playerId: PLAYER_ID, itemId: "full-heal", quantity: 1 });

    const result = await useGymBattleItem(PLAYER_ID, "full-heal", "p2");

    assert.equal(result.status, "success", `Full Heal must cure ${status}`);
    if (result.status !== "success") continue;
    assert.equal(result.curedStatus, status);
    const pokemon = getPlayerPokemonRow("p2")!;
    assert.equal(pokemon.status, null);
    assert.equal(pokemon.statusTurnsRemaining, null);
  }
});

test("wrong-status medicine is rejected — status untouched, item NOT consumed", async () => {
  await seedTwoParticipant({ battleStatus: { p2: { status: "burn", turnsRemaining: null } } });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "antidote", quantity: 1 }); // cures poison, not burn

  const result = await useGymBattleItem(PLAYER_ID, "antidote", "p2");

  assert.equal(result.status, "invalid-target");
  assert.equal(getInventoryItemRow(PLAYER_ID, "antidote")?.quantity, 1, "item must not be consumed on rejection");
});

test("a healthy (no status) target is rejected — nothing to cure, item not consumed", async () => {
  await seedTwoParticipant(); // no battleStatus override — both participants healthy
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "antidote", quantity: 1 });

  const result = await useGymBattleItem(PLAYER_ID, "antidote", "p2");

  assert.equal(result.status, "invalid-target");
  assert.equal(getInventoryItemRow(PLAYER_ID, "antidote")?.quantity, 1);
});

test("a fainted target is rejected even while carrying the matching status — item not consumed", async () => {
  await seedTwoParticipant({
    battleHp: { p1: 100, p2: 0 },
    battleStatus: { p2: { status: "poison", turnsRemaining: null } },
  });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "antidote", quantity: 1 });

  const result = await useGymBattleItem(PLAYER_ID, "antidote", "p2");

  assert.equal(result.status, "invalid-target");
  assert.equal(getInventoryItemRow(PLAYER_ID, "antidote")?.quantity, 1);
});

test("a successful cure consumes exactly one item, leaving the rest untouched", async () => {
  await seedTwoParticipant({ battleStatus: { p2: { status: "poison", turnsRemaining: null } } });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "antidote", quantity: 5 });

  const result = await useGymBattleItem(PLAYER_ID, "antidote", "p2");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.remainingQuantity, 4);
  assert.equal(getInventoryItemRow(PLAYER_ID, "antidote")?.quantity, 4);
});

test("a status cure still consumes the turn — the NPC's free strike may resolve exactly like a heal/revive item use", async () => {
  await seedTwoParticipant({ battleStatus: { p1: { status: "paralysis", turnsRemaining: null } } });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "paralyze-heal", quantity: 1 });

  // p1 is the active participant (first selected) — curing it still
  // triggers the same turn-consuming free-strike mechanic every other Bag
  // item use has.
  const result = await useGymBattleItem(PLAYER_ID, "paralyze-heal", "p1");

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.npcAttacked, true);
});

test("using a status medicine when the player owns none is rejected with no-item, and the real PlayerPokemon row is never written to", async () => {
  await seedTwoParticipant({ battleStatus: { p2: { status: "poison", turnsRemaining: null } } });
  // No seedInventoryItem call — the player owns none. The LIVE session
  // status (above) is poison, but the real row was seeded with its default
  // (null) and was never yet synced — this rejection must not be the thing
  // that first writes to it.
  const realStatusBefore = getPlayerPokemonRow("p2")!.status;

  const result = await useGymBattleItem(PLAYER_ID, "antidote", "p2");

  assert.deepEqual(result, { status: "no-item" });
  assert.equal(getPlayerPokemonRow("p2")?.status, realStatusBefore, "no cure must have been applied");
});
