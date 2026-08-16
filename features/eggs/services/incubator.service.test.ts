// Focused regression coverage for the incubator persistence primitives —
// runs the real ensureStarterIncubator/grantIncubator/isIncubatorPermanent/
// listPlayerIncubators unmodified against the in-memory fake DB, same shape
// daily-battle-count.integration.test.ts already established for its own
// idempotent-upsert service.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { ensureStarterIncubator, grantIncubator, isIncubatorPermanent, listPlayerIncubators } from "./incubator.service.ts";
import { getIncubatorRows, resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
});

test("a brand-new player has no incubator until something asks for one", async () => {
  assert.deepEqual(getIncubatorRows("owner-1"), []);
});

test("ensureStarterIncubator creates exactly one permanent Regular Incubator on first access", async () => {
  const incubator = await ensureStarterIncubator("owner-1");
  assert.equal(incubator.playerId, "owner-1");
  assert.equal(incubator.incubatorTypeId, "regular");
  assert.equal(isIncubatorPermanent(incubator), true);
  assert.equal(getIncubatorRows("owner-1").length, 1);
});

test("calling ensureStarterIncubator again for the same player is a no-op — never a duplicate row", async () => {
  const first = await ensureStarterIncubator("owner-1");
  const second = await ensureStarterIncubator("owner-1");

  assert.equal(first.id, second.id, "the exact same incubator row must be returned every time");
  assert.equal(getIncubatorRows("owner-1").length, 1, "at most one permanent incubator must ever exist for this player");
});

test("simulating a race — two concurrent ensureStarterIncubator calls for a brand-new player still yield exactly one row", async () => {
  const [first, second] = await Promise.all([ensureStarterIncubator("owner-1"), ensureStarterIncubator("owner-1")]);

  assert.equal(first.id, second.id);
  assert.equal(getIncubatorRows("owner-1").length, 1);
});

test("existing players (simulated: a profile with no incubator yet) safely obtain one through the exact same ensure call", async () => {
  seedPlayerProfile({ id: "existing-player" });
  assert.deepEqual(getIncubatorRows("existing-player"), [], "no pre-existing incubator, same as any pre-expansion player");

  const incubator = await ensureStarterIncubator("existing-player");
  assert.equal(incubator.incubatorTypeId, "regular");
  assert.equal(getIncubatorRows("existing-player").length, 1);
});

test("each player gets their own independent permanent starter incubator", async () => {
  seedPlayerProfile({ id: "owner-2" });

  const first = await ensureStarterIncubator("owner-1");
  const second = await ensureStarterIncubator("owner-2");

  assert.notEqual(first.id, second.id);
  assert.equal((await listPlayerIncubators("owner-1")).length, 1);
  assert.equal((await listPlayerIncubators("owner-2")).length, 1);
});

// INCUBATOR EXPANSION — grantIncubator coverage.
test("grantIncubator creates a brand-new consumable incubator, never the permanent slot", async () => {
  const incubator = await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "ultra"));

  assert.equal(incubator.playerId, "owner-1");
  assert.equal(incubator.incubatorTypeId, "ultra");
  assert.equal(isIncubatorPermanent(incubator), false);
  assert.equal(getIncubatorRows("owner-1").length, 1);
});

test("granting the same type multiple times yields multiple independent instances, never a merged quantity", async () => {
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "regular"));
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "regular"));
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "regular"));

  const rows = getIncubatorRows("owner-1");
  assert.equal(rows.length, 3);
  assert.equal(new Set(rows.map((row) => row.id)).size, 3, "every granted instance must have its own distinct id");
  assert.ok(rows.every((row) => row.incubatorTypeId === "regular"));
  assert.ok(rows.every((row) => isIncubatorPermanent(row) === false));
});

test("a granted consumable Regular Incubator coexists with the player's own permanent Regular Incubator", async () => {
  await ensureStarterIncubator("owner-1");
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "regular"));

  const rows = getIncubatorRows("owner-1");
  assert.equal(rows.length, 2);
  assert.equal(rows.filter((row) => isIncubatorPermanent(row)).length, 1, "exactly one permanent row");
  assert.equal(rows.filter((row) => !isIncubatorPermanent(row)).length, 1, "exactly one consumable row");
});

test("multiple different incubator types can be owned simultaneously, including duplicates of the same type", async () => {
  await ensureStarterIncubator("owner-1");
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "regular"));
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "ultra"));
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "ultra"));
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "ultra"));
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "ultra"));
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "master"));

  const rows = await listPlayerIncubators("owner-1");
  assert.equal(rows.length, 7, "1 permanent regular + 1 consumable regular + 4 ultra + 1 master");
  assert.equal(rows.filter((row) => row.incubatorTypeId === "ultra").length, 4);
});

test("isIncubatorPermanent is derived from permanentSlot, never a stored boolean", () => {
  assert.equal(isIncubatorPermanent({ permanentSlot: 1 }), true);
  assert.equal(isIncubatorPermanent({ permanentSlot: null }), false);
});
