// Focused regression test for the Shop's evolution-item ("stones" category)
// catalog. Evolution Item Cleanup phase's original catalog had 16 evolution
// products (10 Evolution Stones + 6 Evolution Items); Evolution Item
// Consolidation phase retired Dragon Scale, Protector, Reaper Cloth, and
// Dawn Stone (each used by only 1-2 evolutions, remapped onto an existing
// item instead), leaving exactly 12, each still at the same 70-gold price,
// with none of the retired item ids present anywhere.
import assert from "node:assert/strict";
import { test } from "node:test";

import { SHOP_ITEMS } from "./shop-items.ts";
import { isEvolutionItemId } from "@/data/pokemon/pokemon-evolutions";

const EVOLUTION_STONES = ["fire-stone", "water-stone", "thunder-stone", "leaf-stone", "sun-stone", "moon-stone", "ice-stone", "dusk-stone", "shiny-stone"];
const EVOLUTION_ITEMS = ["kings-rock", "metal-coat", "upgrade"];
// MEGA EVOLUTION PHASE 2 — the 13th evolution product, priced above the
// other 12 per that phase's own explicit spec (150 vs. their shared 70).
const MEGA_EVOLUTION_ITEMS = ["mega-stone"];

test("the Shop's stones category contains exactly the 13 canonical evolution products, no more, no fewer", () => {
  const stoneIds = SHOP_ITEMS.filter((item) => item.categoryId === "stones").map((item) => item.id);
  const expected = [...EVOLUTION_STONES, ...EVOLUTION_ITEMS, ...MEGA_EVOLUTION_ITEMS];

  assert.equal(stoneIds.length, 13);
  assert.deepEqual([...stoneIds].sort(), [...expected].sort());
});

test("every evolution product costs 70 gold, except Mega Stone at 150 (the generic buy price the 50% sell rule derives from either way)", () => {
  const stoneItems = SHOP_ITEMS.filter((item) => item.categoryId === "stones");
  for (const item of stoneItems) {
    const expectedPrice = item.id === "mega-stone" ? 150 : 70;
    assert.equal(item.price, expectedPrice, `${item.id} must cost ${expectedPrice} gold`);
    assert.equal(item.currency, "gold", `${item.id} must use gold currency`);
  }
});

test("every Shop item id is a recognized EvolutionItemId whenever it's in the stones category, and never otherwise", () => {
  for (const item of SHOP_ITEMS) {
    assert.equal(isEvolutionItemId(item.id), item.categoryId === "stones", `${item.id}'s EvolutionItemId recognition must match its category`);
  }
});

test("none of the twelve retired evolution items exist in the Shop catalog", () => {
  const retiredIds = [
    "deep-sea-tooth",
    "deep-sea-scale",
    "dubious-disc",
    "razor-claw",
    "razor-fang",
    "electirizer",
    "magmarizer",
    "oval-stone",
    "dragon-scale",
    "protector",
    "reaper-cloth",
    "dawn-stone",
  ];
  const shopIds = new Set(SHOP_ITEMS.map((item) => item.id));
  for (const itemId of retiredIds) {
    assert.equal(shopIds.has(itemId), false, `${itemId} must not exist in the Shop catalog`);
  }
});

// Shop UI Redesign phase — every evolution product's description is now a
// short THEMATIC sentence, never a Pokémon list (that moved to the
// question-mark info dialog, live-derived from the evolution registry —
// see evolution-item-catalog.test.ts). These are cheap regression guards
// against ever reverting this field back into a Pokémon-name dump.
test("every evolution product's description is a non-empty, concise, thematic sentence — never a Pokémon list", () => {
  const stoneItems = SHOP_ITEMS.filter((item) => item.categoryId === "stones");

  for (const item of stoneItems) {
    assert.ok(item.description.length > 0, `${item.id} must have a description`);
    assert.ok(item.description.length <= 80, `${item.id}'s description must stay concise (<=80 chars), got ${item.description.length}`);
    assert.ok(!item.description.includes("→"), `${item.id}'s description must never contain an arrow (that belongs in the info dialog, not here)`);
    assert.ok(!item.description.includes("מתפתחים"), `${item.id}'s description must never be the old inline-list label`);
  }
});

test("every evolution product has its own distinct description — no more shared generic boilerplate across items", () => {
  const stoneItems = SHOP_ITEMS.filter((item) => item.categoryId === "stones");
  const descriptions = stoneItems.map((item) => item.description);

  assert.equal(new Set(descriptions).size, descriptions.length, "no two evolution products should share the exact same description text");
});
