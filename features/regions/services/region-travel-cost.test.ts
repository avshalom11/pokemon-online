// REGION TRAVEL COST — real behavioral coverage of travelToRegion
// (region.service.ts), against the fake Prisma DB (alias-loader.mjs
// redirects @/lib/db/prisma automatically for any test importing this
// service via the normal @/ specifier) — same "real service, fake DB"
// shape this codebase's other behavioral tests already use.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { REGION_TRAVEL_COST, getRegionTravelCost } from "@/features/regions/config/region-travel-cost.config";
import { travelToRegion } from "@/features/regions/services/region.service";
import type { RegionId } from "@/shared/types/region";
import {
  getFieldBattleSessionRow,
  getPlayerProfileRow,
  resetFakeDb,
  seedFieldBattleSession,
  seedPlayerPokemon,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

// (1)-(9) exact price per destination region — the literal values the
// task specifies, not just "whatever the config says" (a config typo
// would otherwise pass a test that only re-reads the same config).
test("(1-9) each region's travel cost matches the exact required price", () => {
  const expected: Record<RegionId, number> = {
    kanto: 200,
    johto: 300,
    hoenn: 400,
    sinnoh: 500,
    unova: 600,
    kalos: 700,
    alola: 800,
    galar: 900,
    paldea: 1000,
  };
  for (const [regionId, price] of Object.entries(expected) as [RegionId, number][]) {
    assert.equal(getRegionTravelCost(regionId), price, `${regionId} must cost exactly ${price}`);
    assert.equal(REGION_TRAVEL_COST[regionId], price);
  }
});

// (10) cost is based on destination only, never origin.
test("(10) cost depends only on the destination region, regardless of where the player travels FROM", async () => {
  seedPlayerProfile({ id: "p1", regionId: "johto", coins: 10_000 });
  seedPlayerProfile({ id: "p2", regionId: "alola", coins: 10_000 });

  const result1 = await travelToRegion("p1", "paldea");
  const result2 = await travelToRegion("p2", "paldea");

  assert.equal(result1, "success");
  assert.equal(result2, "success");
  assert.equal(getPlayerProfileRow("p1")!.coins, 10_000 - 1000);
  assert.equal(getPlayerProfileRow("p2")!.coins, 10_000 - 1000);
});

// (11) NOT a one-time unlock — going back to a region already visited
// before still costs Money every time.
test("(11) returning to a previously visited region still costs Money — this is never a one-time unlock", async () => {
  seedPlayerProfile({ id: "p3", regionId: "kanto", coins: 10_000 });

  const toPaldea = await travelToRegion("p3", "paldea");
  assert.equal(toPaldea, "success");
  assert.equal(getPlayerProfileRow("p3")!.coins, 10_000 - 1000);

  const backToKanto = await travelToRegion("p3", "kanto");
  assert.equal(backToKanto, "success");
  assert.equal(getPlayerProfileRow("p3")!.coins, 10_000 - 1000 - 200);

  // Visiting Paldea again (already visited once before) costs the SAME
  // 1000 — never discounted/free for a return visit.
  const toPaldeaAgain = await travelToRegion("p3", "paldea");
  assert.equal(toPaldeaAgain, "success");
  assert.equal(getPlayerProfileRow("p3")!.coins, 10_000 - 1000 - 200 - 1000);
});

// (12) selecting the CURRENT region costs nothing and performs no
// mutation.
test("(12) selecting the region the player is already in costs nothing and does not mutate anything", async () => {
  seedPlayerProfile({ id: "p4", regionId: "hoenn", coins: 555 });

  const result = await travelToRegion("p4", "hoenn");

  assert.equal(result, "same-region");
  const row = getPlayerProfileRow("p4")!;
  assert.equal(row.coins, 555, "no Money may be deducted for a same-region no-op");
  assert.equal(row.regionId, "hoenn");
});

// (13)/(14) insufficient Money rejects travel, changes nothing, deducts
// nothing.
test("(13-14) insufficient Money prevents travel and deducts nothing — region and balance stay exactly as they were", async () => {
  seedPlayerProfile({ id: "p5", regionId: "kanto", coins: 50 });

  const result = await travelToRegion("p5", "paldea"); // costs 1000, player only has 50

  assert.equal(result, "insufficient-funds");
  const row = getPlayerProfileRow("p5")!;
  assert.equal(row.coins, 50, "balance must be completely untouched on a rejected travel");
  assert.equal(row.regionId, "kanto", "region must never change on a rejected travel");
});

// (15)/(16) a successful travel deducts the EXACT amount and changes the
// region.
test("(15-16) a successful travel deducts the exact cost and changes the region", async () => {
  seedPlayerProfile({ id: "p6", regionId: "kanto", coins: 1000 });

  const result = await travelToRegion("p6", "sinnoh"); // costs 500

  assert.equal(result, "success");
  const row = getPlayerProfileRow("p6")!;
  assert.equal(row.coins, 500, "exactly 500 must be deducted — no more, no less");
  assert.equal(row.regionId, "sinnoh");
});

// (17) the server never trusts a client-supplied price — travelToRegion's
// only inputs are playerId and the destination regionId; there is no
// price parameter through which a caller could supply its own number, and
// the price is always resolved internally from the central config.
test("(17) travelToRegion accepts no price parameter at all — the server always resolves cost itself from the central config", () => {
  assert.equal(travelToRegion.length, 2, "travelToRegion must take exactly (playerId, regionId) — never a caller-supplied price");
});

// (18) duplicate/double-click requests for the same destination cannot
// double-charge: once the first request lands, the player is already at
// that destination, so a second (sequential, simulating a fast duplicate
// submit) request for the SAME destination is a clean no-op, not a second
// deduction.
test("(18) a duplicate request for the same destination the player just arrived at never double-charges", async () => {
  seedPlayerProfile({ id: "p7", regionId: "kanto", coins: 10_000 });

  const first = await travelToRegion("p7", "galar"); // 900
  assert.equal(first, "success");
  assert.equal(getPlayerProfileRow("p7")!.coins, 10_000 - 900);

  const duplicate = await travelToRegion("p7", "galar");
  assert.equal(duplicate, "same-region", "a duplicate request for the destination the player is already at must never charge again");
  assert.equal(getPlayerProfileRow("p7")!.coins, 10_000 - 900, "balance must be unchanged by the duplicate request");
});

// PRE-EXISTING SAFETY RULE (section 7) — an in-progress field battle
// session is still forfeited on a real region change, exactly as before
// this task, but a rejected/no-op travel (insufficient funds, or already
// in that region) must never touch it.
test("insufficient-funds travel never forfeits an in-progress field battle session", async () => {
  seedPlayerProfile({ id: "p9", regionId: "kanto", coins: 10 });
  seedPlayerPokemon({ id: "pkmn9", playerId: "p9" });
  seedFieldBattleSession({
    playerId: "p9",
    zoneId: "grassland",
    wildSpeciesId: "1",
    wildLevel: 5,
    wildCurrentHp: 10,
    wildMaxHp: 10,
    activePlayerPokemonId: "pkmn9",
  });

  const result = await travelToRegion("p9", "paldea"); // costs 1000, player only has 10

  assert.equal(result, "insufficient-funds");
  assert.ok(getFieldBattleSessionRow("p9"), "a rejected travel must never forfeit an in-progress field battle session");
});

test("a successful travel still forfeits an in-progress field battle session, exactly as before this task", async () => {
  seedPlayerProfile({ id: "p10", regionId: "kanto", coins: 1000 });
  seedPlayerPokemon({ id: "pkmn10", playerId: "p10" });
  seedFieldBattleSession({
    playerId: "p10",
    zoneId: "grassland",
    wildSpeciesId: "1",
    wildLevel: 5,
    wildCurrentHp: 10,
    wildMaxHp: 10,
    activePlayerPokemonId: "pkmn10",
  });

  const result = await travelToRegion("p10", "sinnoh"); // costs 500, affordable

  assert.equal(result, "success");
  assert.equal(getFieldBattleSessionRow("p10"), undefined, "a real region change must still forfeit the in-progress session");
});
