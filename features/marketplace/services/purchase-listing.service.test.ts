// MARKETPLACE PHASE 4 — focused coverage for purchaseMarketplaceListing:
// the atomic claim, currency transfer, asset transfer, rollback-on-failure,
// and the concurrency guarantees this phase's own spec calls out. Runs the
// REAL service against the in-memory fake DB.
//
// CONCURRENCY TEST NOTE — same caveat as create-listing.service.test.ts:
// the fake DB's own $transaction fully serializes concurrent calls (a
// documented, deliberately conservative approximation), so a "racing"
// pair of calls here never genuinely interleaves; the second call's own
// pre-check/claim simply already sees the first call's committed "sold"
// status. That still proves the real guarantee this phase cares about
// (exactly one buyer ever wins, nothing double-transferred) — it just
// means these tests exercise the claim's pre-check and its own
// guarded-updateMany backstop together rather than a genuine interleaving
// window.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { purchaseMarketplaceListing } from "@/features/marketplace/services/purchase-listing.service";
import { prisma } from "@/lib/db/prisma";
import {
  getNotificationsFor,
  resetFakeDb,
  seedInventoryItem,
  seedMarketplaceListing,
  seedMarketplaceListingPokemon,
  seedPlayerPokemon,
  seedPlayerProfile,
  seedUser,
} from "../../../test/support/fakes/prisma.fake.ts";

// Mirrors real create-listing state: a listed item stack always has a
// matching PlayerInventoryItem row with lockedQuantity >= the listed
// quantity (create-listing.service.ts's own locking step). The item-
// transfer step below re-checks this guard for real, so tests exercising a
// listed item must seed it, exactly like the existing item tests already do.
async function seedListingItemWithLock(sellerId: string, listingId: string, itemId: string, quantity: number) {
  seedInventoryItem({ playerId: sellerId, itemId, quantity, lockedQuantity: quantity });
  await seedListingItem(listingId, itemId, quantity);
}

const SELLER_ID = "seller-1";
const BUYER_ID = "buyer-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: SELLER_ID, coins: 0, gold: 0 });
  seedPlayerProfile({ id: BUYER_ID, coins: 1000, gold: 100 });
});

async function seedListingItem(listingId: string, itemId: string, quantity: number) {
  await prisma.marketplaceListingItem.create({ data: { listingId, itemId, quantity } });
}

test("success: buyer is charged exactly, seller is credited exactly, no fee", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 300, priceGold: 20 });

  const result = await purchaseMarketplaceListing(BUYER_ID, listing.id);
  assert.deepEqual(result, { status: "success" });

  const buyer = await prisma.playerProfile.findUniqueOrThrow({ where: { id: BUYER_ID } });
  const seller = await prisma.playerProfile.findUniqueOrThrow({ where: { id: SELLER_ID } });
  assert.equal(buyer.coins, 1000 - 300);
  assert.equal(buyer.gold, 100 - 20);
  assert.equal(seller.coins, 300, "seller must receive the exact Money price, no fee");
  assert.equal(seller.gold, 20, "seller must receive the exact Gold price, no fee");
});

test("success: the listing ends as sold, with buyerId and soldAt set", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 50 });

  await purchaseMarketplaceListing(BUYER_ID, listing.id);

  const updated = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(updated?.status, "sold");
  assert.equal(updated?.buyerId, BUYER_ID);
  assert.ok(updated?.soldAt instanceof Date);
});

test("success: every listed Pokémon transfers ownership to the buyer", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 10 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });

  await purchaseMarketplaceListing(BUYER_ID, listing.id);

  const mon = await prisma.playerPokemon.findUnique({ where: { id: "mon-1" } });
  assert.equal(mon?.playerId, BUYER_ID, "ownership must move to the buyer");

  const lock = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "mon-1" } });
  assert.equal(lock, null, "the marketplace lock must be released once sold, or the buyer's own new Pokémon would read as permanently already-listed");
});

test("success: a purchased Pokémon lands in the buyer's first free party slot", async () => {
  seedPlayerPokemon({ id: "buyer-mon", playerId: BUYER_ID, speciesId: "squirtle", partySlot: 1 });
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 10 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });

  await purchaseMarketplaceListing(BUYER_ID, listing.id);

  const mon = await prisma.playerPokemon.findUnique({ where: { id: "mon-1" } });
  assert.equal(mon?.partySlot, 2, "must take the next free slot (1 is already occupied)");
});

test("success: multiple purchased Pokémon are assigned sequentially, each taking the next free slot", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  seedPlayerPokemon({ id: "mon-2", playerId: SELLER_ID, speciesId: "charmander" });
  seedPlayerPokemon({ id: "mon-3", playerId: SELLER_ID, speciesId: "squirtle" });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 10 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-2", listingId: listing.id });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-3", listingId: listing.id });

  await purchaseMarketplaceListing(BUYER_ID, listing.id);

  const [mon1, mon2, mon3] = await Promise.all([
    prisma.playerPokemon.findUnique({ where: { id: "mon-1" } }),
    prisma.playerPokemon.findUnique({ where: { id: "mon-2" } }),
    prisma.playerPokemon.findUnique({ where: { id: "mon-3" } }),
  ]);
  const slots = [mon1?.partySlot, mon2?.partySlot, mon3?.partySlot].sort();
  assert.deepEqual(slots, [1, 2, 3], "each Pokémon must claim its own distinct next-free slot, never collide");
});

test("success: a purchased Pokémon goes to storage once the party is full", async () => {
  for (let slot = 1; slot <= 6; slot++) {
    seedPlayerPokemon({ id: `buyer-mon-${slot}`, playerId: BUYER_ID, speciesId: "squirtle", partySlot: slot });
  }
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 10 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });

  await purchaseMarketplaceListing(BUYER_ID, listing.id);

  const mon = await prisma.playerPokemon.findUnique({ where: { id: "mon-1" } });
  assert.equal(mon?.partySlot, null, "a full party means storage, never bumping an existing member");
});

test("success: item quantity transfers to the buyer, and the seller's lockedQuantity is released in step with the decrement", async () => {
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 10, lockedQuantity: 4 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 10 });
  await seedListingItem(listing.id, "poke-ball", 4);

  await purchaseMarketplaceListing(BUYER_ID, listing.id);

  const sellerItem = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "poke-ball" } } });
  assert.equal(sellerItem?.quantity, 6, "seller loses exactly the listed quantity");
  assert.equal(sellerItem?.lockedQuantity, 0, "the matching lockedQuantity must be released in the same step, never left stranded");

  const buyerItem = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: BUYER_ID, itemId: "poke-ball" } } });
  assert.equal(buyerItem?.quantity, 4, "buyer receives the full listed quantity");

  const lock = await prisma.marketplaceListingItem.findMany({ where: { listingId: listing.id } });
  assert.deepEqual(lock, []);
});

test("success: a fully-sold item stack (seller's whole quantity was listed) leaves no zero-quantity row behind", async () => {
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 4, lockedQuantity: 4 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceGold: 5 });
  await seedListingItem(listing.id, "poke-ball", 4);

  await purchaseMarketplaceListing(BUYER_ID, listing.id);

  const sellerItem = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "poke-ball" } } });
  assert.equal(sellerItem, null, "quantity hitting zero must delete the row, same convention removeInventoryItem already follows");
});

test("own-listing: the seller cannot buy their own listing", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 10 });

  const result = await purchaseMarketplaceListing(SELLER_ID, listing.id);
  assert.deepEqual(result, { status: "own-listing" });

  const untouched = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(untouched?.status, "active", "an own-listing rejection must never change the listing");
});

test("listing-unavailable: a non-existent listing id is rejected cleanly", async () => {
  const result = await purchaseMarketplaceListing(BUYER_ID, "no-such-listing");
  assert.deepEqual(result, { status: "listing-unavailable" });
});

test("listing-unavailable: an already-sold listing cannot be bought again", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "sold", priceMoney: 10, buyerId: "someone-else" });

  const result = await purchaseMarketplaceListing(BUYER_ID, listing.id);
  assert.deepEqual(result, { status: "listing-unavailable" });
});

test("listing-unavailable: a listing currently being edited cannot be bought (stands in for a real concurrent edit, since both use the same guarded-updateMany-on-status idiom)", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 10 });

  const result = await purchaseMarketplaceListing(BUYER_ID, listing.id);
  assert.deepEqual(result, { status: "listing-unavailable" });
});

test("listing-unavailable: a cancelled listing cannot be bought", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "cancelled", priceMoney: 10 });

  const result = await purchaseMarketplaceListing(BUYER_ID, listing.id);
  assert.deepEqual(result, { status: "listing-unavailable" });
});

test("insufficient-funds: not enough Money leaves everything unchanged (buyer, seller, listing, assets)", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 5000 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });

  const result = await purchaseMarketplaceListing(BUYER_ID, listing.id);
  assert.deepEqual(result, { status: "insufficient-funds" });

  const buyer = await prisma.playerProfile.findUniqueOrThrow({ where: { id: BUYER_ID } });
  assert.equal(buyer.coins, 1000, "buyer's coins must be completely untouched on failure");

  const untouchedListing = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(untouchedListing?.status, "active", "the claim itself must roll back too, per this phase's own rule");
  assert.equal(untouchedListing?.buyerId, null);

  const mon = await prisma.playerPokemon.findUnique({ where: { id: "mon-1" } });
  assert.equal(mon?.playerId, SELLER_ID, "the Pokémon must stay with the seller when the purchase fails");
  const lock = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "mon-1" } });
  assert.ok(lock, "the Pokémon must remain locked in the (still-active) listing");
});

test("insufficient-funds: not enough Gold (even with enough Money) leaves everything unchanged", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100, priceGold: 5000 });

  const result = await purchaseMarketplaceListing(BUYER_ID, listing.id);
  assert.deepEqual(result, { status: "insufficient-funds" });

  const buyer = await prisma.playerProfile.findUniqueOrThrow({ where: { id: BUYER_ID } });
  assert.equal(buyer.coins, 1000, "the Money side must also roll back even though it alone would have been affordable");
  assert.equal(buyer.gold, 100);
});

test("concurrency: two buyers racing for the same listing never both succeed", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });
  seedPlayerProfile({ id: "buyer-2", coins: 1000, gold: 0 });

  const [first, second] = await Promise.all([
    purchaseMarketplaceListing(BUYER_ID, listing.id),
    purchaseMarketplaceListing("buyer-2", listing.id),
  ]);

  const statuses = [first.status, second.status].sort();
  assert.deepEqual(statuses, ["listing-unavailable", "success"]);

  const finalListing = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(finalListing?.status, "sold");
  assert.ok(finalListing?.buyerId === BUYER_ID || finalListing?.buyerId === "buyer-2");

  // Exactly one buyer's balance moved, never both.
  const [buyer1, buyer2] = await Promise.all([
    prisma.playerProfile.findUniqueOrThrow({ where: { id: BUYER_ID } }),
    prisma.playerProfile.findUniqueOrThrow({ where: { id: "buyer-2" } }),
  ]);
  const spentCount = [buyer1.coins, buyer2.coins].filter((coins) => coins === 900).length;
  assert.equal(spentCount, 1, "exactly one buyer must have actually been charged");
});

// ===========================================================================
// SELLER PURCHASE NOTIFICATION — MARKETPLACE_LISTING_SOLD, created for the
// seller only, listing the real buyer username and every Pokémon/item
// actually transferred.
// ===========================================================================

test("notification: a successful mixed purchase notifies the seller with the buyer's real username, every Pokémon name, and every item stack", async () => {
  seedUser({ id: BUYER_ID, username: "kanto_master" });
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "pikachu", nickname: null });
  seedPlayerPokemon({ id: "mon-2", playerId: SELLER_ID, speciesId: "mewtwo", nickname: null });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-2", listingId: listing.id });
  await seedListingItemWithLock(SELLER_ID, listing.id, "silver-chest", 2);
  await seedListingItemWithLock(SELLER_ID, listing.id, "gold-chest", 4);

  const result = await purchaseMarketplaceListing(BUYER_ID, listing.id);
  assert.deepEqual(result, { status: "success" });

  const notifications = getNotificationsFor(SELLER_ID);
  assert.equal(notifications.length, 1, "exactly one notification for the seller");
  assert.equal(notifications[0]?.type, "MARKETPLACE_LISTING_SOLD");

  const message = notifications[0]!.message;
  assert.match(message, /^המשתמש kanto_master קנה ממך:\n/);
  assert.match(message, /Pikachu/);
  assert.match(message, /Mewtwo/);
  assert.match(message, /2× .*כסף/);
  assert.match(message, /4× .*זהב/);
});

test("notification: the buyer never gets a notification of their own", async () => {
  seedUser({ id: BUYER_ID, username: "kanto_master" });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 50 });

  await purchaseMarketplaceListing(BUYER_ID, listing.id);

  assert.equal(getNotificationsFor(BUYER_ID).length, 0);
});

test("notification: none of the failure paths (own-listing, listing-unavailable, insufficient-funds) ever create a seller notification", async () => {
  seedUser({ id: BUYER_ID, username: "kanto_master" });

  const ownListing = seedMarketplaceListing({ sellerId: BUYER_ID, status: "active", priceMoney: 10 });
  await purchaseMarketplaceListing(BUYER_ID, ownListing.id);
  assert.equal(getNotificationsFor(BUYER_ID).length, 0, "own-listing rejection must not notify anyone");

  const soldListing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "sold", priceMoney: 10 });
  await purchaseMarketplaceListing(BUYER_ID, soldListing.id);
  assert.equal(getNotificationsFor(SELLER_ID).length, 0, "listing-unavailable rejection must not notify the seller");

  const tooExpensive = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 5000 });
  await purchaseMarketplaceListing(BUYER_ID, tooExpensive.id);
  assert.equal(getNotificationsFor(SELLER_ID).length, 0, "insufficient-funds rejection must not notify the seller");
});

test("notification: an all-Pokémon listing (no items) and an all-items listing (no Pokémon) each produce a correctly-shaped message", async () => {
  seedUser({ id: BUYER_ID, username: "kanto_master" });

  seedPlayerPokemon({ id: "mon-solo", playerId: SELLER_ID, speciesId: "pikachu", nickname: null });
  const pokemonOnlyListing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 10 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-solo", listingId: pokemonOnlyListing.id });
  await purchaseMarketplaceListing(BUYER_ID, pokemonOnlyListing.id);
  assert.equal(getNotificationsFor(SELLER_ID)[0]?.message, "המשתמש kanto_master קנה ממך:\nPikachu");

  seedPlayerProfile({ id: "seller-2", coins: 0, gold: 0 });
  const itemsOnlyListing = seedMarketplaceListing({ sellerId: "seller-2", status: "active", priceMoney: 10 });
  await seedListingItemWithLock("seller-2", itemsOnlyListing.id, "silver-chest", 3);
  await purchaseMarketplaceListing(BUYER_ID, itemsOnlyListing.id);
  const itemsOnlyMessage = getNotificationsFor("seller-2")[0]?.message;
  assert.match(itemsOnlyMessage ?? "", /^המשתמש kanto_master קנה ממך:\n3× .*כסף$/);
});
