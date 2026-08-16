// CHESTS PHASE 1 focused coverage for the shared category list Shop and
// Inventory both read from — pure data assertions, no DOM/browser needed.
import assert from "node:assert/strict";
import { test } from "node:test";

import { SHOP_CATEGORIES } from "./shop-categories.ts";
import { SHOP_ITEMS } from "./shop-items.ts";

test('a dedicated "תיבות" (chests) category exists, distinct from "eggs"', () => {
  const chests = SHOP_CATEGORIES.find((category) => category.id === "chests");
  assert.ok(chests, "a chests category must exist");
  assert.equal(chests?.name, "תיבות");
  assert.notEqual(chests?.id, "eggs", "chests must never be merged into the eggs category");
});

test("no new category was accidentally added or removed alongside chests", () => {
  assert.deepEqual(
    SHOP_CATEGORIES.map((category) => category.id),
    ["poke-balls", "potions", "stones", "eggs", "chests"]
  );
});

// CHESTS PHASE 5 — Shop acquisition now exists (superseding Phase 1's own
// "no ShopItem yet" placeholder assertion this test used to make); the
// exact product-level assertions (count, prices, ids) live in this
// category's own dedicated file, shop-items.chests.test.ts.
test("the chests category now holds real Shop products (Phase 5's own Shop acquisition)", () => {
  const chestItems = SHOP_ITEMS.filter((item) => item.categoryId === "chests");
  assert.ok(chestItems.length > 0, "chest products exist under this category as of Phase 5");
});
