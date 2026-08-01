"use client";

import { useState, useTransition } from "react";

import { InventoryItemGrid } from "@/features/inventory/components/InventoryItemGrid";
import { InventorySellConfirmDialog } from "@/features/inventory/components/InventorySellConfirmDialog";
import { InventorySellPanel } from "@/features/inventory/components/InventorySellPanel";
import { BackButton } from "@/components/layout/BackButton";
import { sellInventoryItemAction } from "@/features/inventory/actions/sell-inventory-item.action";
import type { InventoryItemView } from "@/features/inventory/types/inventory.types";
import { ShopCategoryMenu } from "@/features/shop/components/ShopCategoryMenu";
import { getDefaultShopCategoryId, getShopCategories } from "@/features/shop/services/shop-catalog.service";
import type { ShopCategoryId } from "@/features/shop/types/shop.types";

interface InventoryContentProps {
  views: InventoryItemView[];
}

// Page composition root for /inventory — same shell/flow convention as
// ShopContent (gradient background, radial overlay, BackButton, centered
// max-width column, category menu + item grid, select -> quantity panel ->
// confirm dialog). Reuses ShopCategoryMenu as-is (it's already generic over
// ShopCategory[]) rather than forking an inventory-specific copy, and
// reuses the exact same category catalog (features/shop/data/
// shop-categories.ts) so "Poké Balls / Potions / Stones" never drifts
// between the two screens.
//
// `views` is the full server-fetched owned-items list (already joined
// against the Shop catalog by inventory-view.service.ts); this component
// only ever filters it client-side by category, never re-fetches or
// re-derives prices itself. After a successful sale, sellInventoryItemAction
// revalidates /inventory server-side, which re-runs the page's own data
// fetch and flows a fresh `views` prop back down here automatically — same
// mechanism release-pokemon.action.ts's revalidatePath already relies on
// for MyPokemonContent (see that file's own doc comment).
export function InventoryContent({ views }: InventoryContentProps) {
  const categories = getShopCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<ShopCategoryId | undefined>(
    getDefaultShopCategoryId()
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);
  const [sellSuccessMessage, setSellSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const categoryViews = selectedCategoryId ? views.filter((view) => view.item.categoryId === selectedCategoryId) : [];
  const selectedView = categoryViews.find((view) => view.item.id === selectedItemId) ?? null;

  function handleCategorySelect(categoryId: ShopCategoryId) {
    setSelectedCategoryId(categoryId);
    resetSelection();
  }

  function handleSelectItem(itemId: string) {
    setSelectedItemId(itemId);
    setQuantity(1);
    setSellError(null);
    setSellSuccessMessage(null);
  }

  function resetSelection() {
    setSelectedItemId(null);
    setQuantity(1);
    setSellError(null);
    setSellSuccessMessage(null);
  }

  function handleSellClick() {
    setSellError(null);
    setSellSuccessMessage(null);
    setIsConfirmOpen(true);
  }

  function handleCancelConfirm() {
    setIsConfirmOpen(false);
    setSellError(null);
  }

  function handleConfirmSell() {
    if (!selectedView) return;

    const item = selectedView.item;
    setSellError(null);

    startTransition(async () => {
      const result = await sellInventoryItemAction(item.id, quantity);

      if (result.status === "success") {
        setIsConfirmOpen(false);
        setSellSuccessMessage(`נמכרו ${result.quantity} יחידות של ${result.itemName} בהצלחה.`);
        setQuantity(1);
        return;
      }

      if (result.status === "insufficient-quantity") {
        setSellError("אין לך מספיק יחידות של פריט זה.");
      } else {
        setSellError("אירעה שגיאה, נסה שוב.");
      }
    });
  }

  const hasAnyItems = views.length > 0;

  return (
    <div
      dir="rtl"
      className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(129,90,238,0.16), transparent 60%), radial-gradient(ellipse 50% 30% at 90% 100%, rgba(99,102,241,0.12), transparent 60%)",
        }}
      />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <BackButton />

        <h1 className="text-lg font-bold text-slate-100">תיק ציוד</h1>

        {hasAnyItems ? (
          <>
            {/* Left: category menu. Right: the selected category's owned
                items — same dir="ltr" override ShopContent uses so flexbox
                keeps the category menu on the literal left regardless of
                the page's own RTL text flow (see ShopContent's own doc
                comment for the full rationale). */}
            <div dir="ltr" className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <ShopCategoryMenu categories={categories} selectedCategoryId={selectedCategoryId} onSelect={handleCategorySelect} />
              <InventoryItemGrid
                categoryName={selectedCategory?.name}
                views={categoryViews}
                selectedItemId={selectedItemId}
                onSelectItem={handleSelectItem}
              />
            </div>

            {selectedView ? (
              <InventorySellPanel
                view={selectedView}
                quantity={quantity}
                onQuantityChange={setQuantity}
                onSellClick={handleSellClick}
                disabled={isPending}
              />
            ) : null}
          </>
        ) : (
          <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
            עדיין אין לך פריטים. בקר בחנות כדי לרכוש פריטים.
          </p>
        )}

        {sellSuccessMessage ? (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            {sellSuccessMessage}
          </p>
        ) : null}
      </div>

      {isConfirmOpen && selectedView ? (
        <InventorySellConfirmDialog
          view={selectedView}
          quantity={quantity}
          pending={isPending}
          errorMessage={sellError}
          onCancel={handleCancelConfirm}
          onConfirm={handleConfirmSell}
        />
      ) : null}
    </div>
  );
}
