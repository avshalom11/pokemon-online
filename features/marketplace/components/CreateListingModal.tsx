"use client";

import { useState, useTransition } from "react";

import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import { createMarketplaceListingAction } from "@/features/marketplace/actions/create-listing.action";
import { saveEditListingAction } from "@/features/marketplace/actions/save-edit-listing.action";
import type { EligibleMarketplaceItem } from "@/features/marketplace/services/eligible-assets-view.service";
import { PokemonGrid } from "@/features/pokemon/components/PokemonGrid";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

// MARKETPLACE PHASE 6 — the full desired final state of an edit-in-progress
// listing, used to pre-fill this modal's own selection state. Always the
// listing's own CURRENT (still-locked, since entering edit mode never
// touched any lock) contents — never a diff; the diff against what's
// actually locked is computed entirely server-side by
// saveEditListing.service.ts.
export interface ListingInitialSelection {
  playerPokemonIds: string[];
  items: { itemId: string; quantity: number }[];
  priceMoney: number;
  priceGold: number;
}

interface CreateListingModalProps {
  eligiblePokemon: OwnedPokemon[];
  eligibleItems: EligibleMarketplaceItem[];
  onClose: () => void;
  onSuccess: () => void;
  // MARKETPLACE PHASE 6 — when set, this modal edits an existing listing
  // (already flipped to "editing" server-side by the caller, via
  // enterEditListingAction) instead of creating a new one: saving calls
  // saveEditListingAction(editingListingId, ...) rather than
  // createMarketplaceListingAction(...), and the picker starts pre-filled
  // from initialSelection instead of empty. `onClose` in edit mode is the
  // caller's own responsibility to translate into a real cancelEditListingAction
  // call (this component only ever calls the generic onClose/onSuccess
  // callbacks — it doesn't know or care which mode it's in beyond which
  // action to call and how to pre-fill).
  editingListingId?: string;
  initialSelection?: ListingInitialSelection;
}

type Step = "build" | "confirm";

// MARKETPLACE PHASE 3/6 — the "צור מכירה" flow, reused as-is for "ערוך
// מכירה" (Phase 6) rather than a second, duplicated editor — per that
// phase's own "reuse the create-listing UI where practical" instruction.
// Two steps (build -> confirm), same idiom as ChangeUsernameDialog: the
// server Action (createMarketplaceListingAction / saveEditListingAction) is
// the real enforcement of every rule (availability, price, quantities) —
// this component's own client-side checks (at least one asset, at least
// one positive price) only exist to give a fast, friendly first pass before
// a doomed request round-trips.
//
// Only what's already eligible (per the caller's own server-fetched
// eligiblePokemon/eligibleItems — see eligible-assets-view.service.ts's
// create AND edit variants) is ever selectable here: the Starter,
// Daycare/battle/league Pokémon, and already-locked-elsewhere item
// quantity are never even offered as options, rather than offered and then
// rejected. In edit mode the caller is responsible for passing the EDIT
// variant (getEligibleMarketplacePokemonForEdit/getEligibleMarketplaceItemsForEdit),
// which is what keeps this listing's own current assets selectable.
export function CreateListingModal({
  eligiblePokemon,
  eligibleItems,
  onClose,
  onSuccess,
  editingListingId,
  initialSelection,
}: CreateListingModalProps) {
  const isEditMode = editingListingId !== undefined;
  const [step, setStep] = useState<Step>("build");
  const [selectedPokemonIds, setSelectedPokemonIds] = useState<Set<string>>(
    () => new Set(initialSelection?.playerPokemonIds ?? [])
  );
  const [selectedItemQuantities, setSelectedItemQuantities] = useState<Map<string, number>>(
    () => new Map((initialSelection?.items ?? []).map(({ itemId, quantity }) => [itemId, quantity]))
  );
  const [priceMoney, setPriceMoney] = useState(initialSelection && initialSelection.priceMoney > 0 ? String(initialSelection.priceMoney) : "");
  const [priceGold, setPriceGold] = useState(initialSelection && initialSelection.priceGold > 0 ? String(initialSelection.priceGold) : "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const parsedPriceMoney = Math.max(0, Math.trunc(Number(priceMoney) || 0));
  const parsedPriceGold = Math.max(0, Math.trunc(Number(priceGold) || 0));
  const hasAnyAsset = selectedPokemonIds.size > 0 || selectedItemQuantities.size > 0;
  const hasAnyPrice = parsedPriceMoney > 0 || parsedPriceGold > 0;
  const canContinue = hasAnyAsset && hasAnyPrice;

  function togglePokemon(id: string) {
    setSelectedPokemonIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleItem(eligible: EligibleMarketplaceItem) {
    setSelectedItemQuantities((current) => {
      const next = new Map(current);
      if (next.has(eligible.item.id)) next.delete(eligible.item.id);
      else next.set(eligible.item.id, 1);
      return next;
    });
  }

  function setItemQuantity(itemId: string, quantity: number, max: number) {
    setSelectedItemQuantities((current) => {
      const next = new Map(current);
      next.set(itemId, Math.min(max, Math.max(1, quantity)));
      return next;
    });
  }

  function handleContinue() {
    setErrorMessage(null);
    if (!canContinue) {
      setErrorMessage("יש לבחור לפחות פוקימון או פריט אחד, ולהגדיר מחיר בכסף ו/או בזהב.");
      return;
    }
    setStep("confirm");
  }

  function handlePublish() {
    setErrorMessage(null);
    startTransition(async () => {
      const input = {
        playerPokemonIds: [...selectedPokemonIds],
        items: [...selectedItemQuantities.entries()].map(([itemId, quantity]) => ({ itemId, quantity })),
        priceMoney: parsedPriceMoney,
        priceGold: parsedPriceGold,
      };

      const result = isEditMode
        ? await saveEditListingAction(editingListingId, input)
        : await createMarketplaceListingAction(input);

      if (result.status === "success") {
        onSuccess();
        return;
      }

      setErrorMessage(result.message);
      setStep("build");
    });
  }

  const selectedPokemon = eligiblePokemon.filter((pokemon) => selectedPokemonIds.has(pokemon.id));
  const selectedItems = eligibleItems.filter((eligible) => selectedItemQuantities.has(eligible.item.id));

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-[0_0_40px_rgba(99,102,241,0.25)] sm:p-7"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-100">
            {step === "build" ? (isEditMode ? "ערוך מכירה" : "צור מכירה חדשה") : isEditMode ? "אישור שמירת שינויים" : "אישור פרסום מכירה"}
          </h2>
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

        {step === "build" ? (
          <div className="flex flex-col gap-6">
            <section>
              <h3 className="mb-2 text-sm font-semibold tracking-wide text-slate-300">בחר פוקימונים למכירה</h3>
              <PokemonGrid
                pokemon={eligiblePokemon}
                selectedIds={selectedPokemonIds}
                onSelect={togglePokemon}
                emptyMessage="אין לך כרגע פוקימונים שניתן להעמיד למכירה."
              />
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold tracking-wide text-slate-300">בחר פריטים למכירה</h3>
              {eligibleItems.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
                  אין לך כרגע פריטים פנויים למכירה.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {eligibleItems.map((eligible) => {
                    const isSelected = selectedItemQuantities.has(eligible.item.id);
                    const quantity = selectedItemQuantities.get(eligible.item.id) ?? 1;

                    return (
                      <div
                        key={eligible.item.id}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-colors ${
                          isSelected ? "border-indigo-400/70 bg-indigo-500/10" : "border-white/10 bg-slate-900/60"
                        }`}
                      >
                        <button type="button" onClick={() => toggleItem(eligible)} className="flex flex-col items-center gap-1">
                          <SpriteImage
                            src={eligible.item.imageUrl}
                            alt={eligible.item.name}
                            className="h-12 w-12 object-contain"
                            fallbackClassName="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
                          />
                          <span className="text-[11px] font-semibold text-slate-100">{eligible.item.name}</span>
                          <span className="text-[10px] text-slate-500">{`זמין: ${eligible.availableQuantity}`}</span>
                        </button>

                        {isSelected ? (
                          <div dir="ltr" className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/60 px-1.5 py-0.5">
                            <button
                              type="button"
                              onClick={() => setItemQuantity(eligible.item.id, quantity - 1, eligible.availableQuantity)}
                              disabled={quantity <= 1}
                              className="flex h-6 w-6 items-center justify-center rounded text-slate-200 disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:bg-white/10"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-xs font-semibold text-slate-100">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => setItemQuantity(eligible.item.id, quantity + 1, eligible.availableQuantity)}
                              disabled={quantity >= eligible.availableQuantity}
                              className="flex h-6 w-6 items-center justify-center rounded text-slate-200 disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:bg-white/10"
                            >
                              +
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold tracking-wide text-slate-300">מחיר (כסף, זהב, או שניהם)</h3>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <CurrencyIcon type="money" />
                  <input
                    type="number"
                    min={0}
                    dir="ltr"
                    value={priceMoney}
                    onChange={(event) => setPriceMoney(event.target.value)}
                    placeholder="0"
                    className="w-28 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-100 focus:border-indigo-400/50 focus:outline-none"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <CurrencyIcon type="gold" />
                  <input
                    type="number"
                    min={0}
                    dir="ltr"
                    value={priceGold}
                    onChange={(event) => setPriceGold(event.target.value)}
                    placeholder="0"
                    className="w-28 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-100 focus:border-indigo-400/50 focus:outline-none"
                  />
                </label>
              </div>
            </section>

            {errorMessage ? <p className="text-center text-sm font-semibold text-rose-400">{errorMessage}</p> : null}

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={!canContinue}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                המשך
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {selectedPokemon.length > 0 ? (
              <section>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">פוקימונים למכירה</h3>
                <PokemonGrid pokemon={selectedPokemon} onSelect={() => {}} />
              </section>
            ) : null}

            {selectedItems.length > 0 ? (
              <section>
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">פריטים למכירה</h3>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {selectedItems.map((eligible) => (
                    <div
                      key={eligible.item.id}
                      className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-slate-800/60 p-2 text-center"
                    >
                      <SpriteImage
                        src={eligible.item.imageUrl}
                        alt={eligible.item.name}
                        className="h-10 w-10 object-contain"
                        fallbackClassName="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
                      />
                      <span className="truncate text-[11px] font-semibold text-slate-100">{eligible.item.name}</span>
                      <span className="text-[10px] text-slate-400">{`x${selectedItemQuantities.get(eligible.item.id)}`}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="flex items-center justify-center gap-5 rounded-xl border border-white/10 bg-slate-950/60 p-4">
              {parsedPriceMoney > 0 ? (
                <span className="flex items-center gap-2 text-lg font-bold text-slate-100">
                  <CurrencyIcon type="money" className="h-6 w-6" />
                  <span dir="ltr">{parsedPriceMoney.toLocaleString("he-IL")}</span>
                </span>
              ) : null}
              {parsedPriceGold > 0 ? (
                <span className="flex items-center gap-2 text-lg font-bold text-slate-100">
                  <CurrencyIcon type="gold" className="h-6 w-6" />
                  <span dir="ltr">{parsedPriceGold.toLocaleString("he-IL")}</span>
                </span>
              ) : null}
            </div>

            <p className="text-center text-xs text-slate-500">
              {isEditMode
                ? "לאחר השמירה, הפוקימונים והפריטים שהוסרו יחזרו להיות זמינים לך, והפוקימונים והפריטים שנוספו לא יהיו זמינים לשימוש עד למכירה או לביטול המכירה."
                : "לאחר הפרסום, הפוקימונים והפריטים שנבחרו לא יהיו זמינים לשימוש עד למכירה או לביטול המכירה."}
            </p>

            {errorMessage ? <p className="text-center text-sm font-semibold text-rose-400">{errorMessage}</p> : null}

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setStep("build")}
                disabled={isPending}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                חזרה לעריכה
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isEditMode ? (isPending ? "שומר..." : "שמור שינויים") : isPending ? "מפרסם..." : "פרסם מכירה"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
