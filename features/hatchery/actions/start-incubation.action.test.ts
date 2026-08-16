// Focused coverage for startIncubationAction — runs the real action against
// the in-memory fake DB/session, same convention
// battle-action.action.persistence.test.ts already establishes.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { startIncubationAction } from "./start-incubation.action.ts";
import { ensureStarterIncubator } from "@/features/eggs/services/incubator.service";
import { __setSession } from "../../../test/support/fakes/auth-session.fake.ts";
import { getEggIncubationRow, getIncubatorRows, resetFakeDb, seedOwnedEgg, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
  __setSession({ user: { id: "owner-1" } });
});

test("starting incubation places the egg in the explicitly chosen owned incubator", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = await ensureStarterIncubator("owner-1");

  const result = await startIncubationAction(egg.id, incubator.id);

  assert.equal(result.status, "started");
  assert.equal(getEggIncubationRow(egg.id)?.incubatorId, incubator.id);
});

test("rejects when there is no authenticated session", async () => {
  __setSession(null);
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = await ensureStarterIncubator("owner-1");

  const result = await startIncubationAction(egg.id, incubator.id);
  assert.deepEqual(result, { status: "error" });
});

test("rejects a malformed egg id via schema validation, without reaching the service", async () => {
  const incubator = await ensureStarterIncubator("owner-1");
  const result = await startIncubationAction("", incubator.id);
  assert.deepEqual(result, { status: "error" });
});

test("rejects a malformed/missing incubatorId via schema validation — the client must always name a target incubator", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const result = await startIncubationAction(egg.id, "");
  assert.deepEqual(result, { status: "error" });
});

test("rejects an already-incubating egg — never a second incubation for the same egg", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = await ensureStarterIncubator("owner-1");

  const first = await startIncubationAction(egg.id, incubator.id);
  assert.equal(first.status, "started");

  const second = await startIncubationAction(egg.id, incubator.id);
  assert.equal(second.status, "egg-already-incubating");
});

test("rejects a spoofed incubatorId belonging to another player, never silently allowed", async () => {
  seedPlayerProfile({ id: "owner-2" });
  const otherPlayersIncubator = await ensureStarterIncubator("owner-2");
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });

  const result = await startIncubationAction(egg.id, otherPlayersIncubator.id);
  assert.equal(result.status, "incubator-not-found");
  assert.equal(getIncubatorRows("owner-2")[0]?.id, otherPlayersIncubator.id, "the other player's incubator must remain untouched/empty");
});
