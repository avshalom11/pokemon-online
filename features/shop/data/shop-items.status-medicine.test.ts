// Focused regression test for the 6 status-healing Medicine items (Antidote/
// Burn Heal/Paralyze Heal/Awakening/Ice Heal/Full Heal) — all under the
// existing "potions" category, never a new category, per this feature's own
// spec.
import assert from "node:assert/strict";
import { test } from "node:test";

import { SHOP_ITEMS } from "./shop-items.ts";

const STATUS_MEDICINE_ITEMS: readonly { id: string; price: number; curesStatus: string }[] = [
  { id: "antidote", price: 500, curesStatus: "poison" },
  { id: "burn-heal", price: 500, curesStatus: "burn" },
  { id: "paralyze-heal", price: 500, curesStatus: "paralysis" },
  { id: "awakening", price: 500, curesStatus: "sleep" },
  { id: "ice-heal", price: 500, curesStatus: "freeze" },
  { id: "full-heal", price: 1200, curesStatus: "all" },
];

test("all 6 status-healing items exist in SHOP_ITEMS, under the potions category, with correct price/currency/cure metadata", () => {
  for (const expected of STATUS_MEDICINE_ITEMS) {
    const item = SHOP_ITEMS.find((candidate) => candidate.id === expected.id);
    assert.ok(item, `${expected.id} must exist in SHOP_ITEMS`);
    assert.equal(item!.categoryId, "potions", `${expected.id} must be in the potions category`);
    assert.equal(item!.price, expected.price, `${expected.id} price`);
    assert.equal(item!.currency, "money", `${expected.id} must use Money, never Gold`);
    assert.equal(item!.medicineEffectKind, "cure-status", `${expected.id} medicineEffectKind`);
    assert.equal(item!.curesStatus, expected.curesStatus, `${expected.id} curesStatus`);
    assert.equal(item!.healPercent, undefined, `${expected.id} must never set healPercent (that's a heal/revive-only field)`);
  }
});

test("the exact expected image path is used for all 6 items, via the existing getShopItemImagePath mechanism", () => {
  for (const expected of STATUS_MEDICINE_ITEMS) {
    const item = SHOP_ITEMS.find((candidate) => candidate.id === expected.id)!;
    assert.equal(item.imageUrl, `/images/items/potions/${expected.id}.png`);
  }
});

test("Full Heal cures 'all'; the other five each cure exactly one distinct MajorStatus, covering all 5", () => {
  const singles = STATUS_MEDICINE_ITEMS.filter((item) => item.id !== "full-heal");
  const curedStatuses = singles.map((item) => item.curesStatus);

  assert.equal(new Set(curedStatuses).size, 5, "each single-status item must cure a distinct status");
  assert.deepEqual(new Set(curedStatuses), new Set(["poison", "burn", "paralysis", "sleep", "freeze"]));

  const fullHeal = SHOP_ITEMS.find((item) => item.id === "full-heal")!;
  assert.equal(fullHeal.curesStatus, "all");
});

test("no non-status-healing Medicine item was accidentally given curesStatus (Potion/Super Potion/Hyper Potion/Max Potion/Revive/Max Revive unaffected)", () => {
  const unaffectedIds = ["potion", "super-potion", "hyper-potion", "max-potion", "revive", "max-revive"];
  for (const id of unaffectedIds) {
    const item = SHOP_ITEMS.find((candidate) => candidate.id === id)!;
    assert.ok(item, `${id} must still exist`);
    assert.equal(item.curesStatus, undefined, `${id} must not have curesStatus set`);
    assert.ok(item.medicineEffectKind === "heal" || item.medicineEffectKind === "revive", `${id}'s medicineEffectKind must be unchanged`);
    assert.notEqual(item.healPercent, undefined, `${id} must still have healPercent set`);
  }
});

test("the potions category now has exactly 12 items — the original 6 heal/revive plus the 6 new status-healing items", () => {
  const potionItems = SHOP_ITEMS.filter((item) => item.categoryId === "potions");
  assert.equal(potionItems.length, 12);
});

test("no item id collides between the 6 new items and any existing Shop item", () => {
  const allIds = SHOP_ITEMS.map((item) => item.id);
  assert.equal(new Set(allIds).size, allIds.length, "no duplicate item id anywhere in SHOP_ITEMS");
});
