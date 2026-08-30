// CHESTS PHASE 2 — focused coverage for Diamond Chest reward rolls. All
// deterministic via injected random() sequences — never statistical/
// flaky. Exact expected result arrays below were derived by hand-tracing
// rollChestReward's own documented call order, then cross-checked by
// actually running the engine — see this phase's own Final Report for the
// verification method.
import assert from "node:assert/strict";
import { test } from "node:test";

import { CHEST_REWARD_BUILDERS, rollChestReward } from "./chest-reward-roll.service.ts";
import { paddedRandom } from "../../../test/support/deterministic-random.ts";
import type { ChestRewardResult, ItemBundleChestReward } from "../types/chest-reward.types.ts";

function categoriesOf(results: ReturnType<typeof rollChestReward>): string[] {
  return results.map((result) => result.category);
}

// Narrows the diamond poke-balls builder's own result down to its bundle
// shape — that builder only ever returns an ItemBundleChestReward, but its
// declared return type is the full ChestRewardResult union (same as every
// other builder), so tests that read `.itemId`/`.quantity` off it need an
// explicit assertion here rather than an unsafe cast.
function asItemBundle(reward: ChestRewardResult): ItemBundleChestReward {
  assert.equal(reward.category, "poke-balls");
  return reward as ItemBundleChestReward;
}

// Finds the one reward of a given category, narrowed to that category's
// own concrete shape — see chest-reward-roll.silver.test.ts's own doc
// comment on this same helper for why the explicit `Extract` is needed.
function findReward<C extends ChestRewardResult["category"]>(
  results: readonly ChestRewardResult[],
  category: C
): Extract<ChestRewardResult, { category: C }> | undefined {
  return results.find((result): result is Extract<ChestRewardResult, { category: C }> => result.category === category);
}

test("Egg, Money, and Gold are always present, regardless of any other roll", () => {
  const results = rollChestReward("diamond", paddedRandom([], 0.9));
  const categories = categoriesOf(results);
  assert.ok(categories.includes("egg"));
  assert.ok(categories.includes("money"));
  assert.ok(categories.includes("gold"));
});

test("the egg is ALWAYS Legendary, at both extremes of the random() range", () => {
  const atZero = rollChestReward("diamond", paddedRandom([0], 0.9));
  const atMax = rollChestReward("diamond", paddedRandom([0.999999], 0.9));
  assert.equal(findReward(atZero, "egg")?.rarity, "legendary");
  assert.equal(findReward(atMax, "egg")?.rarity, "legendary");
});

test("Money is always within the inclusive 7500–10000 range, hitting both boundaries exactly", () => {
  const atMin = rollChestReward("diamond", paddedRandom([0, 0], 0.9));
  assert.equal(findReward(atMin, "money")?.amount, 7500);

  const atMax = rollChestReward("diamond", paddedRandom([0, 0.999999], 0.9));
  assert.equal(findReward(atMax, "money")?.amount, 10000);
});

test("Gold is always within the inclusive 50–90 range, hitting both boundaries exactly", () => {
  const atMin = rollChestReward("diamond", paddedRandom([0, 0, 0], 0.9));
  assert.equal(findReward(atMin, "gold")?.amount, 50);

  const atMax = rollChestReward("diamond", paddedRandom([0, 0, 0.999999], 0.9));
  assert.equal(findReward(atMax, "gold")?.amount, 90);
});

test("exactly 2 additional mandatory categories are always present, even when every bonus check fails", () => {
  const results = rollChestReward("diamond", paddedRandom([0, 0, 0], 0.9));
  const optional = categoriesOf(results).filter((category) => !["egg", "money", "gold"].includes(category));
  assert.equal(optional.length, 2, "exactly 2 mandatory extras, zero bonuses");
});

test("Diamond always has at least 5 reward categories (3 mandatory + 2 mandatory-extra), even with zero bonuses", () => {
  const results = rollChestReward("diamond", paddedRandom([], 0.9));
  assert.equal(results.length, 5);
});

test("EVERY remaining category can independently appear as a bonus — no cap — up to all 5 optional categories total", () => {
  const results = rollChestReward("diamond", paddedRandom([], 0));
  const optional = categoriesOf(results).filter((category) => !["egg", "money", "gold"].includes(category));
  assert.equal(new Set(optional).size, 5, "all 5 optional categories (poke-balls, potions, revive, evolution-item, incubator) present");
  assert.equal(results.length, 8, "3 mandatory + all 5 optional = 8, Diamond's own documented maximum — every available category");
});

test("it is valid for none of the remaining (non-mandatory-extra) categories to pass their bonus roll", () => {
  // All-0.999999 path: 2 mandatory extras are forced, but the 3 remaining
  // candidates all fail their independent 50% check.
  const results = rollChestReward("diamond", paddedRandom([], 0.999999));
  const optional = categoriesOf(results).filter((category) => !["egg", "money", "gold"].includes(category));
  assert.equal(optional.length, 2, "only the 2 mandatory extras — zero of the 3 remaining passed");
});

test("Diamond's Poké Ball weights are exactly 40/40/20, verified at every boundary", () => {
  const builder = CHEST_REWARD_BUILDERS.diamond["poke-balls"];
  assert.ok(builder);
  if (!builder) return;

  assert.equal(asItemBundle(builder(paddedRandom([0], 0))).itemId, "great-ball");
  assert.equal(asItemBundle(builder(paddedRandom([0.39999], 0))).itemId, "great-ball");
  assert.equal(asItemBundle(builder(paddedRandom([0.4], 0))).itemId, "ultra-ball");
  assert.equal(asItemBundle(builder(paddedRandom([0.79999], 0))).itemId, "ultra-ball");
  assert.equal(asItemBundle(builder(paddedRandom([0.8], 0))).itemId, "master-ball");
  assert.equal(asItemBundle(builder(paddedRandom([0.999999], 0))).itemId, "master-ball");
});

test("Diamond's Great Ball quantity is always in the inclusive 4–8 range", () => {
  const builder = CHEST_REWARD_BUILDERS.diamond["poke-balls"];
  assert.ok(builder);
  if (!builder) return;

  const atMin = asItemBundle(builder(paddedRandom([0, 0], 0.9)));
  const atMax = asItemBundle(builder(paddedRandom([0, 0.999999], 0.9)));
  assert.equal(atMin.quantity, 4);
  assert.equal(atMax.quantity, 8);
});

test("Diamond's Ultra Ball quantity is always in the inclusive 2–4 range", () => {
  const builder = CHEST_REWARD_BUILDERS.diamond["poke-balls"];
  assert.ok(builder);
  if (!builder) return;

  const atMin = asItemBundle(builder(paddedRandom([0.4, 0], 0.9)));
  const atMax = asItemBundle(builder(paddedRandom([0.4, 0.999999], 0.9)));
  assert.equal(atMin.quantity, 2);
  assert.equal(atMax.quantity, 4);
});

test("Diamond's Master Ball is always exactly quantity 1, with no further roll", () => {
  const builder = CHEST_REWARD_BUILDERS.diamond["poke-balls"];
  assert.ok(builder);
  if (!builder) return;

  const reward = asItemBundle(builder(paddedRandom([0.8], 0.9)));
  assert.equal(reward.quantity, 1);
});

test("an evolution-item reward always gives 2 or 3 items, never fewer or more", () => {
  const builder = CHEST_REWARD_BUILDERS.diamond["evolution-item"];
  assert.ok(builder);
  if (!builder) return;

  const two = builder(paddedRandom([0], 0));
  const three = builder(paddedRandom([0.999999], 0));
  if (two.category !== "evolution-item" || three.category !== "evolution-item") return;
  assert.equal(two.items.length, 2);
  assert.equal(three.items.length, 3);
});

test("evolution-item selection prefers distinct items within the same bundle", () => {
  const builder = CHEST_REWARD_BUILDERS.diamond["evolution-item"];
  assert.ok(builder);
  if (!builder) return;

  const reward = builder(paddedRandom([0.999999], 0));
  if (reward.category !== "evolution-item") return;
  const itemIds = reward.items.map((item) => item.itemId);
  assert.equal(new Set(itemIds).size, itemIds.length, "no repeated evolution item within one bundle");
});

test("no category is ever awarded twice in one opening, across many different deterministic sequences", () => {
  const sequences = [
    paddedRandom([], 0),
    paddedRandom([], 0.9),
    paddedRandom([0.1, 0.3, 0.7], 0.4),
    paddedRandom([0.9, 0.1, 0.5], 0.6),
  ];
  for (const random of sequences) {
    const categories = categoriesOf(rollChestReward("diamond", random));
    assert.equal(new Set(categories).size, categories.length, "every category must be unique within one opening");
  }
});

test("the full exact reward set at the deterministic all-0 (maximum, every category) path", () => {
  const results = rollChestReward("diamond", paddedRandom([], 0));
  assert.deepEqual(results, [
    { category: "egg", rarity: "legendary" },
    { category: "money", amount: 7500 },
    { category: "gold", amount: 50 },
    { category: "poke-balls", itemId: "great-ball", quantity: 4 },
    { category: "potions", itemId: "hyper-potion", quantity: 2 },
    { category: "revive", itemId: "revive", quantity: 2 },
    {
      category: "evolution-item",
      items: [
        { itemId: "fire-stone", quantity: 1 },
        { itemId: "water-stone", quantity: 1 },
      ],
    },
    { category: "incubator", incubatorTypeId: "ultra" },
  ]);
});

test("the full exact reward set at the deterministic all-0.999999 (minimum, 5-category) path", () => {
  const results = rollChestReward("diamond", paddedRandom([], 0.999999));
  assert.deepEqual(results, [
    { category: "egg", rarity: "legendary" },
    { category: "money", amount: 10000 },
    { category: "gold", amount: 90 },
    { category: "incubator", incubatorTypeId: "master" },
    {
      category: "evolution-item",
      items: [
        { itemId: "shiny-stone", quantity: 1 },
        { itemId: "dusk-stone", quantity: 1 },
        { itemId: "ice-stone", quantity: 1 },
      ],
    },
  ]);
});
