// Focused regression coverage for EGGS PHASE 1's active-incubation
// persistence layer — runs the real startIncubatingEgg/listActiveIncubations
// /isIncubationReady unmodified against the in-memory fake DB, same "real
// service, fake DB" shape every other persistence-layer test in this
// project already follows. Phase 3's battle-progress increments are
// deliberately never exercised here — battleProgress always starts (and
// stays, in these tests) at 0.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getActiveIncubationForIncubator, isIncubationReady, listActiveIncubations, startIncubatingEgg } from "./incubation.service.ts";
import { getEggIncubationRow, resetFakeDb, seedIncubator, seedOwnedEgg, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
});

test("starting incubation for the standard incubator computes the exact required battle target per rarity (400/600/1000/1500)", async () => {
  const expected: Record<string, number> = { common: 400, rare: 600, "very-rare": 1000, legendary: 1500 };

  for (const [rarity, target] of Object.entries(expected)) {
    resetFakeDb();
    seedPlayerProfile({ id: "owner-1" });
    const egg = seedOwnedEgg({ playerId: "owner-1", rarity, regionId: "kanto" });
    const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "standard" });

    const result = await startIncubatingEgg("owner-1", incubator.id, egg.id);
    assert.equal(result.status, "started");
    if (result.status === "started") {
      assert.equal(result.incubation.requiredBattleTarget, target, `${rarity} must require exactly ${target} battles`);
      assert.equal(result.incubation.battleProgress, 0, "Phase 1 never increments progress");
    }
  }
});

test("a started incubation is persisted, keyed by the egg's own id", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "standard" });

  await startIncubatingEgg("owner-1", incubator.id, egg.id);

  const row = getEggIncubationRow(egg.id);
  assert.ok(row);
  assert.equal(row?.incubatorId, incubator.id);
});

test("one egg cannot be incubated twice — the second attempt is rejected, not a second row", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubatorA = seedIncubator({ playerId: "owner-1", incubatorTypeId: "standard" });
  const incubatorB = seedIncubator({ playerId: "owner-1", incubatorTypeId: "standard" });

  const first = await startIncubatingEgg("owner-1", incubatorA.id, egg.id);
  assert.equal(first.status, "started");

  const second = await startIncubatingEgg("owner-1", incubatorB.id, egg.id);
  assert.equal(second.status, "egg-already-incubating");

  const row = getEggIncubationRow(egg.id);
  assert.equal(row?.incubatorId, incubatorA.id, "the egg must still point at its original incubator, untouched");
});

test("one incubator cannot hold two eggs at once — the second attempt is rejected", async () => {
  const eggA = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const eggB = seedOwnedEgg({ playerId: "owner-1", rarity: "rare", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "standard" });

  const first = await startIncubatingEgg("owner-1", incubator.id, eggA.id);
  assert.equal(first.status, "started");

  const second = await startIncubatingEgg("owner-1", incubator.id, eggB.id);
  assert.equal(second.status, "incubator-occupied");

  const occupied = await getActiveIncubationForIncubator(incubator.id);
  assert.equal(occupied?.ownedEggId, eggA.id, "the incubator must still hold its original egg, untouched");
});

test("starting incubation with an egg belonging to a different player is rejected, never silently allowed", async () => {
  seedPlayerProfile({ id: "owner-2" });
  const otherPlayersEgg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const myIncubator = seedIncubator({ playerId: "owner-2", incubatorTypeId: "standard" });

  const result = await startIncubatingEgg("owner-2", myIncubator.id, otherPlayersEgg.id);
  assert.equal(result.status, "egg-not-found");
});

test("starting incubation with an incubator belonging to a different player is rejected, never silently allowed", async () => {
  seedPlayerProfile({ id: "owner-2" });
  const myEgg = seedOwnedEgg({ playerId: "owner-2", rarity: "common", regionId: "kanto" });
  const otherPlayersIncubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "standard" });

  const result = await startIncubatingEgg("owner-2", otherPlayersIncubator.id, myEgg.id);
  assert.equal(result.status, "incubator-not-found");
});

test("starting incubation for a nonexistent egg or incubator id is rejected cleanly", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "standard" });

  assert.equal((await startIncubatingEgg("owner-1", "nope", egg.id)).status, "incubator-not-found");
  assert.equal((await startIncubatingEgg("owner-1", incubator.id, "nope")).status, "egg-not-found");
});

test("listActiveIncubations returns only this player's own incubations", async () => {
  seedPlayerProfile({ id: "owner-2" });
  const eggA = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubatorA = seedIncubator({ playerId: "owner-1", incubatorTypeId: "standard" });
  const eggB = seedOwnedEgg({ playerId: "owner-2", rarity: "rare", regionId: "kanto" });
  const incubatorB = seedIncubator({ playerId: "owner-2", incubatorTypeId: "standard" });

  await startIncubatingEgg("owner-1", incubatorA.id, eggA.id);
  await startIncubatingEgg("owner-2", incubatorB.id, eggB.id);

  const owner1Active = await listActiveIncubations("owner-1");
  assert.equal(owner1Active.length, 1);
  assert.equal(owner1Active[0].ownedEggId, eggA.id);
});

test("isIncubationReady is derived from progress vs. target, never a stored flag", () => {
  assert.equal(isIncubationReady({ battleProgress: 0, requiredBattleTarget: 400 }), false);
  assert.equal(isIncubationReady({ battleProgress: 399, requiredBattleTarget: 400 }), false);
  assert.equal(isIncubationReady({ battleProgress: 400, requiredBattleTarget: 400 }), true);
  assert.equal(isIncubationReady({ battleProgress: 401, requiredBattleTarget: 400 }), true);
});
