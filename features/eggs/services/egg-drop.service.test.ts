// Focused coverage for the roll+persist integration point EGGS PHASE 2 adds
// — runs the real rollAndAwardEgg against the in-memory fake DB. randomness
// is always injected (never Math.random), so every outcome here is
// deterministic.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { rollAndAwardEgg } from "./egg-drop.service.ts";
import { getOwnedEggRow, resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
});

test("a missed roll reports dropped: false and creates no egg", async () => {
  const result = await rollAndAwardEgg(prisma, "owner-1", "kanto", () => 0.999999);
  assert.deepEqual(result, { dropped: false });
});

test("a successful roll persists a real PlayerOwnedEgg row with source 'battle'", async () => {
  const result = await rollAndAwardEgg(prisma, "owner-1", "johto", () => 0);

  assert.equal(result.dropped, true);
  if (!result.dropped) return;

  assert.equal(result.rarity, "common");
  assert.equal(result.regionId, "johto");

  const row = getOwnedEggRow(result.ownedEggId);
  assert.ok(row, "the egg must actually be persisted through PlayerOwnedEgg");
  assert.equal(row?.playerId, "owner-1");
  assert.equal(row?.rarity, "common");
  assert.equal(row?.regionId, "johto");
  assert.equal(row?.source, "battle");
});

test("the awarded egg's region matches whatever region was passed in, not a hardcoded value", async () => {
  const result = await rollAndAwardEgg(prisma, "owner-1", "alola", () => 0);
  assert.equal(result.dropped, true);
  if (!result.dropped) return;
  assert.equal(result.regionId, "alola");
  assert.equal(getOwnedEggRow(result.ownedEggId)?.regionId, "alola");
});
