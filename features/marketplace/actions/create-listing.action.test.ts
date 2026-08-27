// MARKETPLACE PHASE 3 — createMarketplaceListingAction pulls in
// next/headers via getCurrentSession, so it isn't importable directly
// under this project's plain node:test runner — same convention every
// other next/headers-dependent action's own boundary test in this codebase
// already follows (e.g. request-account-deletion.action.ts). Verified by
// reading the real source text instead.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const actionSrc = fs.readFileSync("features/marketplace/actions/create-listing.action.ts", "utf8").replace(/\r\n/g, "\n");
const schemaSrc = fs.readFileSync("features/marketplace/validation/create-listing.schema.ts", "utf8").replace(/\r\n/g, "\n");

test("sellerId is resolved from the authenticated session, never accepted as a parameter", () => {
  assert.match(actionSrc, /export async function createMarketplaceListingAction\(input: CreateListingInput\)/);
  assert.match(actionSrc, /const session = await getCurrentSession\(\);/);
  assert.match(actionSrc, /const profile = await getPlayerProfile\(session\.user\.id\);/);
  assert.match(actionSrc, /createMarketplaceListing\(profile\.id, input\)/);
});

test("an unauthenticated request is rejected before ever calling createMarketplaceListing", () => {
  assert.match(actionSrc, /if \(!session\) return \{ status: "error", message: "יש להתחבר מחדש\." \};/);
});

test("CreateListingInput never carries a sellerId/playerId field the caller could set", () => {
  // Strip comment lines first — the schema's own doc comment mentions
  // "sellerId" in prose to explain why it's absent; this checks for an
  // actual field declaration, not that word appearing anywhere at all.
  const codeOnly = schemaSrc
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
  assert.ok(!/\bsellerId\s*:|\bplayerId\s*:/.test(codeOnly), "the input schema must never declare an identity field the caller could set");
});
