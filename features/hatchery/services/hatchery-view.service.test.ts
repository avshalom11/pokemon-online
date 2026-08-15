// EGGS PHASE 5 focused coverage for the Hatchery view aggregator — runs
// the real getHatcheryViewData against the in-memory fake DB, same "real
// service, fake DB" shape every other persistence-layer test in this
// project already follows.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getHatcheryViewData } from "./hatchery-view.service.ts";
import { ensureStandardIncubator } from "@/features/eggs/services/incubator.service";
import { startIncubatingEgg } from "@/features/eggs/services/incubation.service";
import { getIncubatorRows, resetFakeDb, seedOwnedEgg, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
});

test("an existing player with no incubator yet gets their Standard Incubator ensured on load", async () => {
  assert.deepEqual(getIncubatorRows("owner-1"), [], "test assumption: no incubator seeded yet");

  const data = await getHatcheryViewData("owner-1");

  assert.ok(data.incubatorId);
  const rows = getIncubatorRows("owner-1");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, data.incubatorId);
});

test("calling it again for the same player never creates a second incubator", async () => {
  await getHatcheryViewData("owner-1");
  await getHatcheryViewData("owner-1");

  assert.equal(getIncubatorRows("owner-1").length, 1);
});

test("available eggs load correctly, with rarity/region/source resolved for display", async () => {
  seedOwnedEgg({ playerId: "owner-1", rarity: "rare", regionId: "johto", source: "battle" });

  const data = await getHatcheryViewData("owner-1");

  assert.equal(data.availableEggs.length, 1);
  const [egg] = data.availableEggs;
  assert.equal(egg.rarity, "rare");
  assert.equal(egg.displayName, "ביצה נדירה");
  assert.equal(egg.regionLabel, "מחוז ג'וטו");
  assert.equal(egg.source, "battle");
  assert.match(egg.imageUrl, /rare\.png$/);
});

test("an egg with an active incubation is excluded from availableEggs", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  // ensureStandardIncubator (not a raw seed) so this resolves to the exact
  // same row getHatcheryViewData's own ensureStandardIncubator call will
  // find below — a seeded incubator is a separate, independent row as far
  // as the fake's upsert is concerned (see seedIncubator's own doc
  // comment), which would make activeIncubation come back null here.
  const incubator = await ensureStandardIncubator("owner-1");
  await startIncubatingEgg("owner-1", incubator.id, egg.id);

  const data = await getHatcheryViewData("owner-1");

  assert.deepEqual(data.availableEggs, []);
  assert.ok(data.activeIncubation, "the same egg must appear as the active incubation instead");
  assert.equal(data.activeIncubation?.egg.id, egg.id);
});

test("the active incubation view uses the persisted battleProgress/requiredBattleTarget as-is, never a recomputed target", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "rare", regionId: "kanto" });
  const incubator = await ensureStandardIncubator("owner-1");
  const started = await startIncubatingEgg("owner-1", incubator.id, egg.id);
  assert.equal(started.status, "started");
  await prisma.playerEggIncubation.update({ where: { ownedEggId: egg.id }, data: { battleProgress: 123 } });

  const data = await getHatcheryViewData("owner-1");

  assert.equal(data.activeIncubation?.battleProgress, 123);
  assert.equal(data.activeIncubation?.requiredBattleTarget, 600, "rare's persisted target from Phase 1/3, read as-is");
  assert.equal(data.activeIncubation?.isReady, false);
});

test("isReady flips to true once battleProgress reaches requiredBattleTarget, derived from the stored values", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = await ensureStandardIncubator("owner-1");
  await startIncubatingEgg("owner-1", incubator.id, egg.id);
  await prisma.playerEggIncubation.update({ where: { ownedEggId: egg.id }, data: { battleProgress: 400 } });

  const data = await getHatcheryViewData("owner-1");

  assert.equal(data.activeIncubation?.isReady, true);
});

test("no active incubation means activeIncubation is null, not an empty placeholder object", async () => {
  const data = await getHatcheryViewData("owner-1");
  assert.equal(data.activeIncubation, null);
});
