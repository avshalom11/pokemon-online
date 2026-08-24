// Focused coverage for hatchIncubation — runs the real service against the
// in-memory fake DB, same "real service, fake DB" shape every other
// persistence-layer test in this project already follows. Species/level
// selection is always deterministic via an injected randomSource — no
// statistical/flaky assertions.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { hatchIncubation } from "./hatch.service.ts";
import { startIncubatingEgg } from "./incubation.service.ts";
import {
  getEggIncubationRow,
  getIncubatorRows,
  getOwnedEggRow,
  getPlayerPokemonRow,
  getPlayerPokemonsByPlayerId,
  resetFakeDb,
  seedIncubator,
  seedOwnedEgg,
  seedPlayerPokemon,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
});

async function seedReadyIncubation(
  rarity: string,
  regionId: string,
  incubatorOptions: { incubatorTypeId: string; permanentSlot?: number | null } = { incubatorTypeId: "regular", permanentSlot: 1 }
) {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity, regionId });
  const incubator = seedIncubator({ playerId: "owner-1", ...incubatorOptions });
  const started = await startIncubatingEgg("owner-1", incubator.id, egg.id);
  assert.equal(started.status, "started");
  // Mark it ready without going through the battle-by-battle progression —
  // hatchIncubation only cares that battleProgress >= target here.
  await prisma.playerEggIncubation.update({
    where: { ownedEggId: egg.id },
    data: { battleProgress: started.status === "started" ? started.incubation.requiredBattleTarget : 0 },
  });
  return { eggId: egg.id, incubatorId: incubator.id };
}

test("a not-ready incubation cannot hatch", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: 1 });
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

// EGG HATCH — AUTO-ADD TO PARTY IF SPACE, matching capture.service.ts's own
// attemptCapture behavior (see capture.service.auto-party.test.ts).
test("a hatched Pokémon is auto-added to the first empty party slot", async () => {
  seedPlayerPokemon({ id: "active", playerId: "owner-1", speciesId: "charmander", partySlot: 1 });
  const { eggId } = await seedReadyIncubation("common", "kanto");

  const result = await hatchIncubation("owner-1", eggId, () => 0);
  assert.equal(result.status, "hatched");
  if (result.status !== "hatched") return;
  assert.equal(result.result.addedToParty, true);

  const row = getPlayerPokemonRow(result.result.ownedPokemonId);
  assert.equal(row?.partySlot, 2, "must land in the first free slot (2 — slot 1 is already occupied)");
});

test("a full party (6/6) leaves the hatched Pokémon in storage — never replaces an existing member", async () => {
  for (let slot = 1; slot <= 6; slot++) {
    seedPlayerPokemon({ id: `member-${slot}`, playerId: "owner-1", speciesId: "charmander", partySlot: slot });
  }
  const { eggId } = await seedReadyIncubation("common", "kanto");

  const result = await hatchIncubation("owner-1", eggId, () => 0);
  assert.equal(result.status, "hatched");
  if (result.status !== "hatched") return;
  assert.equal(result.result.addedToParty, false);

  const row = getPlayerPokemonRow(result.result.ownedPokemonId);
  assert.equal(row?.partySlot, null, "a full party must leave the hatched Pokémon in storage (partySlot null)");

  const partySlots = getPlayerPokemonsByPlayerId("owner-1")
    .filter((pokemon) => pokemon.partySlot !== null)
    .map((pokemon) => pokemon.partySlot)
    .sort();
  assert.deepEqual(partySlots, [1, 2, 3, 4, 5, 6], "no existing party member's slot may change");
});

test("hatching with the permanent starter incubator consumes the egg and removes the incubation row, but the incubator itself remains permanently owned", async () => {
  const { eggId, incubatorId } = await seedReadyIncubation("common", "kanto", { incubatorTypeId: "regular", permanentSlot: 1 });

  const result = await hatchIncubation("owner-1", eggId, () => 0);
  assert.equal(result.status, "hatched");
  if (result.status !== "hatched") return;
  assert.equal(result.incubatorConsumed, false, "the permanent starter incubator must never be reported as consumed");

  assert.equal(getOwnedEggRow(eggId), undefined, "the egg must be consumed");
  assert.equal(getEggIncubationRow(eggId), undefined, "the completed incubation row must be removed");

  const incubatorRows = getIncubatorRows("owner-1");
  assert.equal(incubatorRows.length, 1, "the permanent incubator itself must still exist");
  assert.equal(incubatorRows[0].id, incubatorId);
});

// INCUBATOR EXPANSION — a consumable (Shop-purchased / chest-granted)
// incubator is single-use: it must be removed entirely the instant a hatch
// it held succeeds.
for (const incubatorTypeId of ["regular", "advanced", "ultra", "master"]) {
  test(`hatching with a consumable ${incubatorTypeId} incubator consumes the egg AND the incubator itself`, async () => {
    const { eggId, incubatorId } = await seedReadyIncubation("common", "kanto", { incubatorTypeId, permanentSlot: null });

    const result = await hatchIncubation("owner-1", eggId, () => 0);
    assert.equal(result.status, "hatched");
    if (result.status !== "hatched") return;
    assert.equal(result.incubatorId, incubatorId);
    assert.equal(result.incubatorConsumed, true, "a consumable incubator must be reported as consumed");

    assert.equal(getOwnedEggRow(eggId), undefined, "the egg must be consumed");
    assert.equal(getEggIncubationRow(eggId), undefined, "the completed incubation row must be removed");
    assert.equal(getIncubatorRows("owner-1").length, 0, "the single-use incubator itself must be gone");
  });
}

test("consuming one incubator on hatch never touches the player's other owned incubators", async () => {
  const permanentRegular = seedIncubator({ playerId: "owner-1", incubatorTypeId: "regular", permanentSlot: 1 });
  const otherConsumable = seedIncubator({ playerId: "owner-1", incubatorTypeId: "ultra", permanentSlot: null });
  const { eggId, incubatorId } = await seedReadyIncubation("common", "kanto", { incubatorTypeId: "master", permanentSlot: null });

  const result = await hatchIncubation("owner-1", eggId, () => 0);
  assert.equal(result.status, "hatched");
  if (result.status !== "hatched") return;
  assert.equal(result.incubatorConsumed, true);

  const remainingIds = getIncubatorRows("owner-1").map((row) => row.id);
  assert.deepEqual(new Set(remainingIds), new Set([permanentRegular.id, otherConsumable.id]));
  assert.ok(!remainingIds.includes(incubatorId), "the consumed incubator must be gone");
});

test("a not-ready hatch attempt never consumes the incubator, permanent or consumable", async () => {
  const egg = seedOwnedEgg({ playerId: "owner-1", rarity: "common", regionId: "kanto" });
  const incubator = seedIncubator({ playerId: "owner-1", incubatorTypeId: "ultra", permanentSlot: null });
  await startIncubatingEgg("owner-1", incubator.id, egg.id); // battleProgress: 0

  const result = await hatchIncubation("owner-1", egg.id, () => 0);
  assert.equal(result.status, "not-ready");
  assert.equal(getIncubatorRows("owner-1").length, 1, "the incubator must survive a failed/not-ready hatch attempt");
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
