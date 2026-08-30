// PLAYER LEVEL ACCESS REQUIREMENTS — focused coverage for the Marketplace
// minimum-player-level gate (MIN_MARKETPLACE_PLAYER_LEVEL = 5), proving the
// ONE shared helper (isMarketplaceUnlockedForPlayer) and every real
// mutating service that calls it. Runs the REAL services against the
// in-memory fake DB — same "prove the actual server-side gate, not just
// the constant" posture features/gyms/services/gym-access-rules.test.ts
// already establishes for Gyms.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { cancelMarketplaceListing } from "@/features/marketplace/services/cancel-listing.service";
import { cancelEditListing } from "@/features/marketplace/services/cancel-edit-listing.service";
import { createMarketplaceListing } from "@/features/marketplace/services/create-listing.service";
import { enterEditListing } from "@/features/marketplace/services/enter-edit-listing.service";
import { isMarketplaceUnlockedForPlayer } from "@/features/marketplace/services/marketplace-access.service";
import { purchaseMarketplaceListing } from "@/features/marketplace/services/purchase-listing.service";
import { saveEditListing } from "@/features/marketplace/services/save-edit-listing.service";
import { MIN_MARKETPLACE_PLAYER_LEVEL } from "@/features/marketplace/config/marketplace-access-rules.config";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedInventoryItem,
  seedMarketplaceListing,
  seedPlayerPokemon,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";

const SELLER_ID = "seller-1";
const BUYER_ID = "buyer-1";

beforeEach(() => {
  resetFakeDb();
});

test(`MIN_MARKETPLACE_PLAYER_LEVEL is exactly ${MIN_MARKETPLACE_PLAYER_LEVEL}`, () => {
  assert.equal(MIN_MARKETPLACE_PLAYER_LEVEL, 5);
});

test("isMarketplaceUnlockedForPlayer: level 4 is locked, level 5 is unlocked", async () => {
  seedPlayerProfile({ id: "low", level: MIN_MARKETPLACE_PLAYER_LEVEL - 1 });
  seedPlayerProfile({ id: "high", level: MIN_MARKETPLACE_PLAYER_LEVEL });

  assert.equal(await isMarketplaceUnlockedForPlayer("low"), false);
  assert.equal(await isMarketplaceUnlockedForPlayer("high"), true);
});

test("create: a level 4 seller is rejected level-locked, and no listing is ever created", async () => {
  seedPlayerProfile({ id: SELLER_ID, level: 4 });
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur", partySlot: 1 });

  const result = await createMarketplaceListing(SELLER_ID, { playerPokemonIds: ["mon-1"], priceMoney: 100 });
  assert.deepEqual(result, { status: "level-locked" });

  const listings = await prisma.marketplaceListing.findMany({ where: { sellerId: SELLER_ID } });
  assert.deepEqual(listings, [], "a blocked create must never write a listing row");
  const mon = await prisma.playerPokemon.findUnique({ where: { id: "mon-1" } });
  assert.equal(mon?.partySlot, 1, "the Pokémon must never be pulled out of its party slot on a blocked create");
});

test("create: a level 5 seller succeeds (boundary, exact minimum)", async () => {
  seedPlayerProfile({ id: SELLER_ID, level: 5 });
  seedPlayerPokemon({ id: "mon-1", playerId: SELLER_ID, speciesId: "bulbasaur" });

  const result = await createMarketplaceListing(SELLER_ID, { playerPokemonIds: ["mon-1"], priceMoney: 100 });
  assert.equal(result.status, "success");
});

test("purchase: a level 4 buyer is rejected level-locked, and nothing (currency, listing, ownership) changes", async () => {
  seedPlayerProfile({ id: SELLER_ID, level: 5, coins: 0, gold: 0 });
  seedPlayerProfile({ id: BUYER_ID, level: 4, coins: 1000, gold: 100 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 300 });

  const result = await purchaseMarketplaceListing(BUYER_ID, listing.id);
  assert.deepEqual(result, { status: "level-locked" });

  const buyer = await prisma.playerProfile.findUniqueOrThrow({ where: { id: BUYER_ID } });
  assert.equal(buyer.coins, 1000, "a blocked purchase must never charge the buyer");
  const seller = await prisma.playerProfile.findUniqueOrThrow({ where: { id: SELLER_ID } });
  assert.equal(seller.coins, 0, "a blocked purchase must never credit the seller");
  const untouched = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(untouched?.status, "active", "a blocked purchase must never claim the listing");
});

test("purchase: a level 5 buyer succeeds (boundary, exact minimum)", async () => {
  seedPlayerProfile({ id: SELLER_ID, level: 5, coins: 0, gold: 0 });
  seedPlayerProfile({ id: BUYER_ID, level: 5, coins: 1000, gold: 100 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 300 });

  const result = await purchaseMarketplaceListing(BUYER_ID, listing.id);
  assert.deepEqual(result, { status: "success" });
});

test("enter-edit: a level 4 seller is rejected level-locked, listing stays active", async () => {
  seedPlayerProfile({ id: SELLER_ID, level: 4 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });

  const result = await enterEditListing(SELLER_ID, listing.id);
  assert.deepEqual(result, { status: "level-locked" });

  const untouched = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(untouched?.status, "active");
});

test("save-edit: a level 4 seller is rejected level-locked, nothing committed", async () => {
  seedPlayerProfile({ id: SELLER_ID, level: 4 });
  seedInventoryItem({ playerId: SELLER_ID, itemId: "poke-ball", quantity: 10 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100 });

  const result = await saveEditListing(SELLER_ID, listing.id, { items: [{ itemId: "poke-ball", quantity: 3 }], priceMoney: 250 });
  assert.deepEqual(result, { status: "level-locked" });

  const untouched = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(untouched?.status, "editing", "must stay in editing, never flip to active on a blocked save");
  assert.equal(untouched?.priceMoney, 100, "price must never change on a blocked save");
  const item = await prisma.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId: SELLER_ID, itemId: "poke-ball" } } });
  assert.equal(item?.lockedQuantity ?? 0, 0, "a blocked save must never lock inventory");
});

test("cancel: a level 4 seller is rejected level-locked, listing stays active", async () => {
  seedPlayerProfile({ id: SELLER_ID, level: 4 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });

  const result = await cancelMarketplaceListing(SELLER_ID, listing.id);
  assert.deepEqual(result, { status: "level-locked" });

  const untouched = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(untouched?.status, "active");
});

test("cancel-edit: a level 4 seller is rejected level-locked, listing stays editing", async () => {
  seedPlayerProfile({ id: SELLER_ID, level: 4 });
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100 });

  const result = await cancelEditListing(SELLER_ID, listing.id);
  assert.deepEqual(result, { status: "level-locked" });

  const untouched = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(untouched?.status, "editing");
});
