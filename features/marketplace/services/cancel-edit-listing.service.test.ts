// MARKETPLACE PHASE 6 — focused coverage for cancelEditListing: the
// editing -> active restore, and that nothing else about the listing is
// ever touched (enterEditListing never mutated locks/price, so there is
// nothing to restore, only a status flip to undo).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { cancelEditListing } from "@/features/marketplace/services/cancel-edit-listing.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedMarketplaceListing, seedMarketplaceListingPokemon, seedPlayerPokemon, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const SELLER_ID = "seller-1";
const OTHER_PLAYER_ID = "other-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: SELLER_ID, level: 5 });
  seedPlayerProfile({ id: OTHER_PLAYER_ID, level: 5 });
});

test("success: an editing listing is restored to active, price and locks completely unchanged", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 250, priceGold: 5 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });

  const result = await cancelEditListing(SELLER_ID, listing.id);
  assert.deepEqual(result, { status: "success" });

  const updated = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(updated?.status, "active");
  assert.equal(updated?.priceMoney, 250, "price must be exactly what it was — cancel-edit never touches it");
  assert.equal(updated?.priceGold, 5);

  const lock = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "mon-1" } });
  assert.ok(lock, "the Pokémon must still be locked in the listing — cancel-edit never releases anything");
});

test("not-owner: another player cannot cancel-edit someone else's listing", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100 });

  const result = await cancelEditListing(OTHER_PLAYER_ID, listing.id);
  assert.deepEqual(result, { status: "not-owner" });
});

test("listing-unavailable: a listing that isn't currently in editing cannot be cancel-edited", async () => {
  const active = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });
  const sold = seedMarketplaceListing({ sellerId: SELLER_ID, status: "sold", priceMoney: 100 });

  assert.deepEqual(await cancelEditListing(SELLER_ID, active.id), { status: "listing-unavailable" });
  assert.deepEqual(await cancelEditListing(SELLER_ID, sold.id), { status: "listing-unavailable" });
});

test("listing-unavailable: a non-existent listing id is rejected cleanly", async () => {
  const result = await cancelEditListing(SELLER_ID, "no-such-listing");
  assert.deepEqual(result, { status: "listing-unavailable" });
});
