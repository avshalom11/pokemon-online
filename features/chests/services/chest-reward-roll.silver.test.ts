// CHESTS PHASE 2 — focused coverage for Silver Chest reward rolls. All
// deterministic via injected random() sequences (paddedRandom/
// sequenceRandom) — never statistical/flaky. Exact expected result arrays
// below were derived by hand-tracing rollChestReward's own documented call
// order, then cross-checked by actually running the engine — see this
// phase's own Final Report for the verification method.
import assert from "node:assert/strict";
import { test } from "node:test";

import { rollChestReward } from "./chest-reward-roll.service.ts";
import { paddedRandom } from "../../../test/support/deterministic-random.ts";
import type { ChestRewardResult } from "../types/chest-reward.types.ts";

function categoriesOf(results: ReturnType<typeof rollChestReward>): string[] {
  return results.map((result) => result.category);
}

// Finds the one reward of a given category, narrowed to that category's
// own concrete shape — a plain `.find(r => r.category === ...)` only
// narrows the CALLBACK's own parameter type, never the array method's
// return type, so callers need this explicit `Extract` cast to read e.g.
// `.rarity`/`.amount` off the result without a raw `as` escape hatch.
function findReward<C extends ChestRewardResult["category"]>(
  results: readonly ChestRewardResult[],
  category: C
): Extract<ChestRewardResult, { category: C }> | undefined {
  return results.find((result): result is Extract<ChestRewardResult, { category: C }> => result.category === category);
}

test("Egg, Money, and Gold are always present, regardless of any other roll", () => {
  const results = rollChestReward("silver", paddedRandom([], 0.9));
  const categories = categoriesOf(results);
  assert.ok(categories.includes("egg"));
  assert.ok(categories.includes("money"));
  assert.ok(categories.includes("gold"));
});

test("egg rarity follows the exact 80/20 Common/Rare config, at its exact boundary", () => {
  // Common band is [0, 0.8) — 0.79999 must still land in Common.
  const common = rollChestReward("silver", paddedRandom([0.79999], 0.9));
  assert.equal(findReward(common, "egg")?.rarity, "common");

  // 0.8 exactly (and above) must land in Rare — the last band always
  // catches the remainder.
  const rare = rollChestReward("silver", paddedRandom([0.8], 0.9));
  assert.equal(findReward(rare, "egg")?.rarity, "rare");
});

test("Money is always within the inclusive 500–1500 range, hitting both boundaries exactly", () => {
  const atMin = rollChestReward("silver", paddedRandom([0, 0], 0.9));
  assert.equal(findReward(atMin, "money")?.amount, 500);

  const atMax = rollChestReward("silver", paddedRandom([0, 0.999999], 0.9));
  assert.equal(findReward(atMax, "money")?.amount, 1500);
});

test("Gold is always within the inclusive 1–5 range, hitting both boundaries exactly", () => {
  const atMin = rollChestReward("silver", paddedRandom([0, 0, 0], 0.9));
  assert.equal(findReward(atMin, "gold")?.amount, 1);

  const atMax = rollChestReward("silver", paddedRandom([0, 0, 0.999999], 0.9));
  assert.equal(findReward(atMax, "gold")?.amount, 5);
});

test("zero bonus categories is possible — exactly 3 total (Egg, Money, Gold), no evolution-item category ever", () => {
  // All 4 bonus checks forced to fail (>= 0.5).
  const results = rollChestReward("silver", paddedRandom([0.1, 0.2, 0.3], 0.9));
  assert.deepEqual(categoriesOf(results), ["egg", "money", "gold"]);
  assert.ok(!categoriesOf(results).includes("evolution-item"), "evolution-item is never available in Silver Chest");
});

test("no evolution-item category ever, even when every bonus check passes", () => {
  const results = rollChestReward("silver", paddedRandom([], 0));
  assert.ok(!categoriesOf(results).includes("evolution-item"));
});

test("at most 2 bonus categories are ever awarded, even when all 4 optional categories pass", () => {
  // All 4 bonus checks pass (random 0 < 0.5) -> triggers the cap-selection
  // step (2 more calls) -> then each awarded builder's own roll(s).
  const results = rollChestReward("silver", paddedRandom([], 0));
  const optionalAwarded = categoriesOf(results).filter((category) => category !== "egg" && category !== "money" && category !== "gold");
  assert.ok(optionalAwarded.length <= 2, `expected at most 2 bonus categories, got ${optionalAwarded.length}`);
  assert.equal(results.length, 5, "3 mandatory + exactly 2 bonus categories = 5, Silver's own documented maximum");
});

test("Silver awards between 3 and 5 total reward categories across both boundary paths", () => {
  const minPath = rollChestReward("silver", paddedRandom([], 0.9));
  const maxPath = rollChestReward("silver", paddedRandom([], 0));
  assert.equal(minPath.length, 3);
  assert.equal(maxPath.length, 5);
});

test("no category is ever awarded twice in one opening, across many different deterministic sequences", () => {
  const sequences = [
    paddedRandom([], 0),
    paddedRandom([], 0.9),
    paddedRandom([0.1, 0.3, 0.7, 0.2, 0.8, 0.1, 0.6], 0.4),
    paddedRandom([0.9, 0.1, 0.5, 0.9, 0.1, 0.9, 0.1], 0.6),
  ];
  for (const random of sequences) {
    const categories = categoriesOf(rollChestReward("silver", random));
    assert.equal(new Set(categories).size, categories.length, "every category must be unique within one opening");
  }
});

test("the full exact reward set at the deterministic all-0 (maximum) path", () => {
  const results = rollChestReward("silver", paddedRandom([], 0));
  assert.deepEqual(results, [
    { category: "egg", rarity: "common" },
    { category: "money", amount: 500 },
    { category: "gold", amount: 1 },
    { category: "poke-balls", itemId: "poke-ball", quantity: 2 },
    { category: "potions", itemId: "potion", quantity: 2 },
  ]);
});

test("the full exact reward set at the deterministic all-0.999999 (minimum, zero-bonus) path", () => {
  const results = rollChestReward("silver", paddedRandom([], 0.999999));
  assert.deepEqual(results, [
    { category: "egg", rarity: "rare" },
    { category: "money", amount: 1500 },
    { category: "gold", amount: 5 },
  ]);
});
