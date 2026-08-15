// Focused regression coverage for EGGS PHASE 1's incubator persistence
// primitive — runs the real ensureStandardIncubator/listPlayerIncubators
// unmodified against the in-memory fake DB, same shape
// daily-battle-count.integration.test.ts already established for its own
// idempotent-upsert service.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { ensureStandardIncubator, listPlayerIncubators } from "./incubator.service.ts";
import { getIncubatorRows, resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
});

test("a brand-new player has no incubator until something asks for one", async () => {
  assert.deepEqual(getIncubatorRows("owner-1"), []);
});

test("ensureStandardIncubator creates exactly one row on first access", async () => {
  const incubator = await ensureStandardIncubator("owner-1");
  assert.equal(incubator.playerId, "owner-1");
  assert.equal(incubator.incubatorTypeId, "standard");
  assert.equal(getIncubatorRows("owner-1").length, 1);
});

test("calling ensureStandardIncubator again for the same player is a no-op — never a duplicate row", async () => {
  const first = await ensureStandardIncubator("owner-1");
  const second = await ensureStandardIncubator("owner-1");

  assert.equal(first.id, second.id, "the exact same incubator row must be returned every time");
  assert.equal(getIncubatorRows("owner-1").length, 1, "at most one standard incubator must ever exist for this player");
});

test("simulating a race — two concurrent ensureStandardIncubator calls for a brand-new player still yield exactly one row", async () => {
  const [first, second] = await Promise.all([ensureStandardIncubator("owner-1"), ensureStandardIncubator("owner-1")]);

  assert.equal(first.id, second.id);
  assert.equal(getIncubatorRows("owner-1").length, 1);
});

test("existing players (simulated: a profile with no incubator yet) safely obtain one through the exact same ensure call", async () => {
  seedPlayerProfile({ id: "existing-player" });
  assert.deepEqual(getIncubatorRows("existing-player"), [], "no pre-existing incubator, same as any pre-Phase-1 player");

  const incubator = await ensureStandardIncubator("existing-player");
  assert.equal(incubator.incubatorTypeId, "standard");
  assert.equal(getIncubatorRows("existing-player").length, 1);
});

test("each player gets their own independent standard incubator", async () => {
  seedPlayerProfile({ id: "owner-2" });

  const first = await ensureStandardIncubator("owner-1");
  const second = await ensureStandardIncubator("owner-2");

  assert.notEqual(first.id, second.id);
  assert.equal((await listPlayerIncubators("owner-1")).length, 1);
  assert.equal((await listPlayerIncubators("owner-2")).length, 1);
});
