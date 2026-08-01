import { InventoryItemCard } from "@/features/inventory/components/InventoryItemCard";
import type { InventoryItemView } from "@/features/inventory/types/inventory.types";

interface InventoryItemGridProps {
  categoryName?: string;
  views: InventoryItemView[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
}

// The right-hand side of the inventory layout — same shape as
// ShopItemGrid, but over InventoryItemView[] (owned items only, already
// filtered to the current category by InventoryContent). An empty category
// shows a dedicated "nothing owned in this category yet" message rather
// than the Shop's generic empty state, since the two mean different things
// here (never stocked vs. never purchased).
export function InventoryItemGrid({ categoryName, views, selectedItemId, onSelectItem }: InventoryItemGridProps) {
  return (
    <div dir="rtl" className="min-w-0 flex-1">
      {categoryName ? (
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">{categoryName}</h2>
      ) : null}

      {views.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
          אין לך פריטים בקטגוריה זו כרגע.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {views.map((view) => (
            <InventoryItemCard
              key={view.item.id}
              view={view}
              isSelected={view.item.id === selectedItemId}
              onSelect={() => onSelectItem(view.item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
