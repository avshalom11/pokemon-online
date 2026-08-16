// CHESTS PHASE 4 — regression guard: chests render ONLY behind their own
// "chests" (תיבות) category gate (never inside "eggs", never
// unconditionally), opening wires straight into the existing Phase 3
// openChestAction with no duplicated reward/consumption logic, quantity
// updates/removal happen locally on success, "not-enough-chests" cleans up
// the stale card, and the result dialog receives the FULL rewards array.
// InventoryContent is a "use client"-tree component with no React Testing
// Library/jsdom set up in this project, so this checks the invariants via
// a static source read — same approach as features/shop/components/
// ShopItemCard.test.ts and this same file's own earlier category-gating
// test.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const contentSource = readFileSync(new URL("./InventoryContent.tsx", import.meta.url), "utf8");
const dialogSource = readFileSync(new URL("./ChestOpenResultDialog.tsx", import.meta.url), "utf8");

test('chests render behind their own isChestsCategorySelected gate, distinct from eggs\' own gate', () => {
  assert.ok(contentSource.includes('isChestsCategorySelected = selectedCategoryId === "chests"'), "the gate must be derived from the existing category selection state");
  assert.ok(contentSource.includes("isChestsCategorySelected ? ("), "chests must be conditionally rendered behind their own gate");
  assert.ok(!/isEggsCategorySelected \? \(\s*<div dir="rtl"[^>]*>[\s\S]*InventoryChestCard/.test(contentSource), "chests must never render inside the eggs/incubators branch");
});

test("opening a chest calls the existing Phase 3 openChestAction — no duplicated reward/consumption logic", () => {
  assert.ok(contentSource.includes("import { openChestAction }"), "must import the existing action, never a new one");
  assert.ok(contentSource.includes("await openChestAction(chestTypeId)"), "must call the existing action directly");
  assert.ok(!/rollChestReward|consumeChest|grantIncubator|grantCurrencyRewards|createOwnedEgg/.test(contentSource), "must never call any Phase 2/3 primitive directly — only the action");
});

test("the open button is disabled while the shared pending transition is in flight, preventing double-submit", () => {
  assert.ok(/<InventoryChestCard[^>]*disabled=\{isPending\}/.test(contentSource), "InventoryChestCard must receive disabled={isPending}");
});

test("a successful open decrements the opened chest's quantity locally and removes it once it reaches 0", () => {
  assert.ok(
    contentSource.includes("chest.chestTypeId === chestTypeId ? { ...chest, quantity: chest.quantity - 1 } : chest"),
    "quantity must be decremented by exactly 1 for the opened type only"
  );
  assert.ok(contentSource.includes("filter((chest) => chest.quantity > 0)"), "a chest whose quantity reaches 0 must be removed from the list");
});

test("'not-enough-chests' removes the stale card and shows a Hebrew message, never fake rewards", () => {
  assert.ok(contentSource.includes('result.status === "not-enough-chests"'), "must handle the not-enough-chests status explicitly");
  assert.ok(
    contentSource.includes("current.filter((chest) => chest.chestTypeId !== chestTypeId)"),
    "the stale chest card must be removed on not-enough-chests"
  );
  assert.ok(contentSource.includes('setOpenChestError("אין לך יותר תיבות מהסוג הזה.")'), "must show a plain Hebrew message, never a raw server error");
  assert.ok(!/not-enough-chests"[\s\S]{0,200}setChestOpenResult/.test(contentSource), "must never open the reward dialog on a failed/rejected open");
});

test("a generic action failure shows a plain Hebrew message, never a raw server error", () => {
  assert.ok(contentSource.includes('setOpenChestError("אירעה שגיאה, נסה שוב.")'));
});

test("the reward dialog is only rendered after a successful open, and receives the FULL rewards array unfiltered", () => {
  assert.ok(contentSource.includes("{chestOpenResult ? ("), "the dialog must be gated on a real result, never always-visible");
  assert.ok(contentSource.includes("rewards={chestOpenResult.rewards}"), "every rolled reward must be passed straight through, never sliced/filtered");
});

test("the category menu (and therefore the chests category) stays reachable when a player owns only chests", () => {
  assert.ok(
    contentSource.includes("views.length > 0 || eggs.length > 0 || incubators.length > 0 || chests.length > 0"),
    "hasAnyItems must account for chests too, not just ordinary Shop items/eggs/incubators"
  );
});

test("the generic ShopItem sell panel/evolution panel are hidden while the chests category is selected", () => {
  assert.ok(contentSource.includes("!isEggsCategorySelected && !isChestsCategorySelected && selectedView"), "the generic sell panel must be hidden for the chests category too");
});

test("the reward dialog renders every distinct evolution item in a bundle, never collapsed into one line", () => {
  assert.ok(dialogSource.includes("reward.items.map((item)"), "every item in an evolution-item bundle must get its own row");
});

test("the reward dialog maps over every reward with no slicing/filtering", () => {
  assert.ok(/rewards\.map\(\(reward, index\)/.test(dialogSource), "every reward in the array must be rendered, none dropped");
});

// CHESTS — SELL FROM INVENTORY
const chestCardSource = readFileSync(new URL("./InventoryChestCard.tsx", import.meta.url), "utf8");

test("selling a chest reuses the existing generic sellInventoryItemAction — no dedicated chest sell service", () => {
  assert.ok(contentSource.includes('import { sellInventoryItemAction }'), "must import the existing generic action, never a new one");
  assert.ok(contentSource.includes("await sellInventoryItemAction(target.itemId, 1)"), "must sell exactly 1 unit through the existing action");
  assert.ok(!/sellChestAction|sell-chest\.(service|action)/.test(contentSource), "must never introduce a dedicated chest sell service/action");
});

test("the chest sell target's itemId comes from the server-provided OwnedChestSummary field, never computed client-side", () => {
  // SITE CRASH FIX — chestInventoryItemId lives in a "server-only"-tagged
  // module; a Client Component must never import it directly (that pulls
  // the whole server-only module into the client bundle and breaks the
  // build). The server already resolves it into chest.itemId.
  assert.ok(!/import\s*\{[^}]*chestInventoryItemId/.test(contentSource), "must never import chestInventoryItemId (server-only) into this Client Component");
  assert.ok(contentSource.includes("itemId: chest.itemId"));
});

test("InventoryChestCard receives onSell wired to the shared single-sell confirmation flow, and both actions are disabled together", () => {
  assert.ok(/<InventoryChestCard[\s\S]{0,250}onSell=\{handleSellChestClick\}/.test(contentSource));
  assert.ok(/<InventoryChestCard[\s\S]{0,250}disabled=\{isPending\}/.test(contentSource));
});

test("a successful chest sell decrements the sold type's quantity locally and removes it once it reaches 0", () => {
  assert.ok(
    contentSource.includes('chest.chestTypeId === target.chestTypeId ? { ...chest, quantity: chest.quantity - 1 } : chest'),
    "quantity must be decremented by exactly 1 for the sold type only"
  );
});

test("the chest card renders a sell button wired to onSell, alongside the existing open button", () => {
  assert.ok(chestCardSource.includes("onSell: (chest: OwnedChestSummary) => void"), "onSell prop must be typed");
  assert.ok(chestCardSource.includes("onClick={() => onSell(chest)}"), "the sell button must call onSell with the chest");
  assert.ok(chestCardSource.includes("onClick={() => onOpen(chest.chestTypeId)}"), "the existing open button must remain untouched");
});

test("the chest card displays the live sell price/currency from the server, never a hardcoded value", () => {
  assert.ok(chestCardSource.includes("<CurrencyIcon type={chest.sellCurrency} />"));
  assert.ok(chestCardSource.includes("{chest.sellPrice.toLocaleString"));
});
