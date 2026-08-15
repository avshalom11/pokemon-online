// EGGS PHASE 6 focused coverage for the Shop's "eggs" category catalog —
// prices/currency are centrally defined here (SHOP_ITEMS), never
// hardcoded a second time in any UI component.
import assert from "node:assert/strict";
import { test } from "node:test";

import { SHOP_ITEMS } from "./shop-items.ts";
import { SHOP_CATEGORIES } from "./shop-categories.ts";
import { EGG_DEFINITIONS } from "@/features/eggs/data/egg-definitions";

test("exactly 4 egg products exist, one per PokemonRarity, under the eggs category", () => {
  const eggItems = SHOP_ITEMS.filter((item) => item.categoryId === "eggs");
  assert.equal(eggItems.length, 4);
  assert.deepEqual(
    eggItems.map((item) => item.eggRarity).sort(),
    ["common", "legendary", "rare", "very-rare"]
  );
});

test("Common and Rare eggs use Coins (money); Very Rare and Legendary use Gold", () => {
  const byRarity = Object.fromEntries(
    SHOP_ITEMS.filter((item) => item.categoryId === "eggs").map((item) => [item.eggRarity, item])
  );

  assert.equal(byRarity.common.currency, "money");
  assert.equal(byRarity.rare.currency, "money");
  assert.equal(byRarity["very-rare"].currency, "gold");
  assert.equal(byRarity.legendary.currency, "gold");
});

test("Rare Egg costs more than Common Egg (both Coins); Legendary costs significantly more than Very Rare (both Gold)", () => {
  const byRarity = Object.fromEntries(
    SHOP_ITEMS.filter((item) => item.categoryId === "eggs").map((item) => [item.eggRarity, item])
  );

  assert.ok(byRarity.rare.price > byRarity.common.price);
  assert.ok(byRarity.legendary.price > byRarity["very-rare"].price * 1.5, "legendary must be significantly above very-rare");
});

test("each egg product's name/image are derived from the existing EGG_DEFINITIONS, never re-typed", () => {
  for (const definition of EGG_DEFINITIONS) {
    const item = SHOP_ITEMS.find((candidate) => candidate.categoryId === "eggs" && candidate.eggRarity === definition.rarity);
    assert.ok(item, `a shop item must exist for ${definition.rarity}`);
    assert.equal(item?.name, definition.displayName);
    assert.equal(item?.imageUrl, definition.imageUrl);
    assert.match(item!.imageUrl, /^\/images\/eggs\//);
  }
});

test("the eggs category exists with the required Hebrew region-source explanation as its tip", () => {
  const category = SHOP_CATEGORIES.find((candidate) => candidate.id === "eggs");
  assert.ok(category);
  assert.equal(
    category?.tip,
    "ביצה שנקנתה בחנות תכיל פוקימון רק מהמחוז שבו השחקן נמצא בזמן הקנייה, וביצה שנפלה בקרב תכיל פוקימון רק מהמחוז שבו נערך הקרב."
  );
});

test("no purchasable incubator item exists yet — the eggs category holds only the 4 egg products", () => {
  const eggCategoryItems = SHOP_ITEMS.filter((item) => item.categoryId === "eggs");
  assert.equal(eggCategoryItems.length, 4, "no incubator products must be added yet");
});
