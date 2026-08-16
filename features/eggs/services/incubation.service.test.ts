// Focused regression coverage for the active-incubation persistence layer —
// runs the real startIncubatingEgg/listActiveIncubations/
// getActiveIncubationForIncubator/isIncubationReady unmodified against the
// in-memory fake DB, same "real service, fake DB" shape every other
// persistence-layer test in this project already follows. Battle-progress
// increments are covered separately in incubation-progress.test.ts —
// battleProgress always starts (and stays, in these tests) at 0.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getActiveIncubationForIncubator, isIncubationReady, listActiveIncubations, startIncubatingEgg } from "./incubation.service.ts";
import { getEggIncubationRow, resetFakeDb, seedIncubator, seedOwnedEgg, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
});

// INCUBATOR SPEED MODEL — requiredBattleTarget = Math.ceil(base /
// speedMultiplier), computed once at start time from BOTH the egg's own
// rarity AND the specific incubator it's placed in (never independent of
// incubator, unlike an earlier revision of this feature — see
// startIncubatingEgg's own doc comment). The 16 values below are the
// spec's own exact table: base 400/600/1000/1500 divided by
// 1/1.5/2/3 and ceil'd.
const EXPECTED_TARGETS: Record<string, Record<string, number>> = {
  common: { regular: 400, advanced: 267, ultra: 200, master: 134 },
  rare: { regular: 600, advanced: 400, ultra: 300, master: 200 },
  "very-rare": { regular: 1000, advanced: 667, ultra: 500, master: 334 },
  legendary: { regular: 1500, advanced: 1000, ultra: 750, master: 500 },
};

test("starting incubation computes the exact required target for every (rarity, incubator) combination per the spec's own table", async () => {
  for (const [rarity, byIncubator] of Object.entries(EXPECTED_TARGETS)) {
    for (const [incubatorTypeId, expectedTarget] of Object.entries(byIncubator)) {
      resetFakeDb();
      seedPlayerProfile({ id: "owner-1" });
      const egg = seedOwnedEgg({ playerId: "owner-1", rarity, regionId: "kanto" });
      const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId });

      const result = await startIncubatingEgg("owner-1", incubator.id, egg.id);
      assert.equal(result.status, "started");
      if (result.status === "started") {
        assert.equal(
          result.incubation.requiredBattleTarget,
          expectedTarget,
          `${rarity} in a ${incubatorTypeId} incubator must require exactly ${expectedTarget} battles`
        );
        assert.equal(result.incubation.battleProgress, 0, "a fresh incubation always starts at 0");
      }
    }
  }
});

test("x1 (Regular) target always equals the base requirement exactly, no rounding involved", async () => {
  for (const [rarity, base] of Object.entries({ common: 400, rare: 600, "very-rare": 1000, legendary: 1500 })) {
    resetFakeDb();
    seedPlayerProfile({ id: "owner-1" });
    const egg = seedOwnedEgg({ playerId: "owner-1", rarity, regionId: "kanto" });
    const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular" });

    const result = await startIncubatingEgg("owner-1", incubator.id, egg.id);
    assert.equal(result.status, "started");
    if (result.status === "started") assert.equal(result.incubation.requiredBattleTarget, base);
  }
});

test("a started incubation is persisted, keyed by the egg's own id", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: 1 });

  await startIncubatingEgg("owner-1", incubator.id, egg.id);

  const row = getEggIncubationRow(egg.id);
  assert.ok(row);
  assert.equal(row?.incubatorId, incubator.id);
});

test("one egg cannot be incubated twice — the second attempt is rejected, not a second row", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubatorA = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: 1 });
  const incubatorB = seedIncubator({ playerId: "owner-1", incubatorTypeId: "ultra" });

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
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: 1 });

  const first = await startIncubatingEgg("owner-1", incubator.id, eggA.id);
  assert.equal(first.status, "started");

  const second = await startIncubatingEgg("owner-1", incubator.id, eggB.id);
  assert.equal(second.status, "incubator-occupied");

  const occupied = await getActiveIncubationForIncubator(incubator.id);
  assert.equal(occupied?.ownedEggId, eggA.id, "the incubator must still hold its original egg, untouched");
});

// INCUBATOR EXPANSION — a player who owns several incubators can run
// several incubations in parallel, one per incubator, fully independent of
// each other.
test("a player owning multiple incubators can run multiple simultaneous incubations, one per incubator", async () => {
  const eggA = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const eggB = seedOwnedEgg({ playerId: "owner-1", rarity: "rare", regionId: "kanto" });
  const eggC = seedOwnedEgg({ playerId: "owner-1", rarity: "legendary", regionId: "kanto" });
  const permanentRegular = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: 1 });
  const ultraOne = seedIncubator({ playerId: "owner-1", incubatorTypeId: "ultra" });
  const ultraTwo = seedIncubator({ playerId: "owner-1", incubatorTypeId: "ultra" });

  const first = await startIncubatingEgg("owner-1", permanentRegular.id, eggA.id);
  const second = await startIncubatingEgg("owner-1", ultraOne.id, eggB.id);
  const third = await startIncubatingEgg("owner-1", ultraTwo.id, eggC.id);

  assert.equal(first.status, "started");
  assert.equal(second.status, "started");
  assert.equal(third.status, "started");

  const active = await listActiveIncubations("owner-1");
  assert.equal(active.length, 3, "all three incubations must be active simultaneously");
  assert.deepEqual(
    new Set(active.map((incubation) => incubation.incubatorId)),
    new Set([permanentRegular.id, ultraOne.id, ultraTwo.id])
  );
});

test("starting incubation with an egg belonging to a different player is rejected, never silently allowed", async () => {
  seedPlayerProfile({ id: "owner-2" });
  const otherPlayersEgg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const myIncubator = seedIncubator({ playerId: "owner-2", incubatorTypeId: "regular", permanentSlot: 1 });

  const result = await startIncubatingEgg("owner-2", myIncubator.id, otherPlayersEgg.id);
  assert.equal(result.status, "egg-not-found");
});

test("starting incubation with an incubator belonging to a different player is rejected, never silently allowed", async () => {
  seedPlayerProfile({ id: "owner-2" });
  const myEgg = seedOwnedEgg({ playerId: "owner-2", rarity: "common", regionId: "kanto" });
  const otherPlayersIncubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: 1 });

  const result = await startIncubatingEgg("owner-2", otherPlayersIncubator.id, myEgg.id);
  assert.equal(result.status, "incubator-not-found");
});

test("starting incubation for a nonexistent egg or incubator id is rejected cleanly", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: 1 });

  assert.equal((await startIncubatingEgg("owner-1", "nope", egg.id)).status, "incubator-not-found");
  assert.equal((await startIncubatingEgg("owner-1", incubator.id, "nope")).status, "egg-not-found");
});

test("listActiveIncubations returns only this player's own incubations", async () => {
  seedPlayerProfile({ id: "owner-2" });
  const eggA = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubatorA = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: 1 });
  const eggB = seedOwnedEgg({ playerId: "owner-2", rarity: "rare", regionId: "kanto" });
  const incubatorB = seedIncubator({ playerId: "owner-2", incubatorTypeId: "regular", permanentSlot: 1 });

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
