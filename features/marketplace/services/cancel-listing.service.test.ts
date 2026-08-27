// MARKETPLACE PHASE 5 — focused coverage for cancelMarketplaceListing: the
// atomic claim, asset release, no-currency-change guarantee, and the
// purchase-vs-cancel race this phase's own spec calls out. Runs the REAL
// service against the in-memory fake DB.
//
// CONCURRENCY TEST NOTE — same caveat as create-listing/purchase-listing's
// own tests: the fake DB's own $transaction fully serializes concurrent
// calls, so a "racing" pair here never genuinely interleaves; the loser's
// own pre-check simply already sees the winner's committed status change.
// That still proves the real guarantee (exactly one of purchase/cancel
// ever wins the same listing) — see purchase-listing.service.test.ts's own
// doc comment for the full reasoning.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { cancelMarketplaceListing } from "@/features/marketplace/services/cancel-listing.service";
import { purchaseMarketplaceListing } from "@/features/marketplace/services/purchase-listing.service";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedInventoryItem,
  seedMarketplaceListing,
  seedMarketplaceListingPokemon,
  seedPlayerPokemon,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";

const SELLER_ID = "seller-1";
const OTHER_PLAYER_ID = "other-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: SELLER_ID, coins: 500, gold: 20 });
  seedPlayerProfile({ id: OTHER_PLAYER_ID, coins: 1000, gold: 100 });
});

async function seedListingItem(listingId: string, itemId: string, quantity: number) {
  await prisma.marketplaceListingItem.create({ data: { listingId, itemId, quantity } });
}

test("success: the listing ends as cancelled, with cancelledAt set", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });

  const result = await cancelMarketplaceListing(SELLER_ID, listing.id);
  assert.deepEqual(result, { status: "success" });

  const updated = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(updated?.status, "cancelled");
  assert.ok(updated?.cancelledAt instanceof Date);
  assert.equal(updated?.buyerId, null, "cancelling must never set a buyer");
});

test("success: no currency changes at all", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100, priceGold: 10 });

  await cancelMarketplaceListing(SELLER_ID, listing.id);

  const seller = await prisma.playerProfile.findUniqueOrThrow({ where: { id: SELLER_ID } });
  assert.equal(seller.coins, 500);
  assert.equal(seller.gold, 20);
});

test("success: every listed Pokémon stays owned by the seller, in storage (never restored to its old party slot), and its lock is released", async () => {
  // Simulates create-listing.service.ts's own effect: partySlot already
  // cleared to null at listing time.
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur", partySlot: null });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });

  await cancelMarketplaceListing(SELLER_ID, listing.id);

  const mon = await prisma.playerPokemon.findUnique({ where: { id: "mon-1" } });
  assert.equal(mon?.playerId, SELLER_ID, "ownership must never change on cancel");
  assert.equal(mon?.partySlot, null, "must stay in storage, never auto-restored to a party slot");

  const lock = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "mon-1" } });
  assert.equal(lock, null, "the marketplace lock must be released, or the seller's own Pokémon would read as permanently already-listed");
});

test("success: every listed item's lockedQuantity is released back, raw quantity untouched", async () => {
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 10, lockedQuantity: 4 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });
  await seedListingItem(listing.id, "poke-ball", 4);

  await cancelMarketplaceListing(SELLER_ID, listing.id);

  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "poke-ball" } } });
  assert.equal(item?.quantity, 10, "raw quantity must never change on cancel");
  assert.equal(item?.lockedQuantity, 0, "lockedQuantity must be released back to fully available");

  const remainingLocks = await prisma.marketplaceListingItem.findMany({ where: { listingId: listing.id } });
  assert.deepEqual(remainingLocks, []);
});

test("success: multiple Pokémon and multiple item stacks are all released together", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  seedPlayerPokemon({ id: "mon-2", playerId: SELLER_ID, speciesId: "charmander" });
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 10, lockedQuantity: 3 });
  seedInventoryItem({ playerId: SELLER_ID, itemId: "potion", quantity: 5, lockedQuantity: 2 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-2", listingId: listing.id });
  await seedListingItem(listing.id, "poke-ball", 3);
  await seedListingItem(listing.id, "potion", 2);

  await cancelMarketplaceListing(SELLER_ID, listing.id);

  const [lock1, lock2, pokeBall, potion] = await Promise.all([
    prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "mon-1" } }),
    prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "mon-2" } }),
    prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "poke-ball" } } }),
    prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "potion" } } }),
  ]);
  assert.equal(lock1, null);
  assert.equal(lock2, null);
  assert.equal(pokeBall?.lockedQuantity, 0);
  assert.equal(potion?.lockedQuantity, 0);
});

test("not-owner: another player cannot cancel someone else's listing", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });

  const result = await cancelMarketplaceListing(OTHER_PLAYER_ID, listing.id);
  assert.deepEqual(result, { status: "not-owner" });

  const untouched = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(untouched?.status, "active", "a not-owner rejection must never change the listing");
});

test("listing-unavailable: a non-existent listing id is rejected cleanly", async () => {
  const result = await cancelMarketplaceListing(SELLER_ID, "no-such-listing");
  assert.deepEqual(result, { status: "listing-unavailable" });
});

test("listing-unavailable: an already-sold listing cannot be cancelled", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "sold", priceMoney: 100, buyerId: OTHER_PLAYER_ID });

  const result = await cancelMarketplaceListing(SELLER_ID, listing.id);
  assert.deepEqual(result, { status: "listing-unavailable" });
});

test("listing-unavailable: a listing currently being edited cannot be cancelled (stands in for a real concurrent edit, same guarded-updateMany-on-status idiom)", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100 });

  const result = await cancelMarketplaceListing(SELLER_ID, listing.id);
  assert.deepEqual(result, { status: "listing-unavailable" });
});

test("listing-unavailable: an already-cancelled listing cannot be cancelled again", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "cancelled", priceMoney: 100 });

  const result = await cancelMarketplaceListing(SELLER_ID, listing.id);
  assert.deepEqual(result, { status: "listing-unavailable" });
});

test("concurrency: purchase vs. cancel racing the same listing — only one may win", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });

  const [purchaseResult, cancelResult] = await Promise.all([
    purchaseMarketplaceListing(OTHER_PLAYER_ID, listing.id),
    cancelMarketplaceListing(SELLER_ID, listing.id),
  ]);

  // Exactly one of the two operations may have actually won.
  const outcomes = [purchaseResult.status, cancelResult.status];
  const wins = outcomes.filter((status) => status === "success").length;
  assert.equal(wins, 1, "exactly one of purchase/cancel must win the race, never both, never neither");

  const finalListing = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.ok(finalListing?.status === "sold" || finalListing?.status === "cancelled");

  // The Pokémon must end up in a single, consistent state matching whichever won.
  const mon = await prisma.playerPokemon.findUnique({ where: { id: "mon-1" } });
  if (finalListing?.status === "sold") {
    assert.equal(mon?.playerId, OTHER_PLAYER_ID);
  } else {
    assert.equal(mon?.playerId, SELLER_ID);
  }
  const lock = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "mon-1" } });
  assert.equal(lock, null, "the lock must be released exactly once regardless of which operation won");
});

test("concurrency: two cancel attempts for the same listing never both succeed", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });

  const [first, second] = await Promise.all([
    cancelMarketplaceListing(SELLER_ID, listing.id),
    cancelMarketplaceListing(SELLER_ID, listing.id),
  ]);

  const statuses = [first.status, second.status].sort();
  assert.deepEqual(statuses, ["listing-unavailable", "success"]);
});
