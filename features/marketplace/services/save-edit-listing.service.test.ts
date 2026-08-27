// MARKETPLACE PHASE 6 — focused coverage for saveEditListing: validating
// against the same rules as creation, diffing against the currently-locked
// assets, atomic commit, and full rollback on any failure. Runs the REAL
// service against the in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { saveEditListing } from "@/features/marketplace/services/save-edit-listing.service";
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
  seedPlayerProfile({ id: SELLER_ID });
  seedPlayerProfile({ id: OTHER_PLAYER_ID });
});

async function seedListingItem(listingId: string, itemId: string, quantity: number) {
  await prisma.marketplaceListingItem.create({ data: { listingId, itemId, quantity } });
}

test("success: re-submitting the exact same contents leaves everything equivalent and flips back to active", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 10, lockedQuantity: 3 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });
  await seedListingItem(listing.id, "poke-ball", 3);

  const result = await saveEditListing(SELLER_ID, listing.id, {
    playerPokemonIds: ["mon-1"],
    items: [{ itemId: "poke-ball", quantity: 3 }],
    priceMoney: 100,
  });
  assert.deepEqual(result, { status: "success" });

  const updated = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(updated?.status, "active");

  const lock = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "mon-1" } });
  assert.ok(lock, "re-submitting the listing's own current Pokémon must never be rejected as already-listed");

  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "poke-ball" } } });
  assert.equal(item?.lockedQuantity, 3, "re-submitting the same quantity must not double-lock it");
});

test("success: removes a Pokémon and adds a new one in the same save", async () => {
  seedPlayerPokemon({ id: "old-mon", playerId: SELLER_ID, speciesId: "bulbasaur" });
  seedPlayerPokemon({ id: "new-mon", playerId: SELLER_ID, speciesId: "charmander", partySlot: 1 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100 });
  seedMarketplaceListingPokemon({ playerPokemonId: "old-mon", listingId: listing.id });

  const result = await saveEditListing(SELLER_ID, listing.id, { playerPokemonIds: ["new-mon"], priceMoney: 100 });
  assert.deepEqual(result, { status: "success" });

  const oldLock = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "old-mon" } });
  assert.equal(oldLock, null, "the removed Pokémon's lock must be released");
  const oldMon = await prisma.playerPokemon.findUnique({ where: { id: "old-mon" } });
  assert.equal(oldMon?.playerId, SELLER_ID, "the removed Pokémon stays owned by the seller");
  assert.equal(oldMon?.partySlot, null, "the removed Pokémon returns to storage");

  const newLock = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "new-mon" } });
  assert.equal(newLock?.listingId, listing.id, "the newly-added Pokémon must be locked");
  const newMon = await prisma.playerPokemon.findUnique({ where: { id: "new-mon" } });
  assert.equal(newMon?.partySlot, null, "a newly-added party Pokémon must move to storage");
});

test("success: increasing a retained item's quantity locks exactly the additional delta", async () => {
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 10, lockedQuantity: 3 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100 });
  await seedListingItem(listing.id, "poke-ball", 3);

  const result = await saveEditListing(SELLER_ID, listing.id, { items: [{ itemId: "poke-ball", quantity: 7 }], priceMoney: 100 });
  assert.deepEqual(result, { status: "success" });

  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "poke-ball" } } });
  assert.equal(item?.lockedQuantity, 7, "must lock exactly the additional 4, on top of the 3 already locked");
  assert.equal(item?.quantity, 10, "raw quantity never changes");

  const listingItems = await prisma.marketplaceListingItem.findMany({ where: { listingId: listing.id } });
  assert.equal(listingItems[0]?.quantity, 7);
});

test("success: decreasing a retained item's quantity releases exactly the difference", async () => {
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 10, lockedQuantity: 8 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100 });
  await seedListingItem(listing.id, "poke-ball", 8);

  const result = await saveEditListing(SELLER_ID, listing.id, { items: [{ itemId: "poke-ball", quantity: 2 }], priceMoney: 100 });
  assert.deepEqual(result, { status: "success" });

  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "poke-ball" } } });
  assert.equal(item?.lockedQuantity, 2);
});

test("success: removing an item entirely releases its full lock and deletes the listing-item row", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 10, lockedQuantity: 4 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });
  await seedListingItem(listing.id, "poke-ball", 4);

  // The item is dropped entirely, but the listing still has the Pokémon —
  // satisfies "at least one asset" so this exercises item removal alone.
  const result = await saveEditListing(SELLER_ID, listing.id, { playerPokemonIds: ["mon-1"], priceMoney: 100, priceGold: 5 });
  assert.deepEqual(result, { status: "success" });

  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "poke-ball" } } });
  assert.equal(item?.lockedQuantity, 0);

  const listingItems = await prisma.marketplaceListingItem.findMany({ where: { listingId: listing.id } });
  assert.deepEqual(listingItems, []);
});

test("success: a brand new item stack is added and locked", async () => {
  seedInventoryItem({ playerId: SELLER_ID, itemId: "potion", quantity: 5 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100 });

  const result = await saveEditListing(SELLER_ID, listing.id, { items: [{ itemId: "potion", quantity: 2 }], priceMoney: 100 });
  assert.deepEqual(result, { status: "success" });

  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "potion" } } });
  assert.equal(item?.lockedQuantity, 2);
});

test("success: price alone can be changed with no asset changes", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100, priceGold: 0 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });

  const result = await saveEditListing(SELLER_ID, listing.id, { playerPokemonIds: ["mon-1"], priceMoney: 50, priceGold: 20 });
  assert.deepEqual(result, { status: "success" });

  const updated = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(updated?.priceMoney, 50);
  assert.equal(updated?.priceGold, 20);
});

test("invalid-input: saving with no assets and no price is rejected, listing stays in editing", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100 });

  const result = await saveEditListing(SELLER_ID, listing.id, {});
  assert.equal(result.status, "invalid-input");

  const untouched = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(untouched?.status, "editing");
});

test("pokemon-unavailable: adding the Starter is rejected, nothing committed", async () => {
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });
  seedPlayerPokemon({ id: "starter-mon", playerId: SELLER_ID, speciesId: "charmander", isStarter: true });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100 });
  seedMarketplaceListingPokemon({ playerPokemonId: "mon-1", listingId: listing.id });

  const result = await saveEditListing(SELLER_ID, listing.id, { playerPokemonIds: ["mon-1", "starter-mon"], priceMoney: 100 });
  assert.deepEqual(result, { status: "pokemon-unavailable", playerPokemonId: "starter-mon", reason: "is-starter" });

  const starterLock = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "starter-mon" } });
  assert.equal(starterLock, null, "the rejected Pokémon must never be locked");
  const originalLock = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "mon-1" } });
  assert.ok(originalLock, "the original, still-valid Pokémon must remain locked (nothing rolled back should touch it)");
  const untouchedListing = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(untouchedListing?.status, "editing", "a failed save must leave the listing in editing, never flip to active");
});

test("insufficient-item-quantity: requesting more than actually available is rejected, nothing committed", async () => {
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 5, lockedQuantity: 2 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100 });
  await seedListingItem(listing.id, "poke-ball", 2);

  // Only 3 more available (5 - 2), asking to raise the lock to 10 needs 8 more.
  const result = await saveEditListing(SELLER_ID, listing.id, { items: [{ itemId: "poke-ball", quantity: 10 }], priceMoney: 100 });
  assert.deepEqual(result, { status: "insufficient-item-quantity", itemId: "poke-ball" });

  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "poke-ball" } } });
  assert.equal(item?.lockedQuantity, 2, "a rejected save must never partially change lockedQuantity");

  const listingItems = await prisma.marketplaceListingItem.findMany({ where: { listingId: listing.id } });
  assert.equal(listingItems[0]?.quantity, 2, "the listing's own recorded quantity must be unchanged on failure");

  const untouchedListing = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(untouchedListing?.status, "editing");
});

test("not-owner: another player cannot save an edit on someone else's listing", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100 });

  const result = await saveEditListing(OTHER_PLAYER_ID, listing.id, { playerPokemonIds: ["some-mon"], priceMoney: 200 });
  assert.deepEqual(result, { status: "not-owner" });
});

test("listing-unavailable: saving a listing that isn't currently in editing is rejected", async () => {
  const active = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });
  const sold = seedMarketplaceListing({ sellerId: SELLER_ID, status: "sold", priceMoney: 100 });

  assert.deepEqual(await saveEditListing(SELLER_ID, active.id, { playerPokemonIds: ["some-mon"], priceMoney: 200 }), {
    status: "listing-unavailable",
  });
  assert.deepEqual(await saveEditListing(SELLER_ID, sold.id, { playerPokemonIds: ["some-mon"], priceMoney: 200 }), {
    status: "listing-unavailable",
  });
});

test("listing-unavailable: a non-existent listing id is rejected cleanly", async () => {
  const result = await saveEditListing(SELLER_ID, "no-such-listing", { playerPokemonIds: ["some-mon"], priceMoney: 100 });
  assert.deepEqual(result, { status: "listing-unavailable" });
});
