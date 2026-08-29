"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { ShopCategoryMenu } from "./ShopCategoryMenu";
import { ShopItemGrid } from "./ShopItemGrid";
import { ShopPurchaseConfirmDialog } from "./ShopPurchaseConfirmDialog";
import { ShopPurchasePanel } from "./ShopPurchasePanel";
import { BackButton } from "@/components/layout/BackButton";
import type { CurrencyType } from "@/features/currency/types/currency.types";
import { purchaseChestShopItemAction } from "@/features/shop/actions/purchase-chest-shop-item.action";
import { purchaseEggShopItemAction } from "@/features/shop/actions/purchase-egg-shop-item.action";
import { purchaseIncubatorShopItemAction } from "@/features/shop/actions/purchase-incubator-shop-item.action";
import { purchaseShopItemAction } from "@/features/shop/actions/purchase-shop-item.action";
import { getDefaultShopCategoryId, getShopCategories, getShopItemsByCategory } from "@/features/shop/services/shop-catalog.service";
import type { ShopCategoryId } from "@/features/shop/types/shop.types";
import { useTutorial, useTutorialTarget } from "@/features/tutorial/context/tutorial-context";

// GAME TUTORIAL — PHASE 2. The real Shop catalog id for the normal Poké
// Ball (features/shop/data/shop-items.ts) — the one item/price this stage's
// own registry entry requires ("its existing 100 Money price", this task's
// own words) — a plain constant, never re-derived from anything the client
// could influence (the price check below reads it off the real
// purchaseShopItemAction result, not this constant).
const TUTORIAL_POKE_BALL_ITEM_ID = "poke-ball";

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

  // UI POLISH (pre-Phase 6) — the TM ("tms") category's grid is much
  // taller than every other category's (54 items vs. a handful), so the
  // purchase panel below it can land far under the fold, making a
  // selection look like nothing happened. Scrolling it into view (centered
  // in the viewport) fixes that specifically for TMs, without touching
  // ShopPurchasePanel itself or any other category's behavior — the panel
  // is still the exact same reused component, just brought on-screen.
  const purchasePanelRef = useRef<HTMLDivElement>(null);

  // GAME TUTORIAL — PHASE 2. Spotlights the whole purchase flow (category
  // menu + item grid + purchase panel — never one specific item card,
  // which ShopItemGrid/ShopItemCard render generically for every category
  // and know nothing about this feature). reportAction("poke-ball-purchased")
  // fires only once the REAL purchaseShopItemAction result below confirms
  // a success for exactly the real "poke-ball" item, quantity 1, at its
  // real 100-money price — "do not trust a client event alone if the
  // Server Action result can verify success" (this task's own explicit
  // rule). A no-op unless the Tutorial is currently awaiting exactly this
  // action.
  const purchaseFlowTargetRef = useTutorialTarget("shop-purchase-flow");
  const { reportAction } = useTutorial();

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const items = selectedCategoryId ? getShopItemsByCategory(selectedCategoryId) : [];
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  // UI POLISH (pre-Phase 6) — brings the purchase panel to the
  // upper-middle/center of the viewport the moment a TM is selected. Scoped
  // to categoryId "tms" alone (never any other category, whose panel
  // already appears close enough to the grid to need no help).
  useEffect(() => {
    if (selectedItem?.categoryId === "tms") {
      purchasePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // Deliberately keyed on selectedItemId alone (a stable primitive), not
    // the freshly-derived `selectedItem` object above (a new reference on
    // every render) — this must only ever re-run when the SELECTION
    // itself changes, never on every quantity tick or re-render while the
    // same item stays selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId]);

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
      // EGGS PHASE 6 / INCUBATOR EXPANSION / CHESTS PHASE 5 — an egg
      // product's actual purchase effect (createOwnedEgg, region-stamped),
      // an incubator product's (grantIncubator), and a chest product's
      // (grantChest) are each different enough from an ordinary item's
      // (addInventoryItem quantity) — and from each other — that they go
      // through their own dedicated actions — see purchase-egg-shop-item.
      // action.ts's/purchase-incubator-shop-item.action.ts's/purchase-
      // chest-shop-item.action.ts's own doc comments. Routed by which
      // pointer field the catalog entry itself carries (eggRarity vs.
      // incubatorTypeId vs. chestTypeId), never by categoryId alone. All
      // four actions return the exact same {status:"success", itemName,
      // quantity, ...} shape on success, so the success branch below needs
      // no further branching itself.
      const result = item.eggRarity
        ? await purchaseEggShopItemAction(item.id, quantity)
        : item.incubatorTypeId
          ? await purchaseIncubatorShopItemAction(item.id, quantity)
          : item.chestTypeId
            ? await purchaseChestShopItemAction(item.id, quantity)
            : await purchaseShopItemAction(item.id, quantity);

      if (result.status === "success") {
        setIsConfirmOpen(false);
        setPurchaseSuccessMessage(`נרכשו ${result.quantity} יחידות של ${result.itemName} בהצלחה.`);
        setQuantity(1);

        // GAME TUTORIAL — PHASE 2. Only ever reported once the real result
        // confirms exactly what this stage requires — never merely "some
        // purchase succeeded".
        if (item.id === TUTORIAL_POKE_BALL_ITEM_ID && result.quantity === 1 && result.totalPrice === 100 && result.currency === "money") {
          reportAction("poke-ball-purchased");
        }
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

      <div ref={purchaseFlowTargetRef} className="relative mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
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
            categoryTip={selectedCategory?.tip}
            items={items}
            selectedItemId={selectedItemId}
            onSelectItem={handleSelectItem}
          />
        </div>

        {selectedItem ? (
          <div ref={purchasePanelRef}>
            <ShopPurchasePanel
              item={selectedItem}
              quantity={quantity}
              onQuantityChange={setQuantity}
              onBuyClick={handleBuyClick}
              disabled={isPending}
            />
          </div>
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
