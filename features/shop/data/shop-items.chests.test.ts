// CHESTS PHASE 5 focused coverage for the Shop's chest products — prices/
// currency are centrally defined here (SHOP_ITEMS), never hardcoded a
// second time in any UI component.
import assert from "node:assert/strict";
import { test } from "node:test";

import { SHOP_ITEMS } from "./shop-items.ts";
import { CHEST_DEFINITIONS } from "@/features/chests/data/chest-definitions";

test("exactly 3 chest products exist, one per chest type, under the existing chests category", () => {
  const chestItems = SHOP_ITEMS.filter((item) => item.categoryId === "chests" && item.chestTypeId);
  assert.equal(chestItems.length, 3);
  assert.deepEqual(
    chestItems.map((item) => item.chestTypeId).sort(),
    ["diamond", "gold", "silver"]
  );
});

test("chest prices/currencies match the spec exactly: Silver 2,500 Coins, Gold 150 Gold, Diamond 250 Gold", () => {
  const byType = Object.fromEntries(SHOP_ITEMS.filter((item) => item.categoryId === "chests" && item.chestTypeId).map((item) => [item.chestTypeId, item]));

  assert.equal(byType.silver.price, 2500);
  assert.equal(byType.silver.currency, "money");
  assert.equal(byType.gold.price, 150);
  assert.equal(byType.gold.currency, "gold");
  assert.equal(byType.diamond.price, 250);
  assert.equal(byType.diamond.currency, "gold");
});

test("each chest product's name/image are derived from the existing CHEST_DEFINITIONS, never re-typed", () => {
  for (const definition of CHEST_DEFINITIONS) {
    const item = SHOP_ITEMS.find((candidate) => candidate.categoryId === "chests" && candidate.chestTypeId === definition.id);
    assert.ok(item, `a shop item must exist for ${definition.id}`);
    assert.equal(item?.name, definition.displayName);
    assert.equal(item?.imageUrl, definition.imageUrl);
    assert.match(item!.imageUrl, /^\/images\/chests\//);
  }
});
