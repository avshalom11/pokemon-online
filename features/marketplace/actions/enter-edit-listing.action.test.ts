// MARKETPLACE PHASE 6 — enterEditListingAction pulls in next/headers via
// getCurrentSession, so it isn't importable directly under this project's
// plain node:test runner. Verified by reading the real source text.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const actionSrc = fs.readFileSync("features/marketplace/actions/enter-edit-listing.action.ts", "utf8").replace(/\r\n/g, "\n");

test("sellerId is resolved from the authenticated session, never accepted as a parameter", () => {
  assert.match(actionSrc, /export async function enterEditListingAction\(listingId: string\)/);
  assert.match(actionSrc, /const session = await getCurrentSession\(\);/);
  assert.match(actionSrc, /const profile = await getPlayerProfile\(session\.user\.id\);/);
  assert.match(actionSrc, /enterEditListing\(profile\.id, listingId\)/);
});

test("an unauthenticated request is rejected before ever calling enterEditListing", () => {
  assert.match(actionSrc, /if \(!session\) return \{ status: "unauthenticated", message: "יש להתחבר מחדש\." \};/);
});
