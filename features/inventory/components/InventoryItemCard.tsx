import { useState } from "react";

import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import { EvolutionItemInfoDialog } from "@/features/evolution/components/EvolutionItemInfoDialog";
import type { InventoryItemView } from "@/features/inventory/types/inventory.types";
import { TmInfoDialog } from "@/features/tm-system/components/TmInfoDialog";

interface InventoryItemCardProps {
  view: InventoryItemView;
  isSelected: boolean;
  onSelect: () => void;
}

// One owned item's card — same visual language as ShopItemCard
// (features/shop/components/ShopItemCard.tsx), plus the two facts unique to
// ownership: quantity owned and the derived unit sell price. Selecting only
// highlights the card; the actual sale flow (quantity, total return,
// confirm dialog) lives in InventorySellPanel/InventorySellConfirmDialog,
// triggered once an item is selected here — same division of
// responsibility ShopItemCard already establishes for buying.
// INVENTORY — EVOLUTION STONE INFO — the same small "?" button + info
// dialog ShopItemCard already offers for evolution products (Mega Stone
// included, since it's just another "stones"-category EvolutionItemId as
// of Mega Evolution Phase 2) — same component (EvolutionItemInfoDialog),
// same live data source, never a second/hardcoded compatibility list. This
// is purely informational; the authoritative eligibility check when an
// item is actually USED still lives entirely in the existing server-side
// evolution flow (features/evolution/services/accept-evolution-item.
// service.ts), untouched by this addition.
//
// POKÉDEX + INVENTORY UI IMPROVEMENTS — the card used to also show an
// inline evolution-compatibility summary directly on the card; that's now
// shown ONLY inside the "?" dialog above, never duplicated inline here —
// ShopItemCard never had this inline summary to begin with, so this brings
// Inventory's card in line with it.
export function InventoryItemCard({ view, isSelected, onSelect }: InventoryItemCardProps) {
  const { item, quantity, sellUnitPrice } = view;
  const isEvolutionProduct = item.categoryId === "stones";
  // UI POLISH (pre-Phase 6) — TM ("tms") cards show a larger image than
  // every other category, matching ShopItemCard's own treatment, so a TM
  // looks the same size whether seen in the Shop or in Inventory. Gated on
  // categoryId alone so no other category's card is affected.
  const isTmProduct = item.categoryId === "tms";
  const imageSizeClassName = isTmProduct ? "h-24 w-24 sm:h-28 sm:w-28" : "h-16 w-16 sm:h-20 sm:w-20";
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // TM SYSTEM UI POLISH — the root wrapper is now a `<div className="relative">`
  // (never a bare selectable <button> as before this feature) whenever a
  // sibling "?" info button exists, same "button cannot contain another
  // button per the HTML spec, so they must be siblings, not nested"
  // structure ShopItemCard already establishes for its own evolution/TM
  // info buttons. Every other category keeps rendering exactly the same
  // markup as before, just wrapped one div deeper (no visual change).
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        className={`flex w-full flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors ${
          isSelected ? "border-indigo-400/70 bg-indigo-500/10" : "border-white/10 bg-slate-900/60 hover:border-indigo-400/40"
        }`}
      >
        <div className="relative">
          <SpriteImage
            src={item.imageUrl}
            alt={item.name}
            className={`object-contain ${imageSizeClassName}`}
            fallbackClassName={`flex items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 ${imageSizeClassName}`}
          />
          <span
            dir="ltr"
            className="absolute -bottom-1 -right-1 rounded-full border border-slate-950 bg-indigo-500 px-1.5 py-0 text-[10px] font-bold text-white"
          >
            x{quantity}
          </span>
        </div>

        <span className="text-sm font-semibold text-slate-100">{item.name}</span>

        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
          <CurrencyIcon type={item.currency} />
          <span dir="ltr">{item.price.toLocaleString("he-IL")}</span>
          <span className="text-slate-500">מחיר מקורי</span>
        </span>

        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
          <CurrencyIcon type={item.currency} />
          <span dir="ltr">{sellUnitPrice.toLocaleString("he-IL")}</span>
          <span className="text-emerald-400/80">מחיר מכירה</span>
        </span>

        <span className="text-[11px] leading-snug text-slate-400">{item.description}</span>
      </button>

      {isEvolutionProduct || isTmProduct ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsInfoOpen(true);
          }}
          aria-label={isTmProduct ? "הצג פוקימונים שיכולים ללמוד את המתקפה" : "הצג פוקימונים שניתן לפתח באמצעות פריט זה"}
          className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-slate-900/80 text-xs font-bold text-slate-300 transition-colors hover:border-indigo-400/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
        >
          ?
        </button>
      ) : null}

      {isEvolutionProduct && isInfoOpen ? (
        <EvolutionItemInfoDialog itemId={item.id} itemName={item.name} itemImageUrl={item.imageUrl} onClose={() => setIsInfoOpen(false)} />
      ) : null}

      {isTmProduct && isInfoOpen ? (
        <TmInfoDialog itemId={item.id} itemName={item.name} itemImageUrl={item.imageUrl} onClose={() => setIsInfoOpen(false)} />
      ) : null}
    </div>
  );
}
