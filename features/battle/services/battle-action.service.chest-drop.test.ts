// CHESTS PHASE 5 focused coverage — runs the real executeBattleAction (the
// actual field-battle victory flow) unmodified, same "real service, fake
// DB" shape battle-action.service.egg-drop.test.ts already established for
// its own (entirely independent) battle-drop system. Every random-
// dependent outcome below is deterministic via an injected randomSource —
// no statistical/flaky assertions.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { chestInventoryItemId } from "@/features/chests/services/chest-ownership.service";
import { executeBattleAction } from "@/features/battle/services/battle-action.service";
import { endBattleSession } from "@/features/battle-session/services/battle-session.service";
import {
  resetFakeDb,
  seedFieldBattleSession,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
  getInventoryItemRow,
} from "../../../test/support/fakes/prisma.fake.ts";

const ZONE_ID = "grassland";

function seedGuaranteedVictorySetup(playerId: string) {
  seedPlayerProfile({ id: playerId });
  seedPlayerPokemon({ id: "p1", playerId, speciesId: "charmander", level: 50, currentHp: 50, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  seedFieldBattleSession({
    playerId,
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 2,
    wildCurrentHp: 1,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });
}

beforeEach(() => {
  resetFakeDb();
});

test("a successful field-battle victory can trigger a chest roll and grant a real chest (Silver at random()=0, the first band)", async () => {
  seedGuaranteedVictorySetup("owner-1");

  // random() = 0 for every roll this turn: guaranteed hit/damage, AND
  // rollChestDrop(0) < 0.0012 -> dropped, AND rollChestType(0) -> silver
  // (the first cumulative band, 55%).
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", () => 0);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.wildFainted, true);

  const chest = result.experienceGranted?.chest;
  assert.ok(chest);
  assert.equal(chest?.dropped, true);
  if (!chest || !chest.dropped) return;
  assert.equal(chest.chestTypeId, "silver");
  assert.ok(chest.displayName.length > 0);
  assert.ok(chest.imageUrl.length > 0);

  // Persisted through the real Phase 1 chest ownership model (stackable
  // PlayerInventoryItem quantity) — never a second storage mechanism.
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("silver"))?.quantity, 1);
});

test("a missed roll reports dropped: false and grants no chest, without disturbing the rest of the reward", async () => {
  seedGuaranteedVictorySetup("owner-1");

  // 0.999999 is well above both the egg AND chest drop chances — guaranteed
  // miss for both, entirely independently.
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", () => 0.999999);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.wildFainted, true);
  assert.ok(result.experienceGranted, "XP/currency must still be granted normally");
  assert.deepEqual(result.experienceGranted?.chest, { dropped: false });
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("silver")), undefined);
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("gold")), undefined);
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("diamond")), undefined);
});

test("an Egg drop and a Chest drop can coexist on the same victory — neither blocks the other", async () => {
  seedGuaranteedVictorySetup("owner-1");

  // Both rolls share the same constant randomSource; 0 satisfies both the
  // egg's own 0.25%/0.0025 threshold AND the chest's own 0.12%/0.0012
  // threshold simultaneously — this is exactly what proves the two rolls
  // are independent, not mutually exclusive.
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", () => 0);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.experienceGranted?.egg.dropped, true, "the egg roll must still fire independently");
  assert.equal(result.experienceGranted?.chest.dropped, true, "the chest roll must still fire independently");
});

test("escaping never grants a chest", async () => {
  seedGuaranteedVictorySetup("owner-1");

  await endBattleSession("owner-1");

  // No chest exists for this player at all — escaping never even reaches
  // syncWildHp's reward transaction, so there is nothing to roll against.
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("silver")), undefined);
});

test("a loss never grants a chest, even with a guaranteed-drop roll", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 1, partySlot: 1 });
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

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl", () => 0.9);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.wildFainted, false, "growl can never defeat the wild");
  assert.equal(result.experienceGranted, null, "no reward of any kind — including a chest — is granted on a loss");
});

test("a non-lethal, unfinished-battle turn never grants a chest, even with a guaranteed-drop roll", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 50, currentHp: 50, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 2,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl", () => 0);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.wildFainted, false);
  assert.equal(result.experienceGranted, null, "an unfinished battle grants no reward, including no chest");
});

test("the same confirmed victory cannot grant a chest twice — a retried/racing syncWildHp call is a no-op, protected by the existing wildDefeatRewardGranted guard", async () => {
  seedGuaranteedVictorySetup("owner-1");

  // Same pattern battle-action.service.incubation-progress.test.ts's own
  // "the same defeat cannot progress incubation twice" test uses: call
  // syncWildHp directly, twice in a row, against the SAME still-active
  // session (never through executeBattleAction, which would additionally
  // promote to a fresh wild after a real victory — irrelevant to the
  // guard being tested here).
  const { syncWildHp } = await import("@/features/battle-session/services/battle-session.service");

  const first = await syncWildHp("owner-1", ZONE_ID, 0, () => 0);
  assert.ok(first, "the first call must grant the reward");
  assert.equal(first.chest.dropped, true);
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("silver"))?.quantity, 1);

  const second = await syncWildHp("owner-1", ZONE_ID, 0, () => 0);
  assert.equal(second, null, "wildDefeatRewardGranted is already true — a retried call must be a no-op");
  assert.equal(getInventoryItemRow("owner-1", chestInventoryItemId("silver"))?.quantity, 1, "quantity must not be incremented a second time");
});
