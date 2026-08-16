"use client";

import { useState, useTransition } from "react";

import { ChestOpenResultDialog } from "@/features/inventory/components/ChestOpenResultDialog";
import { InventoryChestCard } from "@/features/inventory/components/InventoryChestCard";
import { InventoryEggCard } from "@/features/inventory/components/InventoryEggCard";
import { InventoryIncubatorCard } from "@/features/inventory/components/InventoryIncubatorCard";
import { InventoryItemGrid } from "@/features/inventory/components/InventoryItemGrid";
import { InventorySellConfirmDialog } from "@/features/inventory/components/InventorySellConfirmDialog";
import { InventorySellPanel } from "@/features/inventory/components/InventorySellPanel";
import { InventorySellSingleConfirmDialog } from "@/features/inventory/components/InventorySellSingleConfirmDialog";
import { BackButton } from "@/components/layout/BackButton";
import { openChestAction } from "@/features/chests/actions/open-chest.action";
import { getChestDefinition, type ChestTypeId } from "@/features/chests/data/chest-definitions";
import type { OwnedChestSummary } from "@/features/chests/services/chest-ownership.service";
import type { OpenChestResult } from "@/features/chests/types/chest-open.types";
import type { OwnedEggView } from "@/features/eggs/services/egg-display.service";
import type { OwnedIncubatorSummary } from "@/features/eggs/services/incubator-display.service";
import { sellEggAction } from "@/features/inventory/actions/sell-egg.action";
import { sellIncubatorAction } from "@/features/inventory/actions/sell-incubator.action";
import { sellInventoryItemAction } from "@/features/inventory/actions/sell-inventory-item.action";
import type { InventoryItemView } from "@/features/inventory/types/inventory.types";
import { EvolutionItemPanel } from "@/features/evolution/components/EvolutionItemPanel";
import { ShopCategoryMenu } from "@/features/shop/components/ShopCategoryMenu";
import { getDefaultShopCategoryId, getShopCategories } from "@/features/shop/services/shop-catalog.service";
import type { ShopCategoryId } from "@/features/shop/types/shop.types";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

interface InventoryContentProps {
  views: InventoryItemView[];
  // Party AND storage (features/pokemon/services/player-pokemon.ts's
  // getAllOwnedPokemon) — only ever read by EvolutionItemPanel below, to
  // filter down to which owned Pokémon a selected Stone can evolve. Every
  // other Inventory flow (selling) never touches this.
  ownedPokemon: OwnedPokemon[];
  // EGGS PHASE 6 — every owned egg NOT currently incubating (features/
  // inventory/services/inventory-view.service.ts's getOwnedEggViews,
  // itself backed by Phase 1's listOwnedEggs). INVENTORY CATEGORY FIX —
  // only ever rendered while the "eggs" (ביצים ואינקובטורים) category is
  // selected — see isEggsCategorySelected below.
  eggs: OwnedEggView[];
  // INCUBATOR EXPANSION — every incubator the player owns, permanent
  // starter included, consumables grouped by type (features/inventory/
  // services/inventory-view.service.ts's getOwnedIncubatorViews). Same
  // category-gated treatment as eggs above.
  incubators: OwnedIncubatorSummary[];
  // CHESTS PHASE 4 — every chest TYPE the player owns at least one of
  // (features/inventory/services/inventory-view.service.ts's
  // getOwnedChestViews, itself Phase 1's own listOwnedChests) — only ever
  // rendered while the "chests" (תיבות) category is selected, a DIFFERENT
  // category from eggs/incubators' own "eggs" one (see
  // isChestsCategorySelected below).
  chests: OwnedChestSummary[];
}

// A pending single-instance sale (an egg or one unit of a grouped
// consumable-incubator type) awaiting confirmation — INVENTORY SELL's own
// unified selection state, deliberately separate from the ShopItem-based
// `selectedItemId`/`quantity` flow below (an egg/incubator sale is always
// exactly one unit, never a stepper quantity).
type PendingSellTarget =
  | { kind: "egg"; eggId: string; name: string; imageUrl: string; sellPrice: number; currency: "money" | "gold" }
  | { kind: "incubator"; incubatorTypeId: string; name: string; imageUrl: string; sellPrice: number; currency: "money" | "gold" }
  | { kind: "chest"; chestTypeId: ChestTypeId; itemId: string; name: string; imageUrl: string; sellPrice: number; currency: "money" | "gold" };

// Page composition root for /inventory — same shell/flow convention as
// ShopContent (gradient background, radial overlay, BackButton, centered
// max-width column, category menu + item grid, select -> quantity panel ->
// confirm dialog). Reuses ShopCategoryMenu as-is (it's already generic over
// ShopCategory[]) rather than forking an inventory-specific copy, and
// reuses the exact same category catalog (features/shop/data/
// shop-categories.ts) so "Poké Balls / Potions / Stones / ביצים ואינקובטורים"
// never drifts between the two screens.
//
// INVENTORY CATEGORY FIX — eggs and incubators are no longer always-visible
// sections: they render ONLY while the existing "eggs" category
// (shop-categories.ts's id "eggs", label "ביצים ואינקובטורים") is selected,
// reusing the SAME selectedCategoryId state the ShopItem grid already uses
// — never a second category mechanism. While that category is selected,
// the generic ShopItem grid/sell-panel/EvolutionItemPanel are hidden
// instead (that category has never had any sellable PlayerInventoryItem
// entries — eggs/incubators are never added there, see egg-shop-purchase.
// service.ts/incubator-shop-purchase.service.ts), so the screen shows
// exactly one coherent thing per category, never both at once.
//
// `views` is the full server-fetched owned-items list (already joined
// against the Shop catalog by inventory-view.service.ts); this component
// only ever filters it client-side by category, never re-fetches or
// re-derives prices itself. After a successful sale, the relevant action
// revalidates /inventory server-side, which re-runs the page's own data
// fetch and flows fresh props back down here automatically — same
// mechanism release-pokemon.action.ts's revalidatePath already relies on
// for MyPokemonContent (see that file's own doc comment); this component
// ALSO updates its local state optimistically from each action's own
// result, same convention every other *Content.tsx here already follows.
export function InventoryContent({
  views,
  ownedPokemon,
  eggs: initialEggs,
  incubators: initialIncubators,
  chests: initialChests,
}: InventoryContentProps) {
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

  const [eggs, setEggs] = useState(initialEggs);
  const [incubators, setIncubators] = useState(initialIncubators);
  const [pendingSellTarget, setPendingSellTarget] = useState<PendingSellTarget | null>(null);
  const [singleSellError, setSingleSellError] = useState<string | null>(null);

  const [chests, setChests] = useState(initialChests);
  const [openChestError, setOpenChestError] = useState<string | null>(null);
  const [chestOpenResult, setChestOpenResult] = useState<Extract<OpenChestResult, { status: "success" }> | null>(null);

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const isEggsCategorySelected = selectedCategoryId === "eggs";
  const isChestsCategorySelected = selectedCategoryId === "chests";
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

  function handleSellEggClick(egg: OwnedEggView) {
    setSellSuccessMessage(null);
    setSingleSellError(null);
    setPendingSellTarget({ kind: "egg", eggId: egg.id, name: egg.displayName, imageUrl: egg.imageUrl, sellPrice: egg.sellPrice, currency: egg.sellCurrency });
  }

  function handleSellIncubatorClick(incubator: OwnedIncubatorSummary) {
    setSellSuccessMessage(null);
    setSingleSellError(null);
    setPendingSellTarget({
      kind: "incubator",
      incubatorTypeId: incubator.incubatorTypeId,
      name: incubator.displayName,
      imageUrl: incubator.imageUrl,
      sellPrice: incubator.sellPrice,
      currency: incubator.sellCurrency,
    });
  }

  function handleSellChestClick(chest: OwnedChestSummary) {
    setSellSuccessMessage(null);
    setSingleSellError(null);
    setPendingSellTarget({
      kind: "chest",
      chestTypeId: chest.chestTypeId,
      itemId: chest.itemId,
      name: chest.displayName,
      imageUrl: chest.imageUrl,
      sellPrice: chest.sellPrice,
      currency: chest.sellCurrency,
    });
  }

  function handleCancelSingleSell() {
    setPendingSellTarget(null);
    setSingleSellError(null);
  }

  function handleConfirmSingleSell() {
    if (!pendingSellTarget) return;
    const target = pendingSellTarget;
    setSingleSellError(null);

    startTransition(async () => {
      if (target.kind === "egg") {
        const result = await sellEggAction(target.eggId);

        if (result.status === "success") {
          setEggs((current) => current.filter((egg) => egg.id !== target.eggId));
          setPendingSellTarget(null);
          setSellSuccessMessage(`נמכרה ${result.itemName} בהצלחה.`);
          return;
        }

        setSingleSellError("לא ניתן למכור ביצה זו כרגע (ייתכן שהיא בדגירה).");
        return;
      }

      if (target.kind === "chest") {
        // CHESTS — SELL FROM INVENTORY — the existing GENERIC
        // sellInventoryItemAction (already used for Poké Balls/Potions/
        // Stones) works unmodified for a chest: chestInventoryItemId's
        // "${type}-chest" convention is the exact same string the Shop
        // catalog uses as that chest product's own id, so getShopItemById
        // resolves it, and PlayerInventoryItem is the same ownership table
        // a chest already stacks on regardless of acquisition source (Shop
        // purchase or a battle drop) — no dedicated chest sell service is
        // needed, unlike eggs/incubators' own per-instance ownership models.
        const result = await sellInventoryItemAction(target.itemId, 1);

        if (result.status === "success") {
          setChests((current) =>
            current
              .map((chest) => (chest.chestTypeId === target.chestTypeId ? { ...chest, quantity: chest.quantity - 1 } : chest))
              .filter((chest) => chest.quantity > 0)
          );
          setPendingSellTarget(null);
          setSellSuccessMessage(`נמכרה ${result.itemName} בהצלחה.`);
          return;
        }

        setSingleSellError("לא ניתן למכור תיבה זו כרגע (ייתכן שאין לך יותר תיבות מסוג זה).");
        return;
      }

      const result = await sellIncubatorAction(target.incubatorTypeId);

      if (result.status === "success") {
        setIncubators((current) =>
          current
            .map((incubator) =>
              incubator.incubatorTypeId === target.incubatorTypeId && !incubator.isPermanent
                ? { ...incubator, quantity: incubator.quantity - 1 }
                : incubator
            )
            .filter((incubator) => incubator.isPermanent || incubator.quantity > 0)
        );
        setPendingSellTarget(null);
        setSellSuccessMessage(`נמכר ${result.itemName} בהצלחה.`);
        return;
      }

      setSingleSellError("לא ניתן למכור אינקובטור זה כרגע (ייתכן שהוא בשימוש, או שמדובר באינקובטור הקבוע).");
    });
  }

  // CHESTS PHASE 4 — the button only ever triggers the existing Phase 3
  // openChestAction; every real protection (ownership, atomic consumption,
  // reward rolling/granting) already lives server-side in that action's
  // own transactional service — this handler's ONLY jobs are: disable the
  // button while `isPending` (the shared pending flag every sell action
  // here already reuses, so opening a chest and selling something else
  // can never race each other client-side either), and reconcile local
  // state from the action's own returned result afterward.
  function handleOpenChest(chestTypeId: ChestTypeId) {
    setOpenChestError(null);

    startTransition(async () => {
      const result = await openChestAction(chestTypeId);

      if (result.status === "success") {
        setChests((current) =>
          current
            .map((chest) => (chest.chestTypeId === chestTypeId ? { ...chest, quantity: chest.quantity - 1 } : chest))
            .filter((chest) => chest.quantity > 0)
        );
        setChestOpenResult(result);
        return;
      }

      if (result.status === "not-enough-chests") {
        // The card's own local quantity was already stale (the player
        // owns none of this type right now) — remove it rather than
        // leaving a card that would just fail again.
        setChests((current) => current.filter((chest) => chest.chestTypeId !== chestTypeId));
        setOpenChestError("אין לך יותר תיבות מהסוג הזה.");
        return;
      }

      setOpenChestError("אירעה שגיאה, נסה שוב.");
    });
  }

  function handleCloseChestResult() {
    setChestOpenResult(null);
  }

  // INVENTORY CATEGORY FIX — the category menu (and therefore the "ביצים
  // ואינקובטורים" access point) must stay reachable for a player who owns
  // eggs/incubators but has never bought an ordinary Shop item — every
  // player has the permanent starter incubator the moment they've ever
  // loaded /hatchery, well before they might buy their first Poké Ball.
  const hasAnyItems = views.length > 0 || eggs.length > 0 || incubators.length > 0 || chests.length > 0;

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

              {isChestsCategorySelected ? (
                <div dir="rtl" className="min-w-0 flex-1">
                  <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">{selectedCategory?.name}</h2>

                  {chests.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
                      עדיין אין לך תיבות.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {chests.map((chest) => (
                        <InventoryChestCard
                          key={chest.chestTypeId}
                          chest={chest}
                          onOpen={handleOpenChest}
                          onSell={handleSellChestClick}
                          disabled={isPending}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : isEggsCategorySelected ? (
                <div dir="rtl" className="min-w-0 flex-1">
                  <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">{selectedCategory?.name}</h2>

                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">ביצים</h3>
                      {eggs.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
                          עדיין אין לך ביצים זמינות. ביצים מתקבלות מקרבות שדה או מהחנות.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          {eggs.map((egg) => (
                            <InventoryEggCard key={egg.id} egg={egg} onSell={() => handleSellEggClick(egg)} disabled={isPending} />
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">אינקובטורים</h3>
                      {incubators.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
                          עדיין אין לך אינקובטורים.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                          {incubators.map((incubator) => (
                            <InventoryIncubatorCard
                              key={`${incubator.incubatorTypeId}-${incubator.isPermanent ? "permanent" : "consumable"}`}
                              incubator={incubator}
                              onSell={() => handleSellIncubatorClick(incubator)}
                              disabled={isPending}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <InventoryItemGrid
                  categoryName={selectedCategory?.name}
                  views={categoryViews}
                  selectedItemId={selectedItemId}
                  onSelectItem={handleSelectItem}
                />
              )}
            </div>

            {!isEggsCategorySelected && !isChestsCategorySelected && selectedView ? (
              <InventorySellPanel
                view={selectedView}
                quantity={quantity}
                onQuantityChange={setQuantity}
                onSellClick={handleSellClick}
                disabled={isPending}
              />
            ) : null}

            {!isEggsCategorySelected && !isChestsCategorySelected && selectedView && selectedView.item.categoryId === "stones" ? (
              <EvolutionItemPanel item={selectedView.item} ownedPokemon={ownedPokemon} />
            ) : null}

            {isChestsCategorySelected && openChestError ? (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400">
                {openChestError}
              </p>
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

      {pendingSellTarget ? (
        <InventorySellSingleConfirmDialog
          imageUrl={pendingSellTarget.imageUrl}
          name={pendingSellTarget.name}
          sellPrice={pendingSellTarget.sellPrice}
          currency={pendingSellTarget.currency}
          pending={isPending}
          errorMessage={singleSellError}
          onCancel={handleCancelSingleSell}
          onConfirm={handleConfirmSingleSell}
        />
      ) : null}

      {chestOpenResult ? (
        <ChestOpenResultDialog
          chestDisplayName={getChestDefinition(chestOpenResult.chestTypeId).displayName}
          rewards={chestOpenResult.rewards}
          onClose={handleCloseChestResult}
        />
      ) : null}
    </div>
  );
}
