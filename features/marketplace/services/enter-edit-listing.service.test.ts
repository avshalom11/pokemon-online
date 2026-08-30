// MARKETPLACE PHASE 6 — focused coverage for enterEditListing: the atomic
// active -> editing claim, and the "purchase/cancel vs enter-edit" race
// this phase's own spec calls out. Runs the REAL service against the
// in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { enterEditListing } from "@/features/marketplace/services/enter-edit-listing.service";
import { purchaseMarketplaceListing } from "@/features/marketplace/services/purchase-listing.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedMarketplaceListing, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const SELLER_ID = "seller-1";
const OTHER_PLAYER_ID = "other-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: SELLER_ID, level: 5 });
  seedPlayerProfile({ id: OTHER_PLAYER_ID, level: 5, coins: 1000, gold: 100 });
});

test("success: an active listing flips to editing", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });

  const result = await enterEditListing(SELLER_ID, listing.id);
  assert.deepEqual(result, { status: "success" });

  const updated = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(updated?.status, "editing");
});

test("not-owner: another player cannot enter edit mode on someone else's listing", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });

  const result = await enterEditListing(OTHER_PLAYER_ID, listing.id);
  assert.deepEqual(result, { status: "not-owner" });

  const untouched = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.equal(untouched?.status, "active");
});

test("listing-unavailable: a non-existent listing id is rejected cleanly", async () => {
  const result = await enterEditListing(SELLER_ID, "no-such-listing");
  assert.deepEqual(result, { status: "listing-unavailable" });
});

test("listing-unavailable: an already-sold/already-editing/cancelled listing cannot enter edit mode", async () => {
  const sold = seedMarketplaceListing({ sellerId: SELLER_ID, status: "sold", priceMoney: 100 });
  const editing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "editing", priceMoney: 100 });
  const cancelled = seedMarketplaceListing({ sellerId: SELLER_ID, status: "cancelled", priceMoney: 100 });

  assert.deepEqual(await enterEditListing(SELLER_ID, sold.id), { status: "listing-unavailable" });
  assert.deepEqual(await enterEditListing(SELLER_ID, editing.id), { status: "listing-unavailable" });
  assert.deepEqual(await enterEditListing(SELLER_ID, cancelled.id), { status: "listing-unavailable" });
});

test("concurrency: a buyer's purchase racing the seller's own enter-edit — only one may win", async () => {
  const listing = seedMarketplaceListing({ sellerId: SELLER_ID, status: "active", priceMoney: 100 });

  const [purchaseResult, editResult] = await Promise.all([
    purchaseMarketplaceListing(OTHER_PLAYER_ID, listing.id),
    enterEditListing(SELLER_ID, listing.id),
  ]);

  const wins = [purchaseResult.status, editResult.status].filter((status) => status === "success").length;
  assert.equal(wins, 1, "exactly one of purchase/enter-edit must win, never both, never neither");

  const finalListing = await prisma.marketplaceListing.findUnique({ where: { id: listing.id } });
  assert.ok(finalListing?.status === "sold" || finalListing?.status === "editing");
});
