"use client";

import { useState, useTransition } from "react";

import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import { cancelMarketplaceListingAction } from "@/features/marketplace/actions/cancel-listing.action";
import { enterEditListingAction } from "@/features/marketplace/actions/enter-edit-listing.action";
import { purchaseMarketplaceListingAction } from "@/features/marketplace/actions/purchase-listing.action";
import type { MarketplaceListingView } from "@/features/marketplace/services/marketplace-view.service";
import { PokemonGrid } from "@/features/pokemon/components/PokemonGrid";
import { PlayerProfileLink } from "@/features/profile/components/PlayerProfileLink";

interface MarketplaceListingDetailModalProps {
  listing: MarketplaceListingView;
  viewerPlayerId: string;
  onClose: () => void;
  // Purchase succeeded — the parent closes this modal and refreshes the
  // Marketplace (router.refresh()), per this phase's own "after success
  // refresh Marketplace immediately" rule.
  onPurchaseSuccess: () => void;
  // MARKETPLACE PHASE 5 — the seller's own "בטל מכירה" succeeded — the
  // parent closes this modal and refreshes, same reasoning as
  // onPurchaseSuccess, with its own distinct "cancelled" message.
  onCancelSuccess: () => void;
  // MARKETPLACE PHASE 6 — the seller's own "ערוך מכירה" click actually
  // flipped the listing to "editing" server-side (enterEditListingAction) —
  // the parent closes THIS modal and opens the (reused) create-listing
  // modal in edit mode, pre-filled from this exact listing. Never opened
  // speculatively before the server confirms the flip succeeded.
  onEnterEditSuccess: () => void;
  // The listing itself changed/disappeared underneath the viewer
  // (listing-unavailable, from a purchase, cancel, or enter-edit attempt)
  // — the parent closes this modal and refreshes too, so the next look at
  // the Marketplace already reflects reality, rather than leaving this
  // stale card clickable again. Distinct from a plain inline error
  // (own-listing/insufficient-funds/not-owner), where nothing external
  // changed and the modal just stays open with a message.
  onListingStale: () => void;
}

// MARKETPLACE PHASE 4/5/6 — adds the Buy button (Phase 4), the seller's own
// "בטל מכירה" (Phase 5), and the seller's own "ערוך מכירה" (Phase 6) to
// Phase 3's own detail modal (no separate dialog component — each phase's
// own instruction is to extend "the existing listing detail UI"). Buy vs.
// Cancel/Edit are mutually exclusive by construction (isOwnListing), so Buy
// and Cancel share the same `isConfirming` step state; Edit needs no
// confirm step of its own (entering edit mode is harmless/reversible —
// canceling out of the edit UI undoes it trivially — the real destructive
// action is Save, which the reused create-listing modal's own existing
// build -> confirm flow already gates). The server Actions
// (purchaseMarketplaceListingAction/cancelMarketplaceListingAction/
// enterEditListingAction) are the real enforcement of every rule; this
// component's own confirm step only exists so neither a purchase nor a
// cancellation ever fires from a single misclick.
export function MarketplaceListingDetailModal({
  listing,
  viewerPlayerId,
  onClose,
  onPurchaseSuccess,
  onCancelSuccess,
  onEnterEditSuccess,
  onListingStale,
}: MarketplaceListingDetailModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isOwnListing = listing.sellerId === viewerPlayerId;

  function handleEnterEdit() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await enterEditListingAction(listing.id);

      if (result.status === "success") {
        onEnterEditSuccess();
        return;
      }

      if (result.status === "listing-unavailable") {
        onListingStale();
        return;
      }

      setErrorMessage(result.message);
    });
  }

  function handleConfirmPurchase() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await purchaseMarketplaceListingAction(listing.id);

      if (result.status === "success") {
        onPurchaseSuccess();
        return;
      }

      if (result.status === "listing-unavailable") {
        onListingStale();
        return;
      }

      setErrorMessage(result.message);
      setIsConfirming(false);
    });
  }

  function handleConfirmCancel() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await cancelMarketplaceListingAction(listing.id);

      if (result.status === "success") {
        onCancelSuccess();
        return;
      }

      if (result.status === "listing-unavailable") {
        onListingStale();
        return;
      }

      setErrorMessage(result.message);
      setIsConfirming(false);
    });
  }

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={isPending ? undefined : onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-[0_0_40px_rgba(99,102,241,0.25)] sm:p-7"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">מוכר</p>
            <PlayerProfileLink username={listing.sellerUsername} className="text-lg font-bold text-slate-100 hover:underline">
              {listing.sellerDisplayName}
            </PlayerProfileLink>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="סגור"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-xs text-slate-500">
          {`פורסם בתאריך ${new Date(listing.createdAt).toLocaleDateString("he-IL")}`}
        </p>

        {listing.pokemon.length > 0 ? (
          <div className="mb-5">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">פוקימונים</h3>
            <PokemonGrid pokemon={listing.pokemon} onSelect={() => {}} />
          </div>
        ) : null}

        {listing.items.length > 0 ? (
          <div className="mb-5">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">פריטים</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {listing.items.map(({ item, quantity }) => (
                <div
                  key={item.id}
                  className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-slate-800/60 p-2 text-center"
                >
                  <SpriteImage
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-12 w-12 object-contain"
                    fallbackClassName="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
                  />
                  <span className="truncate text-[11px] font-semibold text-slate-100">{item.name}</span>
                  <span className="text-[10px] text-slate-400">{`x${quantity}`}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-center gap-5 rounded-xl border border-white/10 bg-slate-950/60 p-4">
          {listing.priceMoney > 0 ? (
            <span className="flex items-center gap-2 text-lg font-bold text-slate-100">
              <CurrencyIcon type="money" className="h-6 w-6" />
              <span dir="ltr">{listing.priceMoney.toLocaleString("he-IL")}</span>
            </span>
          ) : null}
          {listing.priceGold > 0 ? (
            <span className="flex items-center gap-2 text-lg font-bold text-slate-100">
              <CurrencyIcon type="gold" className="h-6 w-6" />
              <span dir="ltr">{listing.priceGold.toLocaleString("he-IL")}</span>
            </span>
          ) : null}
        </div>

        {errorMessage ? <p className="mt-4 text-center text-sm font-semibold text-rose-400">{errorMessage}</p> : null}

        {isConfirming ? (
          <div className="mt-5 flex flex-col items-center gap-3">
            <p className="text-center text-sm font-semibold text-slate-200">
              {isOwnListing ? "לבטל את המכירה הזו? הפוקימונים והפריטים יחזרו להיות זמינים לך." : "לאשר קנייה של המכירה הזו במחיר המוצג?"}
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                disabled={isPending}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                חזרה
              </button>
              {isOwnListing ? (
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isPending}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "מבטל..." : "אישור ביטול מכירה"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmPurchase}
                  disabled={isPending}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "קונה..." : "אישור קנייה"}
                </button>
              )}
            </div>
          </div>
        ) : isOwnListing ? (
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={handleEnterEdit}
              disabled={isPending}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "פותח לעריכה..." : "ערוך מכירה"}
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setIsConfirming(true);
              }}
              disabled={isPending}
              className="rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors enabled:hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              בטל מכירה
            </button>
          </div>
        ) : (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setIsConfirming(true);
              }}
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              קנה מכירה זו
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
