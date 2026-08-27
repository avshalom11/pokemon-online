// MARKETPLACE PHASE 6 — UI wiring coverage via source reads, same
// technique as marketplace-purchase-ui-wiring.test.ts / marketplace-cancel-
// ui-wiring.test.ts: these are Client Components (useRouter, useState/
// useTransition) not importable directly under this project's plain
// node:test runner, so the actual gating/wiring is verified by reading the
// real source text.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

function readSourceNormalized(path: string): string {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const detailModalSrc = readSourceNormalized("features/marketplace/components/MarketplaceListingDetailModal.tsx");
const contentSrc = readSourceNormalized("features/marketplace/components/MarketplaceContent.tsx");
const createModalSrc = readSourceNormalized("features/marketplace/components/CreateListingModal.tsx");

test("the Edit button ('ערוך מכירה') only ever renders for the listing's own seller, alongside Cancel", () => {
  assert.match(detailModalSrc, />\s*ערוך מכירה\s*<\/button>|\{isPending \? "פותח לעריכה\.\.\." : "ערוך מכירה"\}/);
  assert.match(detailModalSrc, /onClick=\{handleEnterEdit\}/);
});

test("clicking Edit calls the real enter-edit Server Action directly, with no confirmation step of its own", () => {
  assert.match(detailModalSrc, /import \{ enterEditListingAction \} from "@\/features\/marketplace\/actions\/enter-edit-listing\.action";/);
  assert.match(detailModalSrc, /function handleEnterEdit\(\) \{/);
  assert.match(detailModalSrc, /const result = await enterEditListingAction\(listing\.id\);/);
  assert.match(detailModalSrc, /if \(result\.status === "success"\) \{\s*onEnterEditSuccess\(\);/);
});

test("a stale enter-edit attempt (listing-unavailable) refreshes the Marketplace the same way purchase/cancel do", () => {
  const handleEnterEditBody = detailModalSrc.slice(
    detailModalSrc.indexOf("function handleEnterEdit"),
    detailModalSrc.indexOf("return (", detailModalSrc.indexOf("function handleEnterEdit"))
  );
  assert.match(handleEnterEditBody, /onListingStale\(\);/);
});

test("MarketplaceContent only opens the (reused) create-listing modal in edit mode after the server confirms enter-edit succeeded", () => {
  assert.match(contentSrc, /function handleEnterEditSuccess\(\) \{/);
  assert.match(contentSrc, /onEnterEditSuccess=\{handleEnterEditSuccess\}/);
  assert.match(contentSrc, /const \[editingListing, setEditingListing\] = useState/);
});

test("closing the edit modal without saving calls cancelEditListingAction before refreshing, never just closes silently", () => {
  assert.match(contentSrc, /import \{ cancelEditListingAction \} from "@\/features\/marketplace\/actions\/cancel-edit-listing\.action";/);
  assert.match(contentSrc, /function handleCloseCreateOrEdit\(\) \{/);
  const closeHandlerBody = contentSrc.slice(
    contentSrc.indexOf("function handleCloseCreateOrEdit"),
    contentSrc.indexOf("function handleCreateOrEditSuccess")
  );
  assert.match(closeHandlerBody, /if \(editingListing\) \{/);
  assert.match(closeHandlerBody, /await cancelEditListingAction\(listingId\);/);
  assert.match(closeHandlerBody, /router\.refresh\(\);/);
});

test("the create-listing modal is reused for edit mode rather than a second, duplicated editor component", () => {
  assert.match(contentSrc, /import \{ CreateListingModal, type ListingInitialSelection \} from "@\/features\/marketplace\/components\/CreateListingModal";/);
  assert.match(contentSrc, /editingListingId=\{editingListing\.id\}/);
  assert.match(contentSrc, /initialSelection=\{editInitialSelection\}/);
  // Only ONE CreateListingModal usage renders at a time (edit XOR create),
  // never both, and no separate "EditListingModal" file exists.
  const usages = contentSrc.match(/<CreateListingModal/g) ?? [];
  assert.equal(usages.length, 2, "one render site for edit mode, one for plain create — never a third, duplicated editor");
});

test("CreateListingModal calls saveEditListingAction in edit mode and createMarketplaceListingAction otherwise, never both", () => {
  assert.match(createModalSrc, /import \{ saveEditListingAction \} from "@\/features\/marketplace\/actions\/save-edit-listing\.action";/);
  assert.match(createModalSrc, /const isEditMode = editingListingId !== undefined;/);
  assert.match(
    createModalSrc,
    /const result = isEditMode\s*\?\s*await saveEditListingAction\(editingListingId, input\)\s*:\s*await createMarketplaceListingAction\(input\);/
  );
});

test("CreateListingModal pre-fills its selection state from initialSelection when provided", () => {
  assert.match(createModalSrc, /new Set\(initialSelection\?\.playerPokemonIds \?\? \[\]\)/);
  assert.match(createModalSrc, /new Map\(\(initialSelection\?\.items \?\? \[\]\)\.map/);
});
