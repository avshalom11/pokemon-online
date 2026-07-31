"use client";

import { useState, useTransition } from "react";

import { ShopCategoryMenu } from "./ShopCategoryMenu";
import { ShopItemGrid } from "./ShopItemGrid";
import { ShopPurchaseConfirmDialog } from "./ShopPurchaseConfirmDialog";
import { ShopPurchasePanel } from "./ShopPurchasePanel";
import { BackButton } from "@/components/layout/BackButton";
import type { CurrencyType } from "@/features/currency/types/currency.types";
import { purchaseShopItemAction } from "@/features/shop/actions/purchase-shop-item.action";
import { getDefaultShopCategoryId, getShopCategories, getShopItemsByCategory } from "@/features/shop/services/shop-catalog.service";
import type { ShopCategoryId } from "@/features/shop/types/shop.types";

function insufficientFundsMessage(currency: CurrencyType): string {
  return currency === "gold" ? "אין לך מספיק זהב לרכישה זו." : "אין לך מספיק מטבעות לרכישה זו.";
}

// Page composition root for /shop — same shell convention as HomeContent/
// PokemonCenterContent (gradient background, radial overlay, BackButton,
// centered max-width column). Owns the whole shopping flow's UI-only
// state: which category is showing, which item is selected, the chosen
// quantity, and whether the confirmation dialog is open — the actual
// purchase (currency check, deduction, inventory, notification) is
// entirely server-side (purchaseShopItemAction ->
// features/shop/services/shop-purchase.service.ts); this component never
// trusts anything but that action's own result.
export function ShopContent() {
  const categories = getShopCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<ShopCategoryId | undefined>(
    getDefaultShopCategoryId()
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const items = selectedCategoryId ? getShopItemsByCategory(selectedCategoryId) : [];
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  // A previously-selected item card belongs to whichever category was
  // showing before — it must never stay "highlighted" (or keep its
  // purchase panel/quantity) invisibly once the visible list changes to a
  // different category.
  function handleCategorySelect(categoryId: ShopCategoryId) {
    setSelectedCategoryId(categoryId);
    resetSelection();
  }

  function handleSelectItem(itemId: string) {
    setSelectedItemId(itemId);
    setQuantity(1);
    setPurchaseError(null);
    setPurchaseSuccessMessage(null);
  }

  function resetSelection() {
    setSelectedItemId(null);
    setQuantity(1);
    setPurchaseError(null);
    setPurchaseSuccessMessage(null);
  }

  function handleBuyClick() {
    setPurchaseError(null);
    setPurchaseSuccessMessage(null);
    setIsConfirmOpen(true);
  }

  function handleCancelConfirm() {
    setIsConfirmOpen(false);
    setPurchaseError(null);
  }

  function handleConfirmPurchase() {
    if (!selectedItem) return;

    const item = selectedItem;
    setPurchaseError(null);

    startTransition(async () => {
      const result = await purchaseShopItemAction(item.id, quantity);

      if (result.status === "success") {
        setIsConfirmOpen(false);
        setPurchaseSuccessMessage(`נרכשו ${result.quantity} יחידות של ${result.itemName} בהצלחה.`);
        setQuantity(1);
        return;
      }

      if (result.status === "insufficient-funds") {
        setPurchaseError(insufficientFundsMessage(item.currency));
      } else {
        setPurchaseError("אירעה שגיאה, נסה שוב.");
      }
    });
  }

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

        <h1 className="text-lg font-bold text-slate-100">חנות</h1>

        {/* Left: category menu. Right: the selected category's items. This
            row is explicitly dir="ltr" to override the rtl it would
            otherwise inherit from the wrapper above — with dir="rtl" here,
            flexbox would place the first DOM child on the right, putting
            the category menu on the wrong side. Left/right therefore match
            the literal screen position regardless of the page's own RTL
            text flow; ShopCategoryMenu/ShopItemGrid each set their own
            dir="rtl" again internally so their actual Hebrew content still
            reads correctly. */}
        <div dir="ltr" className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ShopCategoryMenu categories={categories} selectedCategoryId={selectedCategoryId} onSelect={handleCategorySelect} />
          <ShopItemGrid
            categoryName={selectedCategory?.name}
            items={items}
            selectedItemId={selectedItemId}
            onSelectItem={handleSelectItem}
          />
        </div>

        {selectedItem ? (
          <ShopPurchasePanel
            item={selectedItem}
            quantity={quantity}
            onQuantityChange={setQuantity}
            onBuyClick={handleBuyClick}
            disabled={isPending}
          />
        ) : null}

        {purchaseSuccessMessage ? (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            {purchaseSuccessMessage}
          </p>
        ) : null}
      </div>

      {isConfirmOpen && selectedItem ? (
        <ShopPurchaseConfirmDialog
          item={selectedItem}
          quantity={quantity}
          pending={isPending}
          errorMessage={purchaseError}
          onCancel={handleCancelConfirm}
          onConfirm={handleConfirmPurchase}
        />
      ) : null}
    </div>
  );
}
