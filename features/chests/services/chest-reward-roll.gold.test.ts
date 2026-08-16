// CHESTS PHASE 2 — focused coverage for Gold Chest reward rolls. All
// deterministic via injected random() sequences — never statistical/
// flaky. Exact expected result arrays below were derived by hand-tracing
// rollChestReward's own documented call order, then cross-checked by
// actually running the engine — see this phase's own Final Report for the
// verification method.
import assert from "node:assert/strict";
import { test } from "node:test";

import { rollChestReward } from "./chest-reward-roll.service.ts";
import { paddedRandom } from "../../../test/support/deterministic-random.ts";
import type { ChestRewardResult } from "../types/chest-reward.types.ts";

function categoriesOf(results: ReturnType<typeof rollChestReward>): string[] {
  return results.map((result) => result.category);
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
  const results = rollChestReward("gold", paddedRandom([], 0.9));
  const categories = categoriesOf(results);
  assert.ok(categories.includes("egg"));
  assert.ok(categories.includes("money"));
  assert.ok(categories.includes("gold"));
});

test("egg rarity follows the exact 80/20 Rare/Very Rare config, at its exact boundary", () => {
  const rare = rollChestReward("gold", paddedRandom([0.79999], 0.9));
  assert.equal(findReward(rare, "egg")?.rarity, "rare");

  const veryRare = rollChestReward("gold", paddedRandom([0.8], 0.9));
  assert.equal(findReward(veryRare, "egg")?.rarity, "very-rare");
});

test("Money is always within the inclusive 2000–5000 range, hitting both boundaries exactly", () => {
  const atMin = rollChestReward("gold", paddedRandom([0, 0], 0.9));
  assert.equal(findReward(atMin, "money")?.amount, 2000);

  const atMax = rollChestReward("gold", paddedRandom([0, 0.999999], 0.9));
  assert.equal(findReward(atMax, "money")?.amount, 5000);
});

test("Gold is always within the inclusive 15–30 range, hitting both boundaries exactly", () => {
  const atMin = rollChestReward("gold", paddedRandom([0, 0, 0], 0.9));
  assert.equal(findReward(atMin, "gold")?.amount, 15);

  const atMax = rollChestReward("gold", paddedRandom([0, 0, 0.999999], 0.9));
  assert.equal(findReward(atMax, "gold")?.amount, 30);
});

test("exactly 1 additional mandatory category is always present, even when every bonus check fails", () => {
  const results = rollChestReward("gold", paddedRandom([0, 0, 0], 0.9));
  const optional = categoriesOf(results).filter((category) => !["egg", "money", "gold"].includes(category));
  assert.equal(optional.length, 1, "exactly 1 mandatory extra category, zero bonuses");
});

test("zero optional bonuses beyond the mandatory extra is possible — exactly 4 total categories", () => {
  const results = rollChestReward("gold", paddedRandom([], 0.9));
  assert.equal(results.length, 4, "3 mandatory + 1 mandatory-extra + 0 bonuses");
});

test("at most 3 bonus categories are ever awarded, even when all 4 remaining candidates pass", () => {
  // All 0s -> mandatory extra picks pool[0] ("poke-balls"), all 4
  // remaining pass, cap(3) triggers a uniform choice among the 4.
  const results = rollChestReward("gold", paddedRandom([], 0));
  const optional = categoriesOf(results).filter((category) => !["egg", "money", "gold"].includes(category));
  assert.ok(optional.length <= 4, "1 mandatory extra + at most 3 bonus = at most 4 optional categories");
  assert.equal(results.length, 7, "3 mandatory + 1 mandatory-extra + exactly 3 bonus = 7, Gold's own documented maximum");
});

test("Gold awards between 4 and 7 total reward categories across both boundary paths", () => {
  const minPath = rollChestReward("gold", paddedRandom([], 0.9));
  const maxPath = rollChestReward("gold", paddedRandom([], 0));
  assert.equal(minPath.length, 4);
  assert.equal(maxPath.length, 7);
});

test("an evolution-item reward always gives exactly 1 item", () => {
  // The all-0 max path's 3rd bonus pick lands on evolution-item (see the
  // exact-vector test below) — assert the shape directly here too.
  const results = rollChestReward("gold", paddedRandom([], 0));
  const evolutionReward = results.find((r) => r.category === "evolution-item");
  assert.ok(evolutionReward);
  if (evolutionReward?.category !== "evolution-item") return;
  assert.equal(evolutionReward.items.length, 1);
});

test("no category is ever awarded twice in one opening, across many different deterministic sequences", () => {
  const sequences = [
    paddedRandom([], 0),
    paddedRandom([], 0.9),
    paddedRandom([0.1, 0.3, 0.7, 0.2], 0.4),
    paddedRandom([0.9, 0.1, 0.5, 0.9], 0.6),
  ];
  for (const random of sequences) {
    const categories = categoriesOf(rollChestReward("gold", random));
    assert.equal(new Set(categories).size, categories.length, "every category must be unique within one opening");
  }
});

test("the full exact reward set at the deterministic all-0 (maximum) path", () => {
  const results = rollChestReward("gold", paddedRandom([], 0));
  assert.deepEqual(results, [
    { category: "egg", rarity: "rare" },
    { category: "money", amount: 2000 },
    { category: "gold", amount: 15 },
    { category: "poke-balls", itemId: "great-ball", quantity: 3 },
    { category: "potions", itemId: "super-potion", quantity: 2 },
    { category: "revive", itemId: "revive", quantity: 1 },
    { category: "evolution-item", items: [{ itemId: "fire-stone", quantity: 1 }] },
  ]);
});

test("the full exact reward set at the deterministic all-0.999999 (minimum, zero-bonus) path", () => {
  const results = rollChestReward("gold", paddedRandom([], 0.999999));
  assert.deepEqual(results, [
    { category: "egg", rarity: "very-rare" },
    { category: "money", amount: 5000 },
    { category: "gold", amount: 30 },
    { category: "incubator", incubatorTypeId: "ultra" },
  ]);
});
