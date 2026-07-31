import { ShopItemCard } from "./ShopItemCard";
import type { ShopItem } from "@/features/shop/types/shop.types";

interface ShopItemGridProps {
  categoryName?: string;
  items: ShopItem[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
}

// The right-hand side of the shop layout — purely a function of whatever
// items ShopContent already resolved for the current category, never its
// own data source. A category with zero items (possible the moment a new
// category is added to the data before any item references it yet) shows
// an explicit empty state instead of silently rendering nothing.
export function ShopItemGrid({ categoryName, items, selectedItemId, onSelectItem }: ShopItemGridProps) {
  return (
    <div dir="rtl" className="min-w-0 flex-1">
      {categoryName ? (
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">{categoryName}</h2>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
          אין פריטים בקטגוריה זו כרגע.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ShopItemCard
              key={item.id}
              item={item}
              isSelected={item.id === selectedItemId}
              onSelect={() => onSelectItem(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
