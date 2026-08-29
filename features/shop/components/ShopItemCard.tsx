import { useState } from "react";

import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import { EvolutionItemInfoDialog } from "@/features/evolution/components/EvolutionItemInfoDialog";
import { TmInfoDialog } from "@/features/tm-system/components/TmInfoDialog";
import type { ShopItem } from "@/features/shop/types/shop.types";

interface ShopItemCardProps {
  item: ShopItem;
  isSelected: boolean;
  onSelect: () => void;
}

// Selecting/highlighting only — the purchase flow itself (quantity, total,
// confirm dialog) lives in ShopPurchasePanel/ShopPurchaseConfirmDialog,
// triggered once an item is selected here. SpriteImage
// (components/media/SpriteImage.tsx) is reused as-is rather than a
// shop-specific image component: it already
// does exactly what an item card needs (render whatever PNG exists at
// item.imageUrl, gracefully fall back to a placeholder box if it doesn't),
// the same "asset may not be added yet" case every other sprite in this
// project already handles the same way.
//
// Shop UI Redesign phase — evolution-item ("stones" category) cards no
// longer show a permanent inline Pokémon list under the product
// (previously an "Evolves:" line); item.description now carries a short
// thematic sentence instead (features/shop/data/shop-items.ts is still the
// one place that text lives), and a small circular "?" button opens
// EvolutionItemInfoDialog on demand for the full, live-derived mapping
// list. The card's root is a `<div className="relative">` wrapping the
// selectable `<button>` PLUS the "?" button as a sibling — never nested
// inside it — because native <button> elements cannot contain another
// <button> per the HTML spec; the "?" button's own stopPropagation is a
// defensive second guard against ever triggering the card's own onSelect.
export function ShopItemCard({ item, isSelected, onSelect }: ShopItemCardProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const isEvolutionProduct = item.categoryId === "stones";
  // UI POLISH (pre-Phase 6) — TM ("tms") cards show a larger image than
  // every other category, per this task's own explicit spec. Gated on
  // categoryId alone (never a class-level default change) so no other
  // category's card is affected.
  const isTmProduct = item.categoryId === "tms";
  const imageSizeClassName = isTmProduct ? "h-24 w-24 sm:h-28 sm:w-28" : "h-16 w-16 sm:h-20 sm:w-20";

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
        <SpriteImage
          src={item.imageUrl}
          alt={item.name}
          className={`object-contain ${imageSizeClassName}`}
          fallbackClassName={`flex items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 ${imageSizeClassName}`}
        />

        <span className="text-sm font-semibold text-slate-100">{item.name}</span>

        {/* Each item's own currency (ShopItem.currency) picks the icon color —
            the same CurrencyIcon GameHeader's own coins/gold pills use
            (components/layout/GameHeader.tsx), so a price here always reads
            as the correct currency at a glance. */}
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
          <CurrencyIcon type={item.currency} />
          <span dir="ltr">{item.price.toLocaleString("he-IL")}</span>
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
          aria-label={isTmProduct ? "הצג פוקימונים שיכולים ללמוד את המתקפה" : "הצג פוקימונים שניתן לפתח באמצעות מוצר זה"}
          className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-slate-900/80 text-xs font-bold text-slate-300 transition-colors hover:border-indigo-400/60 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70"
        >
          ?
        </button>
      ) : null}

      {isEvolutionProduct && isInfoOpen ? (
        <EvolutionItemInfoDialog
          itemId={item.id}
          itemName={item.name}
          itemImageUrl={item.imageUrl}
          onClose={() => setIsInfoOpen(false)}
        />
      ) : null}

      {isTmProduct && isInfoOpen ? (
        <TmInfoDialog itemId={item.id} itemName={item.name} itemImageUrl={item.imageUrl} onClose={() => setIsInfoOpen(false)} />
      ) : null}
    </div>
  );
}
