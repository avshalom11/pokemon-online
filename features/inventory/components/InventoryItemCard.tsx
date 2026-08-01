import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import type { InventoryItemView } from "@/features/inventory/types/inventory.types";

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
export function InventoryItemCard({ view, isSelected, onSelect }: InventoryItemCardProps) {
  const { item, quantity, sellUnitPrice } = view;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors ${
        isSelected ? "border-indigo-400/70 bg-indigo-500/10" : "border-white/10 bg-slate-900/60 hover:border-indigo-400/40"
      }`}
    >
      <div className="relative">
        <SpriteImage
          src={item.imageUrl}
          alt={item.name}
          className="h-16 w-16 object-contain sm:h-20 sm:w-20"
          fallbackClassName="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 sm:h-20 sm:w-20"
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
  );
}
