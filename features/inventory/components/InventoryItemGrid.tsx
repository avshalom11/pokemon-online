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
  // UI POLISH (pre-Phase 6) — same TM-specific 3-per-row-on-desktop
  // treatment ShopItemGrid already applies, kept in sync so a TM's grid
  // looks the same whether seen in the Shop or in Inventory. Every other
  // category keeps its existing grid untouched.
  const isTmCategory = views.length > 0 && views.every((view) => view.item.categoryId === "tms");
  const gridColsClassName = isTmCategory ? "grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3" : "grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4";

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
        <div className={`grid ${gridColsClassName}`}>
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
