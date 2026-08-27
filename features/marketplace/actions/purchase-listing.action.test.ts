// MARKETPLACE PHASE 4 — purchaseMarketplaceListingAction pulls in
// next/headers via getCurrentSession, so it isn't importable directly
// under this project's plain node:test runner — same convention every
// other next/headers-dependent action's own boundary test in this codebase
// already follows. Verified by reading the real source text instead.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const actionSrc = fs.readFileSync("features/marketplace/actions/purchase-listing.action.ts", "utf8").replace(/\r\n/g, "\n");

test("buyerId is resolved from the authenticated session, never accepted as a parameter", () => {
  assert.match(actionSrc, /export async function purchaseMarketplaceListingAction\(listingId: string\)/);
  assert.match(actionSrc, /const session = await getCurrentSession\(\);/);
  assert.match(actionSrc, /const profile = await getPlayerProfile\(session\.user\.id\);/);
  assert.match(actionSrc, /purchaseMarketplaceListing\(profile\.id, listingId\)/);
});

test("an unauthenticated request is rejected before ever calling purchaseMarketplaceListing", () => {
  assert.match(actionSrc, /if \(!session\) return \{ status: "unauthenticated", message: "יש להתחבר מחדש\." \};/);
});

test("the specific failure reason (own-listing / listing-unavailable / insufficient-funds) is passed through, never collapsed to one generic error", () => {
  assert.match(actionSrc, /status: "own-listing"; message: string/);
  assert.match(actionSrc, /status: "listing-unavailable"; message: string/);
  assert.match(actionSrc, /status: "insufficient-funds"; message: string/);
  assert.match(actionSrc, /return \{ status: result\.status, message: ERROR_MESSAGES\[result\.status\] \};/);
});
