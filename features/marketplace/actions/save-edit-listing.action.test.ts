// MARKETPLACE PHASE 6 — saveEditListingAction pulls in next/headers via
// getCurrentSession, so it isn't importable directly under this project's
// plain node:test runner. Verified by reading the real source text.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const actionSrc = fs.readFileSync("features/marketplace/actions/save-edit-listing.action.ts", "utf8").replace(/\r\n/g, "\n");

test("sellerId is resolved from the authenticated session, never accepted as a parameter", () => {
  assert.match(actionSrc, /export async function saveEditListingAction\(listingId: string, input: CreateListingInput\)/);
  assert.match(actionSrc, /const session = await getCurrentSession\(\);/);
  assert.match(actionSrc, /const profile = await getPlayerProfile\(session\.user\.id\);/);
  assert.match(actionSrc, /saveEditListing\(profile\.id, listingId, input\)/);
});

test("an unauthenticated request is rejected before ever calling saveEditListing", () => {
  assert.match(actionSrc, /if \(!session\) return \{ status: "error", message: "יש להתחבר מחדש\." \};/);
});
