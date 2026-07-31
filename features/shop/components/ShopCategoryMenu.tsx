import type { ShopCategory, ShopCategoryId } from "@/features/shop/types/shop.types";

interface ShopCategoryMenuProps {
  categories: ShopCategory[];
  selectedCategoryId: ShopCategoryId | undefined;
  onSelect: (categoryId: ShopCategoryId) => void;
}

// The shop's left-hand side. A horizontal scrollable strip on narrow
// screens (sm:overflow-visible below turns it into a normal vertical list
// once there's room) — same "stack on mobile, side-by-side from sm: up"
// responsive shape the rest of this project's multi-panel screens already
// use. Purely a map over SHOP_CATEGORIES (features/shop/data/
// shop-categories.ts) — adding a category never touches this file.
export function ShopCategoryMenu({ categories, selectedCategoryId, onSelect }: ShopCategoryMenuProps) {
  return (
    <nav
      dir="rtl"
      aria-label="קטגוריות חנות"
      className="flex shrink-0 gap-2 overflow-x-auto pb-1 sm:w-48 sm:flex-col sm:overflow-visible sm:pb-0"
    >
      {categories.map((category) => {
        const isSelected = category.id === selectedCategoryId;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            aria-pressed={isSelected}
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors sm:shrink ${
              isSelected
                ? "border-indigo-400/70 bg-indigo-500/20 text-indigo-200"
                : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20 hover:bg-slate-800"
            }`}
          >
            <span className="text-base" aria-hidden="true">
              {category.icon}
            </span>
            {category.name}
          </button>
        );
      })}
    </nav>
  );
}
