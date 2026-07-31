import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
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
export function ShopItemCard({ item, isSelected, onSelect }: ShopItemCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors ${
        isSelected ? "border-indigo-400/70 bg-indigo-500/10" : "border-white/10 bg-slate-900/60 hover:border-indigo-400/40"
      }`}
    >
      <SpriteImage
        src={item.imageUrl}
        alt={item.name}
        className="h-16 w-16 object-contain sm:h-20 sm:w-20"
        fallbackClassName="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 sm:h-20 sm:w-20"
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
  );
}
