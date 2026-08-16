// EGGS PHASE 6 focused coverage for the Shop's "eggs" category catalog —
// prices/currency are centrally defined here (SHOP_ITEMS), never
// hardcoded a second time in any UI component.
import assert from "node:assert/strict";
import { test } from "node:test";

import { SHOP_ITEMS } from "./shop-items.ts";
import { SHOP_CATEGORIES } from "./shop-categories.ts";
import { EGG_DEFINITIONS } from "@/features/eggs/data/egg-definitions";
import { INCUBATOR_DEFINITIONS } from "@/features/eggs/data/incubator-definitions";

test("exactly 4 egg products exist, one per PokemonRarity, under the eggs category", () => {
  const eggItems = SHOP_ITEMS.filter((item) => item.categoryId === "eggs" && item.eggRarity);
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

// INCUBATOR EXPANSION — the eggs category now also holds the 4 incubator
// products, per this phase's own "same category, never a second one"
// requirement.
test("the eggs category holds exactly 8 products: the 4 eggs plus the 4 incubators, no more, no fewer", () => {
  const eggCategoryItems = SHOP_ITEMS.filter((item) => item.categoryId === "eggs");
  assert.equal(eggCategoryItems.length, 8);
});

test("exactly 4 incubator products exist, one per IncubatorTypeId, under the eggs category", () => {
  const incubatorItems = SHOP_ITEMS.filter((item) => item.categoryId === "eggs" && item.incubatorTypeId);
  assert.equal(incubatorItems.length, 4);
  assert.deepEqual(
    incubatorItems.map((item) => item.incubatorTypeId).sort(),
    ["advanced", "master", "regular", "ultra"]
  );
});

test("incubator prices/currencies match the spec exactly: Regular 700 Coins, Advanced 1500 Coins, Ultra 50 Gold, Master 80 Gold", () => {
  const byType = Object.fromEntries(
    SHOP_ITEMS.filter((item) => item.categoryId === "eggs" && item.incubatorTypeId).map((item) => [item.incubatorTypeId, item])
  );

  assert.equal(byType.regular.price, 700);
  assert.equal(byType.regular.currency, "money");
  assert.equal(byType.advanced.price, 1500);
  assert.equal(byType.advanced.currency, "money");
  assert.equal(byType.ultra.price, 50);
  assert.equal(byType.ultra.currency, "gold");
  assert.equal(byType.master.price, 80);
  assert.equal(byType.master.currency, "gold");
});

test("each incubator product's name/image are derived from the existing INCUBATOR_DEFINITIONS, never re-typed", () => {
  for (const definition of INCUBATOR_DEFINITIONS) {
    const item = SHOP_ITEMS.find((candidate) => candidate.categoryId === "eggs" && candidate.incubatorTypeId === definition.id);
    assert.ok(item, `a shop item must exist for ${definition.id}`);
    assert.equal(item?.name, definition.displayName);
    assert.equal(item?.imageUrl, definition.imageUrl);
    assert.match(item!.imageUrl, /^\/images\/eggs\//);
  }
});
