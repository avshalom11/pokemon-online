// INVENTORY CATEGORY FIX — regression guard: eggs/incubators must render
// ONLY while the "eggs" (ביצים ואינקובטורים) category is selected, and the
// category menu itself must stay reachable for a player who owns eggs/
// incubators but no ordinary Shop items. InventoryContent is a "use
// client"-tree component with no React Testing Library/jsdom set up in
// this project, so this checks the invariants via a static source read —
// same approach as features/shop/components/ShopItemCard.test.ts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const contentSource = readFileSync(new URL("./InventoryContent.tsx", import.meta.url), "utf8");

test("eggs/incubators are rendered behind an isEggsCategorySelected gate, never unconditionally", () => {
  assert.ok(contentSource.includes('isEggsCategorySelected = selectedCategoryId === "eggs"'), "the gate must be derived from the existing category selection state");
  assert.ok(contentSource.includes("isEggsCategorySelected ? ("), "eggs/incubators must be conditionally rendered behind the gate");
});

test("the generic ShopItem grid/sell panel/evolution panel are hidden while the eggs category is selected", () => {
  // CHESTS PHASE 4 — the guard now also excludes the chests category
  // (isChestsCategorySelected), so this only checks that the eggs-gate
  // half of the condition is still present, not the full exact string.
  assert.ok(contentSource.includes("!isEggsCategorySelected &&") && contentSource.includes("selectedView ? ("), "the generic sell panel must be hidden for the eggs category");
  assert.ok(
    contentSource.includes('selectedView && selectedView.item.categoryId === "stones"') && contentSource.includes("!isEggsCategorySelected"),
    "the evolution panel must also be hidden for the eggs category"
  );
});

test("hasAnyItems accounts for eggs/incubators, not just ShopItem views, so the category menu stays reachable", () => {
  assert.ok(
    contentSource.includes("views.length > 0 || eggs.length > 0 || incubators.length > 0"),
    "a player with only eggs/incubators (e.g. just the permanent starter incubator) must still see the category menu"
  );
});

test("eggs and incubators each get their own sell confirmation flow, reusing the existing sell actions", () => {
  assert.ok(contentSource.includes("sellEggAction"), "must call the dedicated egg sell action");
  assert.ok(contentSource.includes("sellIncubatorAction"), "must call the dedicated incubator sell action");
  assert.ok(contentSource.includes("InventorySellSingleConfirmDialog"), "must use the single-instance confirm dialog for eggs/incubators");
});
