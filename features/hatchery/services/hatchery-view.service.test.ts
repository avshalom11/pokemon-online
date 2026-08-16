// Focused coverage for the Hatchery view aggregator — runs the real
// getHatcheryViewData against the in-memory fake DB, same "real service,
// fake DB" shape every other persistence-layer test in this project already
// follows.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getHatcheryViewData } from "./hatchery-view.service.ts";
import { ensureStarterIncubator, grantIncubator } from "@/features/eggs/services/incubator.service";
import { startIncubatingEgg } from "@/features/eggs/services/incubation.service";
import { getIncubatorRows, resetFakeDb, seedOwnedEgg, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
});

test("an existing player with no incubator yet gets their permanent starter incubator ensured on load", async () => {
  assert.deepEqual(getIncubatorRows("owner-1"), [], "test assumption: no incubator seeded yet");

  const data = await getHatcheryViewData("owner-1");

  assert.equal(data.incubators.length, 1);
  assert.equal(data.incubators[0].isPermanent, true);
  assert.equal(data.incubators[0].incubatorTypeId, "regular");
  const rows = getIncubatorRows("owner-1");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, data.incubators[0].id);
});

test("calling it again for the same player never creates a second permanent incubator", async () => {
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

test("an egg with an active incubation is excluded from availableEggs and appears on its own incubator instead", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  // ensureStarterIncubator (not a raw seed) so this resolves to the exact
  // same row getHatcheryViewData's own ensureStarterIncubator call will
  // find below.
  const incubator = await ensureStarterIncubator("owner-1");
  await startIncubatingEgg("owner-1", incubator.id, egg.id);

  const data = await getHatcheryViewData("owner-1");

  assert.deepEqual(data.availableEggs, []);
  assert.equal(data.incubators.length, 1);
  const [incubatorView] = data.incubators;
  assert.ok(incubatorView.activeIncubation, "the same egg must appear as this incubator's active incubation instead");
  assert.equal(incubatorView.activeIncubation?.egg.id, egg.id);
});

test("the active incubation view reads the persisted battleProgress/requiredBattleTarget as-is, already in real battle units", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "rare", regionId: "kanto" });
  const incubator = await ensureStarterIncubator("owner-1");
  const started = await startIncubatingEgg("owner-1", incubator.id, egg.id);
  assert.equal(started.status, "started");
  await prisma.playerEggIncubation.update({ where: { ownedEggId: egg.id }, data: { battleProgress: 123 } });

  const data = await getHatcheryViewData("owner-1");

  const [incubatorView] = data.incubators;
  assert.equal(incubatorView.activeIncubation?.battleProgress, 123);
  assert.equal(incubatorView.activeIncubation?.requiredBattleTarget, 600, "rare's required battles in a Regular (x1) incubator");
  assert.equal(incubatorView.activeIncubation?.isReady, false);
});

test("isReady flips to true once battleProgress reaches requiredBattleTarget, derived from the stored values", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = await ensureStarterIncubator("owner-1");
  const started = await startIncubatingEgg("owner-1", incubator.id, egg.id);
  assert.equal(started.status, "started");
  if (started.status !== "started") return;
  await prisma.playerEggIncubation.update({ where: { ownedEggId: egg.id }, data: { battleProgress: started.incubation.requiredBattleTarget } });

  const data = await getHatcheryViewData("owner-1");

  assert.equal(data.incubators[0].activeIncubation?.isReady, true);
});

test("no active incubation on an incubator means its activeIncubation is null, not an empty placeholder object", async () => {
  const data = await getHatcheryViewData("owner-1");
  assert.equal(data.incubators[0].activeIncubation, null);
});

// INCUBATOR EXPANSION — a player who owns several incubators sees every
// one of them, permanent first, each with its own independent state.
test("every owned incubator instance appears, permanent starter first, then consumables — each tracking its own state", async () => {
  await ensureStarterIncubator("owner-1");
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "ultra"));
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "ultra"));
  await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "master"));

  const data = await getHatcheryViewData("owner-1");

  assert.equal(data.incubators.length, 4, "1 permanent regular + 2 ultra + 1 master");
  assert.equal(data.incubators[0].isPermanent, true, "permanent starter incubator listed first");
  assert.equal(data.incubators.filter((incubator) => incubator.incubatorTypeId === "ultra").length, 2);
  assert.equal(data.incubators.filter((incubator) => incubator.incubatorTypeId === "master").length, 1);
  assert.ok(data.incubators.every((incubator) => incubator.activeIncubation === null), "all freshly granted incubators start empty");
});

test("placing eggs in two different incubators leaves each incubator's activeIncubation independent of the other", async () => {
  const eggA = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const eggB = seedOwnedEgg({ playerId: "owner-1", rarity: "legendary", regionId: "kanto" });
  const permanentRegular = await ensureStarterIncubator("owner-1");
  const ultra = await prisma.$transaction((tx) => grantIncubator(tx, "owner-1", "ultra"));

  await startIncubatingEgg("owner-1", permanentRegular.id, eggA.id);
  await startIncubatingEgg("owner-1", ultra.id, eggB.id);

  const data = await getHatcheryViewData("owner-1");

  const regularView = data.incubators.find((incubator) => incubator.id === permanentRegular.id);
  const ultraView = data.incubators.find((incubator) => incubator.id === ultra.id);
  assert.equal(regularView?.activeIncubation?.egg.id, eggA.id);
  assert.equal(ultraView?.activeIncubation?.egg.id, eggB.id);
  assert.equal(data.availableEggs.length, 0);
});
