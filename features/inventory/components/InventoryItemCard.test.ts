// MEGA EVOLUTION — UI/NAMING FIXES — regression guard for the Inventory's
// new evolution-stone info button, mirroring ShopItemCard.test.ts's own
// static-source-check approach (no React Testing Library/jsdom set up in
// this project) since this is a "use client"-tree component.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const cardSource = readFileSync(new URL("./InventoryItemCard.tsx", import.meta.url), "utf8");

test("every evolution product (stones category) gets a question-mark info button, same as ShopItemCard", () => {
  assert.ok(/item\.categoryId === "stones"/.test(cardSource), "the info button must be gated on the stones category");
  assert.ok(/>\s*\?\s*<\/button>/.test(cardSource), "the button's visible content must be a literal '?'");
});

test("the info button is a real <button> element that stops propagation before opening the dialog", () => {
  assert.ok(
    /<button\s+type="button"\s*\n\s*onClick=\{\(event\) => \{\s*\n\s*event\.stopPropagation\(\);\s*\n\s*setIsInfoOpen\(true\);/.test(cardSource),
    "the info button must be a <button type=\"button\"> whose onClick stops propagation before opening the dialog"
  );
});

test("the info button and the card's own selectable button are siblings, not nested (no <button> inside <button>)", () => {
  const cardButtonIndex = cardSource.indexOf("onClick={onSelect}");
  const cardButtonCloseIndex = cardSource.indexOf("</button>", cardButtonIndex);
  const infoButtonIndex = cardSource.indexOf("aria-label={");

  assert.ok(cardButtonIndex > -1 && cardButtonCloseIndex > -1 && infoButtonIndex > -1);
  assert.ok(infoButtonIndex > cardButtonCloseIndex, "the info button must be declared after the card's own <button> has already closed");
});

test("clicking the info button opens the existing EvolutionItemInfoDialog, reused as-is — never a second/hardcoded dialog or Pokémon list", () => {
  assert.ok(cardSource.includes("import { EvolutionItemInfoDialog }"), "InventoryItemCard must import the same dialog ShopItemCard uses");
  assert.ok(cardSource.includes("isEvolutionProduct && isInfoOpen"), "the dialog must only render once opened, and only for an evolution product");
  assert.ok(cardSource.includes("itemId={item.id}"), "the dialog must receive the real owned item id, not a hardcoded one");
});

test("non-evolution, non-TM items never render the info button", () => {
  assert.ok(
    /isEvolutionProduct \|\| isTmProduct \? \(\s*\n\s*<button/.test(cardSource),
    "the info button must be conditionally rendered behind isEvolutionProduct || isTmProduct"
  );
});

test("POKÉDEX + INVENTORY UI IMPROVEMENTS — the old inline 'מתפתחים:' evolution-label summary is removed; compatibility info now lives only in the '?' dialog", () => {
  assert.ok(!cardSource.includes("getEvolutionItemDisplayLabels"), "the inline label summary derivation must be removed");
  assert.ok(!cardSource.includes("מתפתחים"), "the inline label must no longer render on the card");
});

test("the card never triggers the sell or evolve-item action directly", () => {
  assert.ok(!cardSource.includes("sellInventoryItemAction"), "InventoryItemCard must never call the sell action directly");
  assert.ok(!cardSource.includes("acceptEvolutionItemAction"), "InventoryItemCard must never call the evolve action directly — that stays EvolutionItemPanel's own flow");
});
