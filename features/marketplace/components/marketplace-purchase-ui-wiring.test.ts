// MARKETPLACE PHASE 4 — UI wiring coverage via source reads, same
// technique as account-deletion.ui-wiring.boundary.test.ts: these are
// Client Components (useRouter, useState/useTransition) not importable
// directly under this project's plain node:test runner, so the actual
// gating/wiring is verified by reading the real source text.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

function readSourceNormalized(path: string): string {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const detailModalSrc = readSourceNormalized("features/marketplace/components/MarketplaceListingDetailModal.tsx");
const contentSrc = readSourceNormalized("features/marketplace/components/MarketplaceContent.tsx");

test("the Buy button is gated behind not being the listing's own seller", () => {
  assert.match(detailModalSrc, /const isOwnListing = listing\.sellerId === viewerPlayerId;/);
  // MARKETPLACE PHASE 5/6 — own-listing viewers now see Edit + Cancel
  // actions instead of a Buy button (see marketplace-cancel-ui-wiring.test.ts
  // and marketplace-edit-ui-wiring.test.ts for those flows' own coverage) —
  // this just confirms Buy itself is only ever offered in the non-own-
  // listing branch of the same isConfirming ? (...) : isOwnListing ? (...) : (...)
  // structure.
  assert.match(detailModalSrc, /\) : isOwnListing \? \([\s\S]*?\) : \(/);
  assert.match(detailModalSrc, />\s*קנה מכירה זו\s*<\/button>/);
  assert.match(detailModalSrc, /onClick=\{handleConfirmCancel\}/);
  assert.match(detailModalSrc, /onClick=\{handleConfirmPurchase\}/);
});

test("purchasing requires an explicit confirmation step before calling the server Action", () => {
  assert.match(detailModalSrc, /const \[isConfirming, setIsConfirming\] = useState/);
  assert.match(detailModalSrc, /onClick=\{\(\) => \{\s*setErrorMessage\(null\);\s*setIsConfirming\(true\);\s*\}\}/, "clicking Buy must only open the confirm step, never call the action directly");
  assert.match(detailModalSrc, /onClick=\{handleConfirmPurchase\}/, "the confirm step's own button is what actually triggers the purchase");
});

test("the confirm handler calls the real purchase Server Action, and branches success vs. stale vs. other errors distinctly", () => {
  assert.match(detailModalSrc, /import \{ purchaseMarketplaceListingAction \} from "@\/features\/marketplace\/actions\/purchase-listing\.action";/);
  assert.match(detailModalSrc, /const result = await purchaseMarketplaceListingAction\(listing\.id\);/);
  assert.match(detailModalSrc, /if \(result\.status === "success"\) \{\s*onPurchaseSuccess\(\);/);
  assert.match(detailModalSrc, /if \(result\.status === "listing-unavailable"\) \{\s*onListingStale\(\);/);
});

test("MarketplaceContent refreshes the page after both a successful purchase and a stale-listing rejection", () => {
  assert.match(contentSrc, /function handlePurchaseSuccess\(\) \{[\s\S]*?router\.refresh\(\);\s*\}/);
  assert.match(contentSrc, /function handleListingStale\(\) \{[\s\S]*?router\.refresh\(\);\s*\}/);
  assert.match(contentSrc, /onPurchaseSuccess=\{handlePurchaseSuccess\}/);
  assert.match(contentSrc, /onListingStale=\{handleListingStale\}/);
});

test("viewerPlayerId flows from MarketplaceContent into the detail modal, never re-derived client-side", () => {
  assert.match(contentSrc, /viewerPlayerId=\{viewerPlayerId\}/);
});
