// Regression guard for the Shop UI Redesign phase: evolution-product cards
// must show a thematic description (never a permanent inline Pokémon
// list) and must expose a question-mark info button. ShopItemCard is a
// "use client"-tree component with no React Testing Library/jsdom set up
// in this project, so this checks the invariants via a static source read —
// same approach as features/pokedex/components/PokedexCard.test.ts and
// features/battle/components/BattleContent.rarity-display.test.ts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const cardSource = readFileSync(new URL("./ShopItemCard.tsx", import.meta.url), "utf8");

test("the card never renders a permanent inline evolution list under the product", () => {
  assert.ok(!cardSource.includes("getEvolutionItemDisplayLabels"), "ShopItemCard must not import/use the card-summary label list anymore");
  assert.ok(!cardSource.includes("מתפתחים"), "the old 'מתפתחים:' inline list label must not appear in ShopItemCard");
});

test("the card shows item.description (the thematic sentence), unconditionally", () => {
  assert.ok(cardSource.includes("{item.description}"), "the product's own description must still be rendered on the card");
});

test("every evolution product (stones category) gets a question-mark info button", () => {
  assert.ok(/item\.categoryId === "stones"/.test(cardSource), "the info button must be gated on the stones category");
  assert.ok(/>\s*\?\s*<\/button>/.test(cardSource), "the button's visible content must be a literal '?'");
});

test("the info button is visually circular and positioned at the card's top-right corner", () => {
  const ariaLabelIndex = cardSource.indexOf('aria-label="הצג פוקימונים שניתן לפתח באמצעות מוצר זה"');
  const classNameIndex = cardSource.indexOf("className=", ariaLabelIndex);
  const classNameValue = cardSource.slice(classNameIndex, cardSource.indexOf('"', classNameIndex + 'className="'.length) + 1);

  assert.ok(classNameValue.includes("rounded-full"), "the info button must be circular (rounded-full)");
  assert.ok(classNameValue.includes("top-1.5") || classNameValue.includes("top-2"), "the info button must be pinned to the top");
  assert.ok(classNameValue.includes("right-1.5") || classNameValue.includes("right-2"), "the info button must be pinned to the right (physical, RTL-safe) edge");
  assert.ok(classNameValue.includes("absolute"), "the info button must be absolutely positioned within its relative card wrapper");
});

test("the info button has the required accessible Hebrew aria-label", () => {
  assert.ok(
    cardSource.includes('aria-label="הצג פוקימונים שניתן לפתח באמצעות מוצר זה"'),
    "the info button must carry this exact Hebrew aria-label"
  );
});

test("the info button is a real <button> element, never a div/span with a click handler", () => {
  assert.ok(/<button\s+type="button"\s*\n\s*onClick=\{\(event\) => \{\s*\n\s*event\.stopPropagation\(\);\s*\n\s*setIsInfoOpen\(true\);/.test(cardSource),
    "the info button must be a <button type=\"button\"> whose onClick stops propagation before opening the dialog"
  );
});

test("clicking the info button never triggers the card's own onSelect (stopPropagation guard present)", () => {
  assert.ok(cardSource.includes("event.stopPropagation();"), "the info button's click handler must stop propagation");
});

test("the info button and the card's own selectable button are siblings, not nested (no <button> inside <button>)", () => {
  const cardButtonIndex = cardSource.indexOf("onClick={onSelect}");
  const cardButtonCloseIndex = cardSource.indexOf("</button>", cardButtonIndex);
  const infoButtonIndex = cardSource.indexOf('aria-label="הצג פוקימונים שניתן לפתח באמצעות מוצר זה"');

  assert.ok(cardButtonIndex > -1 && cardButtonCloseIndex > -1 && infoButtonIndex > -1);
  assert.ok(infoButtonIndex > cardButtonCloseIndex, "the info button must be declared after the card's own <button> has already closed");
});

test("clicking the info button opens EvolutionItemInfoDialog, derived from the item id — never a hardcoded Pokémon list", () => {
  assert.ok(cardSource.includes("import { EvolutionItemInfoDialog }"), "ShopItemCard must import the info dialog");
  assert.ok(cardSource.includes("isEvolutionProduct && isInfoOpen"), "the dialog must only render once opened, and only for an evolution product");
  assert.ok(cardSource.includes("itemId={item.id}"), "the dialog must receive the real item id, not a hardcoded one");
});

test("non-evolution items (poke-balls/potions) never render the info button", () => {
  // The gate is the single `isEvolutionProduct` flag derived from
  // item.categoryId === "stones" — asserted structurally above. This test
  // guards against a future edit accidentally rendering the button
  // unconditionally (e.g. removing the `isEvolutionProduct ? ... : null`
  // wrapper).
  assert.ok(/isEvolutionProduct \? \(\s*\n\s*<button/.test(cardSource), "the info button must be conditionally rendered behind isEvolutionProduct");
});

test("the card never changes prices or triggers purchase logic itself", () => {
  assert.ok(!cardSource.includes("purchaseShopItemAction"), "ShopItemCard must never call the purchase action directly");
  assert.ok(!/item\.price\s*=/.test(cardSource), "ShopItemCard must never mutate item.price");
});
