// INCUBATOR EXPANSION focused coverage for the Inventory screen's own
// owned-incubators summary — runs the real getOwnedIncubatorSummaries
// against the in-memory fake DB, same "real service, fake DB" shape every
// other persistence-layer test in this project already follows.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getOwnedIncubatorSummaries } from "./incubator-display.service.ts";
import { ensureStarterIncubator, grantIncubator } from "./incubator.service.ts";
import { resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
});

// BUGFIX — the permanent starter incubator must be VISIBLE in the
// Inventory summary, clearly marked isPermanent, never excluded just
// because it isn't a consumable/sellable item.
test("a player with only the permanent starter incubator sees it in the summary, marked isPermanent with quantity 1", async () => {
  await ensureStarterIncubator("owner-1");

  const summaries = await getOwnedIncubatorSummaries("owner-1");

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].incubatorTypeId, "regular");
  assert.equal(summaries[0].isPermanent, true);
  assert.equal(summaries[0].quantity, 1);
});

test("consumable incubators of the same type are grouped into one summary entry with the correct quantity, marked isPermanent false", async () => {
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "ultra"));
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "ultra"));
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "ultra"));

  const summaries = await getOwnedIncubatorSummaries("owner-1");

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].incubatorTypeId, "ultra");
  assert.equal(summaries[0].isPermanent, false);
  assert.equal(summaries[0].quantity, 3);
  assert.equal(summaries[0].speedMultiplier, 2);
  assert.match(summaries[0].imageUrl, /ultra\.png$/);
});

test("different consumable types appear as separate entries, ordered by the canonical catalog order, after the permanent entry", async () => {
  await ensureStarterIncubator("owner-1");
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "master"));
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "advanced"));

  const summaries = await getOwnedIncubatorSummaries("owner-1");

  assert.deepEqual(
    summaries.map((summary) => ({ type: summary.incubatorTypeId, permanent: summary.isPermanent })),
    [
      { type: "regular", permanent: true },
      { type: "advanced", permanent: false },
      { type: "master", permanent: false },
    ],
    "permanent starter first, then catalog order (regular, advanced, ultra, master), not acquisition order"
  );
});

// BUGFIX — a consumable incubator of the SAME type as the permanent
// starter (e.g. a purchased Regular Incubator alongside the permanent one)
// must appear as its own separate entry, never merged with or replacing
// the permanent entry.
test("a consumable Regular Incubator appears as its own separate entry from the permanent starter Regular Incubator", async () => {
  await ensureStarterIncubator("owner-1");
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "regular"));

  const summaries = await getOwnedIncubatorSummaries("owner-1");

  assert.equal(summaries.length, 2, "the permanent entry and the consumable entry must both appear, distinctly");
  const permanentEntry = summaries.find((summary) => summary.isPermanent);
  const consumableEntry = summaries.find((summary) => !summary.isPermanent);
  assert.equal(permanentEntry?.incubatorTypeId, "regular");
  assert.equal(permanentEntry?.quantity, 1);
  assert.equal(consumableEntry?.incubatorTypeId, "regular");
  assert.equal(consumableEntry?.quantity, 1, "only the consumable one is counted in this entry");
});

test("a brand-new player with no incubators at all gets an empty summary, never a crash", async () => {
  const summaries = await getOwnedIncubatorSummaries("owner-1");
  assert.deepEqual(summaries, []);
});
