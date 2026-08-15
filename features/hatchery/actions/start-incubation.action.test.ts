// EGGS PHASE 5 focused coverage for startIncubationAction — runs the real
// action against the in-memory fake DB/session, same convention
// battle-action.action.persistence.test.ts already establishes.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { startIncubationAction } from "./start-incubation.action.ts";
import { __setSession } from "../../../test/support/fakes/auth-session.fake.ts";
import { getEggIncubationRow, getIncubatorRows, resetFakeDb, seedOwnedEgg, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
  __setSession({ user: { id: "owner-1" } });
});

test("starting incubation places the egg in the player's (auto-ensured) Standard Incubator", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  assert.deepEqual(getIncubatorRows("owner-1"), [], "test assumption: no incubator seeded yet");

  const result = await startIncubationAction(egg.id);

  assert.equal(result.status, "started");
  const incubatorRows = getIncubatorRows("owner-1");
  assert.equal(incubatorRows.length, 1, "the action must ensure the Standard Incubator itself");
  assert.equal(getEggIncubationRow(egg.id)?.incubatorId, incubatorRows[0].id);
});

test("rejects when there is no authenticated session", async () => {
  __setSession(null);
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });

  const result = await startIncubationAction(egg.id);
  assert.deepEqual(result, { status: "error" });
});

test("rejects a malformed egg id via schema validation, without reaching the service", async () => {
  const result = await startIncubationAction("");
  assert.deepEqual(result, { status: "error" });
});

test("rejects an already-incubating egg — never a second incubation for the same egg", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const first = await startIncubationAction(egg.id);
  assert.equal(first.status, "started");

  const second = await startIncubationAction(egg.id);
  assert.equal(second.status, "egg-already-incubating");
});
