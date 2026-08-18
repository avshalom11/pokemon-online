// BAG DURING GYM BATTLE (later task, section 4) — focused coverage for
// useGymBattleItem: real inventory ownership/consumption, Potions/Revive/
// Max Revive only, target-legality rules, and the "using an item also
// consumes the turn" mechanic shared with voluntary switch.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { useGymBattleItem } from "@/features/gyms/services/gym-battle-item.service";
import { startNpcBattle, type StartNpcBattleTarget } from "@/features/gyms/services/gym-battle-session.service";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { prisma } from "@/lib/db/prisma";
import {
  getInventoryItemRow,
  getNpcBattleSessionRow,
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

function expectedMaxHp(speciesId: string, level: number): number {
  const species = getSpeciesById(speciesId)!;
  return calculatePokemonHpStat(species.baseStats.health, level);
}

async function seedTwoParticipant(battleHp?: { p1: number; p2: number }) {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedPlayerPokemon({ id: "p2", playerId: PLAYER_ID, speciesId: "squirtle", level: 100, currentHp: 100, partySlot: 2 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  seedKnownMove({ playerPokemonId: "p2", moveId: "scratch", slot: 1 });
  await startNpcBattle(PLAYER_ID, EASY, ["p1", "p2"]);
  if (battleHp) {
    await prisma.npcBattleSession.updateMany({ where: { playerId: PLAYER_ID }, data: { playerBattleHp: battleHp } });
  }
}

test("no-session when no battle is active", async () => {
  const result = await useGymBattleItem(PLAYER_ID, "potion", "p1");
  assert.deepEqual(result, { status: "no-session" });
});

test("a Poké Ball (non-potion category) is rejected — Bag during Gym battle is Potions/Revive/Max Revive only", async () => {
  await seedTwoParticipant();
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "poke-ball", quantity: 5 });
  const result = await useGymBattleItem(PLAYER_ID, "poke-ball", "p1");
  assert.deepEqual(result, { status: "invalid-item" });
});

test("a target that isn't a participant in this battle is rejected", async () => {
  await seedTwoParticipant();
  seedPlayerPokemon({ id: "bench", playerId: PLAYER_ID, speciesId: "bulbasaur", level: 50, currentHp: 30, partySlot: 3 });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "potion", quantity: 1 });
  const result = await useGymBattleItem(PLAYER_ID, "potion", "bench");
  assert.deepEqual(result, { status: "not-participant" });
});

test("using a heal item when the player owns none is rejected with no-item, and nothing is consumed/changed", async () => {
  await seedTwoParticipant({ p1: 50, p2: 100 });
  const realHpBefore = getPlayerPokemonRow("p1")!.currentHp;
  const result = await useGymBattleItem(PLAYER_ID, "potion", "p1");
  assert.deepEqual(result, { status: "no-item" });
  // The rejection happens before any HP write — the real Pokémon's HP must
  // stay exactly whatever it already was (the battle-local override above
  // never touches the real row on its own), never silently healed.
  assert.equal(getPlayerPokemonRow("p1")?.currentHp, realHpBefore, "no heal must have been applied");
});

test("a heal item cannot target an already-fainted participant", async () => {
  await seedTwoParticipant({ p1: 100, p2: 0 });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "potion", quantity: 1 });
  const result = await useGymBattleItem(PLAYER_ID, "potion", "p2");
  assert.deepEqual(result, { status: "invalid-target" });
});

test("a Revive can only target an already-fainted participant, never a living one", async () => {
  await seedTwoParticipant();
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "revive", quantity: 1 });
  const result = await useGymBattleItem(PLAYER_ID, "revive", "p1");
  assert.deepEqual(result, { status: "invalid-target" });
});

// BAG / VOLUNTARY SWITCH — PLAYER TURN ONLY (GYM BATTLE POLISH task,
// section 2) — the Bag is unavailable while the currently-active
// participant has already fainted, EVEN for a legal Revive targeting a
// DIFFERENT, already-fainted bench Pokémon — the only valid action then is
// the separate, free forced-replacement flow.
test("Bag is rejected with forced-replacement-pending once the active participant has fainted, regardless of the target chosen", async () => {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedPlayerPokemon({ id: "p2", playerId: PLAYER_ID, speciesId: "squirtle", level: 100, currentHp: 100, partySlot: 2 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  seedKnownMove({ playerPokemonId: "p2", moveId: "scratch", slot: 1 });
  await startNpcBattle(PLAYER_ID, EASY, ["p1", "p2"]);
  await prisma.npcBattleSession.updateMany({ where: { playerId: PLAYER_ID }, data: { playerBattleHp: { p1: 0, p2: 0 } } });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "revive", quantity: 1 });

  const result = await useGymBattleItem(PLAYER_ID, "revive", "p2");
  assert.deepEqual(result, { status: "forced-replacement-pending" });
  // Nothing consumed.
  assert.equal(getInventoryItemRow(PLAYER_ID, "revive")?.quantity, 1);
});

test("using a heal potion consumes exactly 1, heals by the item's own healPercent, and persists the result to the real Pokémon", async () => {
  await seedTwoParticipant({ p1: 100, p2: 50 });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "potion", quantity: 3 });

  // Heal p2 — the NON-active participant (p1, first selected, is the
  // active one) — so the item's own turn-consuming free strike (section 4,
  // shared with voluntary switch) lands on p1, never touching p2's just-
  // healed HP; this keeps the expected value exact rather than an
  // inequality (see the dedicated "consumes the turn" test below for the
  // active-participant case, where the post-heal HP can only be asserted
  // as <= the healed value for exactly this reason).
  const maxHp = expectedMaxHp("squirtle", 100);
  const expectedNewHp = Math.min(maxHp, 50 + Math.round(maxHp * 0.2));

  const result = await useGymBattleItem(PLAYER_ID, "potion", "p2");
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.newHp, expectedNewHp);
  assert.equal(result.remainingQuantity, 2);
  assert.equal(getInventoryItemRow(PLAYER_ID, "potion")?.quantity, 2);
  assert.equal(getPlayerPokemonRow("p2")?.currentHp, expectedNewHp);
  // ATTACK SOUND (later task, section 3) — the client's own signal for
  // whether to play the NPC's attack sound after this item use; always
  // true here since the NPC team is never empty in this fixture.
  assert.equal(result.npcAttacked, true);
});

test("using a Revive on a fainted participant revives it to healPercent of max HP and persists to the real Pokémon", async () => {
  await seedTwoParticipant({ p1: 100, p2: 0 });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "revive", quantity: 1 });

  const expectedRevivedHp = Math.floor(expectedMaxHp("squirtle", 100) * 0.5);
  const result = await useGymBattleItem(PLAYER_ID, "revive", "p2");
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.newHp, expectedRevivedHp);
  assert.equal(getPlayerPokemonRow("p2")?.currentHp, expectedRevivedHp);
});

test("using an item on the active participant consumes the turn: the NPC's free strike may lower its HP below the just-applied heal", async () => {
  await seedTwoParticipant({ p1: 50, p2: 100 });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "max-potion", quantity: 1 });

  const result = await useGymBattleItem(PLAYER_ID, "max-potion", "p1");
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const maxHp = expectedMaxHp("charmander", 100);
  assert.equal(result.newHp, maxHp, "max-potion must heal to full before the free strike is applied");
  const realHp = getPlayerPokemonRow("p1")!.currentHp;
  assert.ok(realHp <= maxHp, "the real HP after the NPC's free strike can never exceed the post-heal max");
});

test("the item-use transaction is atomic: even when the free strike ends the battle, the item consumption and HP sync both commit", async () => {
  await seedTwoParticipant({ p1: 1, p2: 100 });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "potion", quantity: 1 });

  // Healing p2 (the bench Pokémon) leaves p1 (1 HP, active) exposed to the
  // free strike, which is very likely to faint it and end the battle —
  // either way, the item consumption itself must always commit.
  const result = await useGymBattleItem(PLAYER_ID, "potion", "p2");
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.remainingQuantity, 0);
  // Reaching quantity 0 deletes the row entirely (removeInventoryItem's own
  // rule) — the row itself is gone, never left behind at quantity:0.
  assert.equal(getInventoryItemRow(PLAYER_ID, "potion"), undefined);
  if (result.battleEnded) {
    assert.equal(getNpcBattleSessionRow(PLAYER_ID), undefined);
  }
});

// TURN SAFETY / RACE GUARD (GYM BATTLE POLISH task, section 2) — double
// item: two genuinely concurrent uses of the SAME item, fired without
// awaiting between them, must never both succeed and doubly-consume/doubly
// -heal off the same stale snapshot.
test("double item: two concurrent Bag item uses — exactly one succeeds, the other is rejected as stale-action, and only one item is consumed", async () => {
  await seedTwoParticipant({ p1: 100, p2: 50 });
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "potion", quantity: 3 });

  const [resultA, resultB] = await Promise.all([useGymBattleItem(PLAYER_ID, "potion", "p2"), useGymBattleItem(PLAYER_ID, "potion", "p2")]);

  const statuses = [resultA.status, resultB.status].sort();
  assert.deepEqual(statuses, ["stale-action", "success"], `expected exactly one success and one stale-action, got ${JSON.stringify(statuses)}`);
  // Only the winning call's own single consumption ever lands — never two.
  assert.equal(getInventoryItemRow(PLAYER_ID, "potion")?.quantity, 2);
});
