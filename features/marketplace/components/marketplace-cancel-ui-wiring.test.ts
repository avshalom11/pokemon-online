// MARKETPLACE PHASE 5 — UI wiring coverage via source reads, same
// technique as marketplace-purchase-ui-wiring.test.ts: these are Client
// Components (useRouter, useState/useTransition) not importable directly
// under this project's plain node:test runner, so the actual gating/wiring
// is verified by reading the real source text.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

function readSourceNormalized(path: string): string {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const detailModalSrc = readSourceNormalized("features/marketplace/components/MarketplaceListingDetailModal.tsx");
const contentSrc = readSourceNormalized("features/marketplace/components/MarketplaceContent.tsx");

test("the Cancel button ('בטל מכירה') only ever renders for the listing's own seller", () => {
  // MARKETPLACE PHASE 6 — own-listing viewers now see Edit AND Cancel side
  // by side (isConfirming ? (...) : isOwnListing ? (...) : (...)), rather
  // than Cancel alone.
  assert.match(detailModalSrc, /\) : isOwnListing \? \(/);
  assert.match(detailModalSrc, />\s*בטל מכירה\s*<\/button>/);
});

test("cancelling requires an explicit confirmation step before calling the server Action", () => {
  assert.match(detailModalSrc, /onClick=\{handleConfirmCancel\}/);
  assert.match(detailModalSrc, /לבטל את המכירה הזו\?/, "the confirm step must ask before actually cancelling");
});

test("the confirm handler calls the real cancel Server Action, and branches success vs. stale vs. other errors distinctly", () => {
  assert.match(detailModalSrc, /import \{ cancelMarketplaceListingAction \} from "@\/features\/marketplace\/actions\/cancel-listing\.action";/);
  assert.match(detailModalSrc, /function handleConfirmCancel\(\) \{/);
  assert.match(detailModalSrc, /const result = await cancelMarketplaceListingAction\(listing\.id\);/);
  assert.match(detailModalSrc, /if \(result\.status === "success"\) \{\s*onCancelSuccess\(\);/);
});

test("MarketplaceContent refreshes the page after a successful cancellation, with its own distinct success message", () => {
  assert.match(contentSrc, /function handleCancelSuccess\(\) \{[\s\S]*?router\.refresh\(\);\s*\}/);
  assert.match(contentSrc, /"המכירה בוטלה בהצלחה\."/);
  assert.match(contentSrc, /onCancelSuccess=\{handleCancelSuccess\}/);
});

test("Buy and Cancel share the same confirm-step state rather than duplicating it (they are mutually exclusive by ownership)", () => {
  const isConfirmingDeclarations = detailModalSrc.match(/const \[isConfirming, setIsConfirming\] = useState/g) ?? [];
  assert.equal(isConfirmingDeclarations.length, 1, "there must be exactly one confirm-step state, shared by both flows");
});
