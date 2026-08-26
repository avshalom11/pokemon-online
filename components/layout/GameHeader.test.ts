// CURRENCY INFO — clicking the Money/Gold header pills opens
// CurrencyInfoDialog. No React-render/DOM harness exists in this project
// (see e.g. PokedexCard.test.ts's own doc comment) — this checks the
// wiring via a static source read instead of rendering.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const src = readFileSync(new URL("./GameHeader.tsx", import.meta.url), "utf8");

test("clicking the Money pill opens the Money currency info dialog", () => {
  const moneyPillBlock = src.slice(src.indexOf('type="money"') - 60, src.indexOf('type="money"') + 220);
  assert.ok(moneyPillBlock.includes('onClick={() => setOpenCurrencyInfo("money")}'));
});

test("clicking the Gold pill opens the Gold currency info dialog", () => {
  const goldPillBlock = src.slice(src.indexOf('type="gold"') - 60, src.indexOf('type="gold"') + 220);
  assert.ok(goldPillBlock.includes('onClick={() => setOpenCurrencyInfo("gold")}'));
});

test("the daily-battle-count pill stays a plain, non-clickable pill — no onClick added", () => {
  const battleCountBlock = src.slice(src.indexOf("קרבות היום:") - 100, src.indexOf("קרבות היום:") + 100);
  assert.ok(!battleCountBlock.includes("onClick"));
});

test("only one currency dialog can be open at a time, via a single-slot state", () => {
  assert.ok(src.includes("useState<CurrencyType | null>(null)"));
});

test("ResourcePill renders a real <button> only when onClick is given — the non-clickable pill stays a <div>", () => {
  assert.ok(src.includes("if (onClick) {"));
  assert.ok(src.includes("<button type=\"button\" title={title} onClick={onClick}"));
  assert.ok(src.includes('<div title={title} className={className}>'));
});

// CURRENCY INFO — CENTER ON SCREEN. <header> carries backdrop-blur-md (a
// backdrop-filter), which establishes a new containing block for any
// `position: fixed` descendant — left un-portaled, the dialog's own fixed
// centering would resolve against this header's small box instead of the
// viewport. Rendering through a portal into document.body is the fix.
test("the currency info dialog is portaled to document.body — never rendered in place inside this header", () => {
  assert.ok(src.includes('import { createPortal } from "react-dom";'));
  assert.match(
    src,
    /openCurrencyInfo\s*\?\s*createPortal\(\s*<CurrencyInfoDialog type=\{openCurrencyInfo\} onClose=\{\(\) => setOpenCurrencyInfo\(null\)\} \/>,\s*document\.body\s*\)\s*: null/
  );
});
