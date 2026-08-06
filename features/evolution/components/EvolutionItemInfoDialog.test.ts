// Regression guard for the Shop UI Redesign phase's question-mark info
// dialog. Same static-source-check approach as ShopItemCard.test.ts (no
// React Testing Library/jsdom set up in this project).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const dialogSource = readFileSync(new URL("./EvolutionItemInfoDialog.tsx", import.meta.url), "utf8");

test("the dialog shows the required heading text", () => {
  assert.ok(dialogSource.includes("פוקימונים שניתן לפתח"), "the dialog must show this exact Hebrew heading");
});

test("the dialog derives its rows from the canonical evolution registry via getEvolutionItemMappings, never a hardcoded list", () => {
  assert.ok(dialogSource.includes("getEvolutionItemMappings(itemId)"), "rows must come from getEvolutionItemMappings, driven by the real item id");
  assert.ok(!/const mappings = \[/.test(dialogSource), "mappings must never be a literal hardcoded array");
});

test("the dialog has a real, accessible dialog role", () => {
  assert.ok(dialogSource.includes('role="dialog"'));
  assert.ok(dialogSource.includes('aria-modal="true"'));
});

test("the dialog has a clear close button", () => {
  assert.ok(/<button[\s\S]{0,500}?onClick=\{onClose\}[\s\S]{0,500}?סגור/.test(dialogSource), "there must be a button labeled סגור that calls onClose");
});

test("the dialog supports Escape-key closing", () => {
  assert.ok(dialogSource.includes('event.key === "Escape"'), "an Escape keydown must be handled");
  assert.ok(/handleKeyDown[\s\S]{0,60}\{[\s\S]{0,200}onClose\(\)/.test(dialogSource), "the Escape handler must call onClose");
  assert.ok(dialogSource.includes('addEventListener("keydown"'), "Escape detection must be wired via a real keydown listener");
});

test("the dialog is RTL and supports backdrop-click-to-dismiss (safe here since it's read-only, unlike the consequential evolution dialogs)", () => {
  assert.ok(dialogSource.includes('dir="rtl"'));
  assert.ok(/bg-black[\s\S]{0,200}onClick=\{onClose\}/.test(dialogSource), "the outer backdrop div must call onClose on click");
  assert.ok(dialogSource.includes("event.stopPropagation()"), "the inner box must stop the click from reaching the backdrop");
});

test("the dialog performs no purchase or item-use action of any kind", () => {
  assert.ok(!dialogSource.includes("purchaseShopItemAction"), "no purchase action");
  assert.ok(!dialogSource.includes("acceptEvolutionItemAction"), "no evolve/use-item action");
  assert.ok(!dialogSource.includes("sellInventoryItemAction"), "no sell action");
});

test("the dialog shows the product image and Hebrew name", () => {
  assert.ok(dialogSource.includes("itemImageUrl"));
  assert.ok(dialogSource.includes("{itemName}"));
});

test("each row shows source, an arrow, and the evolved target — never collapsed", () => {
  assert.ok(dialogSource.includes("{mapping.sourceName}"));
  assert.ok(dialogSource.includes("{mapping.targetName}"));
  assert.ok(dialogSource.includes("→"), "rows must use an explicit arrow between source and target");
});
