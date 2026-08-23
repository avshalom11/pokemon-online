// CURRENCY ICONS — proves CurrencyIcon renders the real uploaded
// Money/Gold artwork (public/images/currency/) rather than the old
// colored-dot placeholder. A static source read — CurrencyIcon.tsx is a
// plain presentational component with no React Testing Library/jsdom set
// up in this project, same approach as this codebase's other component
// boundary tests (e.g. NavigationGrid.hatchery.test.ts).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const src = fs.readFileSync(new URL("./CurrencyIcon.tsx", import.meta.url), "utf8");

test("money renders /images/currency/money.png", () => {
  assert.ok(src.includes('money: "/images/currency/money.png"'));
});

test("gold renders /images/currency/gold.png", () => {
  assert.ok(src.includes('gold: "/images/currency/gold.png"'));
});

test("no colored-dot placeholder remains — the old backgroundColor/boxShadow rendering is gone", () => {
  assert.ok(!src.includes("backgroundColor"));
  assert.ok(!src.includes("boxShadow"));
  assert.ok(!src.includes("CURRENCY_COLORS"));
});

test("each currency renders through a real <img> with a meaningful alt label", () => {
  assert.ok(src.includes("<img"));
  assert.ok(src.includes("alt={CURRENCY_LABELS[type]}"));
  assert.ok(src.includes('money: "מטבעות כסף"'));
  assert.ok(src.includes('gold: "מטבעות זהב"'));
});

test("the default size is h-[30px] w-[30px]", () => {
  assert.ok(src.includes('className = "h-[30px] w-[30px]"'));
});

test("aspect ratio is preserved via object-contain", () => {
  assert.ok(src.includes("object-contain"));
});

test("each currency gets its own colored glow via a shape-aware drop-shadow filter, not a rectangular box-shadow", () => {
  assert.ok(src.includes("filter: glowFilter(glow)"));
  assert.ok(!src.includes("boxShadow"));
});

test("Money glow is bright silver/white and Gold glow is bright warm gold/yellow", () => {
  assert.ok(src.includes('money: "#f8fafc"'));
  assert.ok(src.includes('gold: "#ffcc33"'));
});

test("the glow is a strong, three-layer drop-shadow stack (core + mid + wide halo) — noticeably more intense than a single soft shadow", () => {
  const occurrences = (src.match(/drop-shadow\(0 0 \d+px \$\{color\}/g) ?? []).length;
  assert.equal(occurrences, 3, "expected three stacked drop-shadow layers inside glowFilter");
});
