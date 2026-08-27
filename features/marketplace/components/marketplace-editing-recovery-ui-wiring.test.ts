// MARKETPLACE PHASE 7 (hardening) — "editing recovery" UI wiring coverage
// via source reads, same technique as marketplace-edit-ui-wiring.test.ts /
// marketplace-purchase-ui-wiring.test.ts: MarketplaceContent is a Client
// Component (useRouter, useState/useTransition), not importable directly
// under this project's plain node:test runner.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

function readSourceNormalized(path: string): string {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const contentSrc = readSourceNormalized("features/marketplace/components/MarketplaceContent.tsx");
const pageSrc = readSourceNormalized("app/(game)/marketplace/page.tsx");

test("MarketplacePage fetches getOwnEditingListings and passes it through as ownEditingListings", () => {
  assert.match(
    pageSrc,
    /import \{ getActiveMarketplaceListings, getOwnEditingListings \} from "@\/features\/marketplace\/services\/marketplace-view\.service";/
  );
  assert.match(pageSrc, /getOwnEditingListings\(profile\.id\)/);
  assert.match(pageSrc, /ownEditingListings=\{ownEditingListings\}/);
});

test("resuming an abandoned edit sets local state directly, never re-calling enterEditListingAction", () => {
  assert.match(contentSrc, /function handleResumeEditing\(listing: MarketplaceListingView\) \{/);
  const resumeBody = contentSrc.slice(
    contentSrc.indexOf("function handleResumeEditing"),
    contentSrc.indexOf("}", contentSrc.indexOf("function handleResumeEditing"))
  );
  assert.match(resumeBody, /setEditingListing\(listing\);/);
  assert.doesNotMatch(resumeBody, /enterEditListingAction/);
  assert.match(contentSrc, /onClick=\{\(\) => handleResumeEditing\(listing\)\}/);
});

test("cancelling an abandoned edit calls the real cancelEditListingAction and refreshes", () => {
  assert.match(contentSrc, /function handleCancelAbandonedEdit\(listingId: string\) \{/);
  const cancelBody = contentSrc.slice(
    contentSrc.indexOf("function handleCancelAbandonedEdit"),
    contentSrc.indexOf("const editInitialSelection")
  );
  assert.match(cancelBody, /await cancelEditListingAction\(listingId\);/);
  assert.match(cancelBody, /router\.refresh\(\);/);
  assert.match(contentSrc, /onClick=\{\(\) => handleCancelAbandonedEdit\(listing\.id\)\}/);
});

test("the recovery banner excludes the listing currently open in the (reused) editor, avoiding a duplicate banner+modal", () => {
  assert.match(contentSrc, /ownEditingListings\s*\.filter\(\(listing\) => listing\.id !== editingListing\?\.id\)/);
});

test("no new modal or Server Action was introduced for editing recovery — it reuses editingListing state and cancelEditListingAction", () => {
  const editingRecoverySection = contentSrc.slice(
    contentSrc.indexOf("{ownEditingListings"),
    contentSrc.indexOf("{listings.length === 0")
  );
  assert.doesNotMatch(editingRecoverySection, /Modal/);
});
