"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BackButton } from "@/components/layout/BackButton";
import { cancelEditListingAction } from "@/features/marketplace/actions/cancel-edit-listing.action";
import { CreateListingModal, type ListingInitialSelection } from "@/features/marketplace/components/CreateListingModal";
import { MarketplaceListingCard } from "@/features/marketplace/components/MarketplaceListingCard";
import { MarketplaceListingDetailModal } from "@/features/marketplace/components/MarketplaceListingDetailModal";
import { MARKETPLACE_LOCKED_MESSAGE_HE } from "@/features/marketplace/data/marketplace-labels";
import type { EligibleMarketplaceItem } from "@/features/marketplace/services/eligible-assets-view.service";
import type { MarketplaceListingView } from "@/features/marketplace/services/marketplace-view.service";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

interface MarketplaceContentProps {
  // PLAYER LEVEL ACCESS REQUIREMENTS — mirrors the server-side gate
  // MarketplacePage itself already applied before ever fetching real data:
  // when false, every other prop below is a deliberately empty placeholder
  // (see MarketplacePage's own locked branch) and this component renders
  // ONLY the locked explanation, never the browse/create UI.
  marketplaceUnlocked: boolean;
  listings: MarketplaceListingView[];
  eligiblePokemon: OwnedPokemon[];
  eligibleItems: EligibleMarketplaceItem[];
  // MARKETPLACE PHASE 4 — passed straight through to
  // MarketplaceListingDetailModal so it can gate its own Buy button
  // ("own-listing") without a second server round trip just to learn who
  // the viewer is.
  viewerPlayerId: string;
  // MARKETPLACE PHASE 7 (hardening) — "editing recovery": this viewer's own
  // listings still sitting in "editing" (abandoned mid-edit by a refresh/
  // logout/crash — see getOwnEditingListings' own doc comment). Normally
  // empty; when non-empty, a small banner offers "המשך עריכה"/"בטל עריכה"
  // for each so the seller isn't permanently stuck with locked assets and
  // no in-UI way back.
  ownEditingListings: MarketplaceListingView[];
}

// MARKETPLACE PHASE 6 — the edit-listing UI's own eligible-asset lists,
// derived client-side from data already on hand rather than a second
// server round trip: `eligiblePokemon`/`eligibleItems` (this page's own
// CREATE-eligible lists) already exclude the listing-being-edited's own
// current locks (they read as "already-listed"/"locked elsewhere" from the
// create-eligibility functions' point of view — see
// eligible-assets-view.service.ts's own ForEdit variants for why). Since
// this component already has BOTH that list AND the specific listing's own
// current pokemon/items (from the already-loaded MarketplaceListingView),
// the union is exactly what getEligibleMarketplacePokemonForEdit/
// getEligibleMarketplaceItemsForEdit would compute server-side — merged
// here purely to avoid a second fetch for a value already fully knowable
// from existing props. The actual save is re-validated authoritatively
// server-side regardless (saveEditListingAction), so this merge only ever
// affects which options the picker OFFERS, never what's allowed to commit.
function mergeEligiblePokemonForEdit(createEligible: OwnedPokemon[], listingPokemon: OwnedPokemon[]): OwnedPokemon[] {
  const byId = new Map(createEligible.map((pokemon) => [pokemon.id, pokemon]));
  for (const pokemon of listingPokemon) {
    byId.set(pokemon.id, pokemon);
  }
  return [...byId.values()];
}

function mergeEligibleItemsForEdit(
  createEligible: EligibleMarketplaceItem[],
  listingItems: MarketplaceListingView["items"]
): EligibleMarketplaceItem[] {
  const byId = new Map(createEligible.map((eligible) => [eligible.item.id, eligible]));
  for (const { item, quantity } of listingItems) {
    const existing = byId.get(item.id);
    byId.set(item.id, { item, availableQuantity: (existing?.availableQuantity ?? 0) + quantity });
  }
  return [...byId.values()];
}

// MARKETPLACE PHASE 3/4/5/6 — page composition root for /marketplace. Owns
// purely presentational state (which listing's detail modal is open,
// whether the create/edit modal is open) — every real rule (asset
// availability, price validation, atomic locking) lives entirely
// server-side, same "client only orchestrates, server enforces" split
// every other *Content.tsx in this codebase already follows.
//
// After a successful listing creation, purchase, cancellation, or saved
// edit: router.refresh() re-runs MarketplacePage's own server fetch
// (getActiveMarketplaceListings + getEligibleMarketplacePokemon/Items) and
// flows fresh props back down — this is what makes the browse grid AND the
// viewer's own eligibility immediately reflect the newly-locked/released/
// transferred assets, without a second bespoke client-side re-fetch or
// optimistic patch that could drift from the real server state. A listing
// that turned out stale mid-action (MarketplaceListingDetailModal's own
// onListingStale) refreshes the exact same way.
export function MarketplaceContent({
  marketplaceUnlocked,
  listings,
  eligiblePokemon,
  eligibleItems,
  viewerPlayerId,
  ownEditingListings,
}: MarketplaceContentProps) {
  const router = useRouter();
  const [selectedListing, setSelectedListing] = useState<MarketplaceListingView | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // MARKETPLACE PHASE 6 — non-null exactly while the (reused) create-listing
  // modal is open in EDIT mode for this specific listing (already flipped
  // to "editing" server-side by MarketplaceListingDetailModal's own
  // enterEditListingAction call before this is ever set).
  const [editingListing, setEditingListing] = useState<MarketplaceListingView | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleCreateSuccess() {
    setIsCreateOpen(false);
    setSuccessMessage("המכירה פורסמה בהצלחה.");
    router.refresh();
  }

  function handlePurchaseSuccess() {
    setSelectedListing(null);
    setSuccessMessage("הרכישה בוצעה בהצלחה!");
    router.refresh();
  }

  function handleCancelSuccess() {
    setSelectedListing(null);
    setSuccessMessage("המכירה בוטלה בהצלחה.");
    router.refresh();
  }

  function handleEnterEditSuccess() {
    const listing = selectedListing;
    setSelectedListing(null);
    setSuccessMessage(null);
    setEditingListing(listing);
  }

  function handleListingStale() {
    setSelectedListing(null);
    setEditingListing(null);
    setSuccessMessage(null);
    router.refresh();
  }

  // MARKETPLACE PHASE 6 — closing the edit modal without saving must
  // release the server-side "editing" lock (cancelEditListingAction),
  // never just close silently — the listing would otherwise stay stuck
  // unbuyable/uncancellable forever. Best-effort: the result isn't branched
  // on (a stale edit session here just means someone/something else already
  // resolved it another way), the refresh afterward shows the real state
  // regardless.
  function handleCloseCreateOrEdit() {
    if (editingListing) {
      const listingId = editingListing.id;
      setEditingListing(null);
      startTransition(async () => {
        await cancelEditListingAction(listingId);
        router.refresh();
      });
      return;
    }
    setIsCreateOpen(false);
  }

  function handleCreateOrEditSuccess() {
    const wasEditing = editingListing !== null;
    setIsCreateOpen(false);
    setEditingListing(null);
    setSuccessMessage(wasEditing ? "המכירה עודכנה בהצלחה." : "המכירה פורסמה בהצלחה.");
    router.refresh();
  }

  // MARKETPLACE PHASE 7 (hardening) — "המשך עריכה": the listing is ALREADY
  // "editing" server-side (that's exactly why it showed up in
  // ownEditingListings), so this only opens the reused create/edit UI
  // locally — it must never call enterEditListingAction again (that action
  // is guarded to only claim from "active", and would reject this listing's
  // real "editing" status as stale).
  function handleResumeEditing(listing: MarketplaceListingView) {
    setSuccessMessage(null);
    setEditingListing(listing);
  }

  // MARKETPLACE PHASE 7 (hardening) — "בטל עריכה" on an abandoned edit:
  // same server action and same best-effort-refresh posture as
  // handleCloseCreateOrEdit's own cancel-on-close path above, just reachable
  // without first reopening the editor.
  function handleCancelAbandonedEdit(listingId: string) {
    startTransition(async () => {
      await cancelEditListingAction(listingId);
      setSuccessMessage("העריכה בוטלה בהצלחה.");
      router.refresh();
    });
  }

  // PLAYER LEVEL ACCESS REQUIREMENTS — a below-level viewer sees ONLY this
  // explanation, never the browse grid/create button/modals: the "must not
  // silently hide the feature without explanation" requirement, satisfied
  // by always showing the real reason rather than an empty market or a
  // missing nav entry. All hooks above are still declared unconditionally
  // regardless of this branch, per the rules of hooks.
  if (!marketplaceUnlocked) {
    return (
      <div dir="rtl" className="relative h-full w-full overflow-y-auto bg-slate-950">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
          <BackButton />
          <h1 className="text-lg font-bold text-slate-100">שוק</h1>
          <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-10 text-center text-sm font-semibold text-amber-200">
            {MARKETPLACE_LOCKED_MESSAGE_HE}
          </p>
        </div>
      </div>
    );
  }

  const editInitialSelection: ListingInitialSelection | null = editingListing
    ? {
        playerPokemonIds: editingListing.pokemon.map((pokemon) => pokemon.id),
        items: editingListing.items.map(({ item, quantity }) => ({ itemId: item.id, quantity })),
        priceMoney: editingListing.priceMoney,
        priceGold: editingListing.priceGold,
      }
    : null;

  return (
    <div dir="rtl" className="relative h-full w-full overflow-y-auto bg-slate-950">
      <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between gap-3">
          <BackButton />
          <button
            type="button"
            onClick={() => {
              setSuccessMessage(null);
              setIsCreateOpen(true);
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            צור מכירה
          </button>
        </div>

        <h1 className="text-lg font-bold text-slate-100">שוק</h1>

        {successMessage ? (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-center text-sm font-semibold text-emerald-300">
            {successMessage}
          </p>
        ) : null}

        {ownEditingListings
          .filter((listing) => listing.id !== editingListing?.id)
          .map((listing) => (
            <div
              key={listing.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
            >
              <span>יש לך מכירה שנשארה במצב עריכה. ניתן להמשיך לערוך אותה או לבטל את העריכה כדי לשחרר את הנכסים.</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleResumeEditing(listing)}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white transition-colors hover:bg-amber-500"
                >
                  המשך עריכה
                </button>
                <button
                  type="button"
                  onClick={() => handleCancelAbandonedEdit(listing.id)}
                  className="rounded-lg border border-white/20 px-3 py-1.5 font-semibold text-slate-200 transition-colors hover:bg-white/10"
                >
                  בטל עריכה
                </button>
              </div>
            </div>
          ))}

        {listings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
            אין כרגע מכירות פעילות בשוק.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <MarketplaceListingCard key={listing.id} listing={listing} onClick={() => setSelectedListing(listing)} />
            ))}
          </div>
        )}
      </div>

      {selectedListing ? (
        <MarketplaceListingDetailModal
          listing={selectedListing}
          viewerPlayerId={viewerPlayerId}
          onClose={() => setSelectedListing(null)}
          onPurchaseSuccess={handlePurchaseSuccess}
          onCancelSuccess={handleCancelSuccess}
          onEnterEditSuccess={handleEnterEditSuccess}
          onListingStale={handleListingStale}
        />
      ) : null}

      {editingListing && editInitialSelection ? (
        <CreateListingModal
          eligiblePokemon={mergeEligiblePokemonForEdit(eligiblePokemon, editingListing.pokemon)}
          eligibleItems={mergeEligibleItemsForEdit(eligibleItems, editingListing.items)}
          editingListingId={editingListing.id}
          initialSelection={editInitialSelection}
          onClose={handleCloseCreateOrEdit}
          onSuccess={handleCreateOrEditSuccess}
        />
      ) : isCreateOpen ? (
        <CreateListingModal
          eligiblePokemon={eligiblePokemon}
          eligibleItems={eligibleItems}
          onClose={handleCloseCreateOrEdit}
          onSuccess={handleCreateOrEditSuccess}
        />
      ) : null}
    </div>
  );
}
