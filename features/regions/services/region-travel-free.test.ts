// FREE FLY/SURF TRAVEL — behavioral coverage for hasFreeTravelEligibility
// and travelToRegionFree (region.service.ts), against the fake Prisma DB,
// same "real service, fake DB" shape region-travel-cost.test.ts already
// uses for the paid path. Deliberately its own file rather than appended to
// that one — a distinct topic (eligibility + a zero-cost travel path)
// sharing only the module under test, not the paid path's own 18 numbered
// cases.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { hasFreeTravelEligibility, travelToRegion, travelToRegionFree } from "@/features/regions/services/region.service";
import {
  getFieldBattleSessionRow,
  getPlayerProfileRow,
  resetFakeDb,
  seedFieldBattleSession,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("an active-party Pokémon that knows Fly makes the player eligible for free travel", async () => {
  seedPlayerProfile({ id: "p1", regionId: "kanto", coins: 0 });
  seedPlayerPokemon({ id: "mon1", playerId: "p1", partySlot: 1 });
  seedKnownMove({ playerPokemonId: "mon1", moveId: "fly", slot: 1 });

  assert.equal(await hasFreeTravelEligibility("p1"), true);
});

test("an active-party Pokémon that knows Surf makes the player eligible for free travel", async () => {
  seedPlayerProfile({ id: "p2", regionId: "kanto", coins: 0 });
  seedPlayerPokemon({ id: "mon2", playerId: "p2", partySlot: 1 });
  seedKnownMove({ playerPokemonId: "mon2", moveId: "surf", slot: 1 });

  assert.equal(await hasFreeTravelEligibility("p2"), true);
});

test("a STORAGE-only Pokémon (partySlot null) that knows Fly or Surf does NOT qualify", async () => {
  seedPlayerProfile({ id: "p3", regionId: "kanto", coins: 0 });
  seedPlayerPokemon({ id: "mon3a", playerId: "p3", partySlot: null });
  seedKnownMove({ playerPokemonId: "mon3a", moveId: "fly", slot: 1 });
  seedPlayerPokemon({ id: "mon3b", playerId: "p3", partySlot: null });
  seedKnownMove({ playerPokemonId: "mon3b", moveId: "surf", slot: 1 });

  assert.equal(await hasFreeTravelEligibility("p3"), false);
});

test("a FAINTED active-party Pokémon (currentHp 0) that knows Fly or Surf still qualifies — no HP/status requirement", async () => {
  seedPlayerProfile({ id: "p4", regionId: "kanto", coins: 0 });
  seedPlayerPokemon({ id: "mon4", playerId: "p4", partySlot: 1, currentHp: 0, status: null });
  seedKnownMove({ playerPokemonId: "mon4", moveId: "fly", slot: 1 });

  assert.equal(await hasFreeTravelEligibility("p4"), true);
});

test("a party Pokémon that knows neither Fly nor Surf does not make the player eligible, even with other known moves", async () => {
  seedPlayerProfile({ id: "p5", regionId: "kanto", coins: 0 });
  seedPlayerPokemon({ id: "mon5", playerId: "p5", partySlot: 1 });
  seedKnownMove({ playerPokemonId: "mon5", moveId: "tackle", slot: 1 });
  seedKnownMove({ playerPokemonId: "mon5", moveId: "ember", slot: 2 });

  assert.equal(await hasFreeTravelEligibility("p5"), false);
});

test("no party Pokémon at all — never eligible", async () => {
  seedPlayerProfile({ id: "p6", regionId: "kanto", coins: 0 });

  assert.equal(await hasFreeTravelEligibility("p6"), false);
});

test("free travel deducts ZERO coins on success", async () => {
  seedPlayerProfile({ id: "p7", regionId: "kanto", coins: 777 });
  seedPlayerPokemon({ id: "mon7", playerId: "p7", partySlot: 1 });
  seedKnownMove({ playerPokemonId: "mon7", moveId: "fly", slot: 1 });

  const result = await travelToRegionFree("p7", "paldea"); // paid cost would be 1000

  assert.equal(result, "success");
  assert.equal(getPlayerProfileRow("p7")!.coins, 777, "free travel must never touch the coins balance");
});

test("free travel changes the region correctly", async () => {
  seedPlayerProfile({ id: "p8", regionId: "kanto", coins: 0 });
  seedPlayerPokemon({ id: "mon8", playerId: "p8", partySlot: 1 });
  seedKnownMove({ playerPokemonId: "mon8", moveId: "surf", slot: 1 });

  const result = await travelToRegionFree("p8", "hoenn");

  assert.equal(result, "success");
  assert.equal(getPlayerProfileRow("p8")!.regionId, "hoenn");
});

test("free travel forfeits an in-progress field battle session, exactly like a successful paid travel", async () => {
  seedPlayerProfile({ id: "p9", regionId: "kanto", coins: 0 });
  seedPlayerPokemon({ id: "mon9", playerId: "p9", partySlot: 1 });
  seedKnownMove({ playerPokemonId: "mon9", moveId: "fly", slot: 1 });
  seedFieldBattleSession({
    playerId: "p9",
    zoneId: "grassland",
    wildSpeciesId: "1",
    wildLevel: 5,
    wildCurrentHp: 10,
    wildMaxHp: 10,
    activePlayerPokemonId: "mon9",
  });

  const result = await travelToRegionFree("p9", "sinnoh");

  assert.equal(result, "success");
  assert.equal(getFieldBattleSessionRow("p9"), undefined, "a real region change via free travel must forfeit the in-progress session");
});

test("a player with NO qualifying party Pokémon is rejected by travelToRegionFree — 'not-eligible', region and coins untouched", async () => {
  seedPlayerProfile({ id: "p10", regionId: "kanto", coins: 500 });
  seedPlayerPokemon({ id: "mon10", playerId: "p10", partySlot: 1 }); // knows nothing

  const result = await travelToRegionFree("p10", "johto");

  assert.equal(result, "not-eligible");
  const row = getPlayerProfileRow("p10")!;
  assert.equal(row.coins, 500, "coins must be untouched on a rejected free-travel attempt");
  assert.equal(row.regionId, "kanto", "region must never change on a rejected free-travel attempt");
});

test("selecting the CURRENT region via the free path is a safe no-op ('same-region'), never a forfeit or mutation", async () => {
  seedPlayerProfile({ id: "p11", regionId: "hoenn", coins: 42 });
  seedPlayerPokemon({ id: "mon11", playerId: "p11", partySlot: 1 });
  seedKnownMove({ playerPokemonId: "mon11", moveId: "fly", slot: 1 });
  seedFieldBattleSession({
    playerId: "p11",
    zoneId: "grassland",
    wildSpeciesId: "1",
    wildLevel: 5,
    wildCurrentHp: 10,
    wildMaxHp: 10,
    activePlayerPokemonId: "mon11",
  });

  const result = await travelToRegionFree("p11", "hoenn");

  assert.equal(result, "same-region");
  assert.equal(getPlayerProfileRow("p11")!.coins, 42);
  assert.ok(getFieldBattleSessionRow("p11"), "a same-region no-op must never forfeit an in-progress field battle session");
});

test("PAID travel still works normally and is completely unaffected by this feature existing", async () => {
  seedPlayerProfile({ id: "p12", regionId: "kanto", coins: 1000 });

  const result = await travelToRegion("p12", "sinnoh"); // costs 500

  assert.equal(result, "success");
  assert.equal(getPlayerProfileRow("p12")!.coins, 500);
  assert.equal(getPlayerProfileRow("p12")!.regionId, "sinnoh");
});

test("PAID travel remains available even when the player is ALSO eligible for free travel — eligibility never forces or blocks the paid path", async () => {
  seedPlayerProfile({ id: "p13", regionId: "kanto", coins: 1000 });
  seedPlayerPokemon({ id: "mon13", playerId: "p13", partySlot: 1 });
  seedKnownMove({ playerPokemonId: "mon13", moveId: "fly", slot: 1 });

  assert.equal(await hasFreeTravelEligibility("p13"), true, "sanity: this player IS free-travel eligible");

  const result = await travelToRegion("p13", "sinnoh"); // paid, costs 500

  assert.equal(result, "success");
  assert.equal(getPlayerProfileRow("p13")!.coins, 500, "the paid path must still deduct its normal cost even when free travel was also available");
});

test("server-side eligibility is authoritative: travelToRegionFree re-checks itself and cannot be bypassed by any caller-supplied flag, since it takes none", () => {
  assert.equal(travelToRegionFree.length, 2, "travelToRegionFree must take exactly (playerId, regionId) — never a caller-supplied eligibility flag");
});

test("a duplicate/double-click free-travel request for the destination the player just arrived at never re-forfeits or errors — clean 'same-region' no-op", async () => {
  seedPlayerProfile({ id: "p14", regionId: "kanto", coins: 0 });
  seedPlayerPokemon({ id: "mon14", playerId: "p14", partySlot: 1 });
  seedKnownMove({ playerPokemonId: "mon14", moveId: "surf", slot: 1 });

  const first = await travelToRegionFree("p14", "galar");
  assert.equal(first, "success");
  assert.equal(getPlayerProfileRow("p14")!.regionId, "galar");

  const duplicate = await travelToRegionFree("p14", "galar");
  assert.equal(duplicate, "same-region", "a duplicate free-travel request for the destination just arrived at must be a clean no-op");
  assert.equal(getPlayerProfileRow("p14")!.coins, 0, "still untouched — free travel never charges anything, duplicate or not");
});
