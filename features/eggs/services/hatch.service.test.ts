// EGGS PHASE 4 focused coverage for hatchIncubation — runs the real
// service against the in-memory fake DB, same "real service, fake DB"
// shape every other persistence-layer test in this project already
// follows. Species/level selection is always deterministic via an
// injected randomSource — no statistical/flaky assertions.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { hatchIncubation } from "./hatch.service.ts";
import { startIncubatingEgg } from "./incubation.service.ts";
import {
  getEggIncubationRow,
  getIncubatorRows,
  getOwnedEggRow,
  getPlayerPokemonRow,
  resetFakeDb,
  seedIncubator,
  seedOwnedEgg,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
});

async function seedReadyIncubation(rarity: string, regionId: string) {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity, regionId });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "standard" });
  const started = await startIncubatingEgg("owner-1", incubator.id, egg.id);
  assert.equal(started.status, "started");
  // Mark it ready without going through Phase 3's battle-by-battle
  // progression — Phase 4 only cares that battleProgress >= target here.
  await prisma.playerEggIncubation.update({
    where: { ownedEggId: egg.id },
    data: { battleProgress: started.status === "started" ? started.incubation.requiredBattleTarget : 0 },
  });
  return { eggId: egg.id, incubatorId: incubator.id };
}

test("a not-ready incubation cannot hatch", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "standard" });
  await startIncubatingEgg("owner-1", incubator.id, egg.id); // starts at battleProgress: 0

  const result = await hatchIncubation("owner-1", egg.id, () => 0);
  assert.equal(result.status, "not-ready");
  assert.ok(getEggIncubationRow(egg.id), "the incubation row must be untouched");
  assert.ok(getOwnedEggRow(egg.id), "the egg must be untouched");
});

test("a ready incubation can hatch", async () => {
  const { eggId } = await seedReadyIncubation("common", "kanto");

  const result = await hatchIncubation("owner-1", eggId, () => 0);
  assert.equal(result.status, "hatched");
});

test("the pool is built from the egg's own stored region, never the player's current region", async () => {
  // Player's own PlayerProfile.regionId defaults to "kanto"
  // (seedPlayerProfile), but this egg was dropped while the player was in
  // Johto — the hatch must draw from Johto's pool, not Kanto's.
  const { eggId } = await seedReadyIncubation("rare", "johto");

  const result = await hatchIncubation("owner-1", eggId, () => 0);
  assert.equal(result.status, "hatched");
  if (result.status !== "hatched") return;

  assert.equal(result.result.regionId, "johto");
});

test("the pool uses the egg's REAL rarity — bellibolt (real rare, effective very-rare) is reachable from a rare Paldea egg", async () => {
  const { eggId } = await seedReadyIncubation("rare", "paldea");

  // random() = 0 always selects the pool's own first element
  // (hatch-pool.service.ts's own uniform-index contract) — deterministic,
  // not a statistical draw.
  const result = await hatchIncubation("owner-1", eggId, () => 0);
  assert.equal(result.status, "hatched");
  if (result.status !== "hatched") return;
  assert.equal(result.result.rarity, "rare");
});

// The empty-pool guard itself (hatchIncubation returns "empty-pool" and
// consumes nothing) is covered directly at the pool layer — see
// hatch-pool.service.test.ts's own "an empty region+rarity pool fails
// safely" test. It can't be exercised end-to-end through hatchIncubation
// with a fabricated region string the way that lower-level test does:
// PlayerOwnedEgg.regionId is always normalized via toRegionId before
// hatchIncubation ever reaches rollHatchSpecies (the same defensive
// "invalid -> safe kanto fallback" contract every other regionId column in
// this project already applies on read — see shared/types/region.ts's own
// toRegionId doc comment), so an actually-unrecognized string can never
// reach the pool lookup as itself; it becomes a normal, populated "kanto"
// lookup instead. Since no real (RegionId, PokemonRarity) combination is
// empty today, there is no fixture that reaches "empty-pool" through this
// public entry point without contradicting that intentional normalization.

test("the hatched Pokémon is added to the player's collection/storage, using the randomly calculated hatch level", async () => {
  const { eggId } = await seedReadyIncubation("common", "kanto");

  const result = await hatchIncubation("owner-1", eggId, () => 0);
  assert.equal(result.status, "hatched");
  if (result.status !== "hatched") return;

  const row = getPlayerPokemonRow(result.result.ownedPokemonId);
  assert.ok(row, "a real PlayerPokemon row must exist");
  assert.equal(row?.playerId, "owner-1");
  assert.equal(row?.speciesId, result.result.speciesId);
  assert.equal(row?.level, result.result.level);
  assert.equal(row?.isStarter, false);
});

test("the hatched Pokémon is NOT automatically placed into the active party", async () => {
  const { eggId } = await seedReadyIncubation("common", "kanto");

  const result = await hatchIncubation("owner-1", eggId, () => 0);
  assert.equal(result.status, "hatched");
  if (result.status !== "hatched") return;

  const row = getPlayerPokemonRow(result.result.ownedPokemonId);
  assert.equal(row?.partySlot, null, "a hatched Pokémon must land in storage, never an occupied party slot");
});

test("hatching consumes the egg and removes the incubation row, but the incubator itself remains permanently owned", async () => {
  const { eggId, incubatorId } = await seedReadyIncubation("common", "kanto");

  const result = await hatchIncubation("owner-1", eggId, () => 0);
  assert.equal(result.status, "hatched");

  assert.equal(getOwnedEggRow(eggId), undefined, "the egg must be consumed");
  assert.equal(getEggIncubationRow(eggId), undefined, "the completed incubation row must be removed");

  const incubatorRows = getIncubatorRows("owner-1");
  assert.equal(incubatorRows.length, 1, "the Standard Incubator itself must still exist");
  assert.equal(incubatorRows[0].id, incubatorId);
});

test("the same incubation cannot hatch twice — a retried/racing hatch call is rejected, not a second Pokémon", async () => {
  const { eggId } = await seedReadyIncubation("common", "kanto");

  const first = await hatchIncubation("owner-1", eggId, () => 0);
  assert.equal(first.status, "hatched");

  const second = await hatchIncubation("owner-1", eggId, () => 0);
  assert.equal(second.status, "not-found", "the incubation row is already gone by the second call");
});

test("a hatch attempt for another player's incubation is rejected", async () => {
  seedPlayerProfile({ id: "owner-2" });
  const { eggId } = await seedReadyIncubation("common", "kanto");

  const result = await hatchIncubation("owner-2", eggId, () => 0);
  assert.equal(result.status, "not-found");
  assert.ok(getOwnedEggRow(eggId), "another player's hatch attempt must not consume this egg");
});
