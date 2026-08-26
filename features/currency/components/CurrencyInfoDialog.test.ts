// CURRENCY INFO — opened by clicking a header currency pill
// (components/layout/GameHeader.tsx). No React-render/DOM harness exists
// in this project (see e.g. PokedexCard.test.ts's own doc comment) — this
// checks the invariants via a static source read instead of rendering.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const src = readFileSync(new URL("./CurrencyInfoDialog.tsx", import.meta.url), "utf8");

test("one shared component handles both currencies — no separate Money/Gold dialog files", () => {
  assert.ok(src.includes("export function CurrencyInfoDialog({ type, onClose }: CurrencyInfoDialogProps)"));
  assert.ok(src.includes("type: CurrencyType"));
});

test("copy/icon come from the real per-currency sources — never hardcoded inline text or a second icon", () => {
  assert.ok(
    src.includes(
      'import { CURRENCY_INFO_PARAGRAPHS, CURRENCY_INFO_TITLES } from "@/features/currency/messages/currency-info-messages";'
    )
  );
  assert.ok(src.includes('import { CurrencyIcon } from "./CurrencyIcon";'));
  assert.ok(src.includes("CURRENCY_INFO_PARAGRAPHS[type]"));
  assert.ok(src.includes("CURRENCY_INFO_TITLES[type]"));
  assert.ok(src.includes('<CurrencyIcon type={type}'));
});

test("closes via the corner ✕ AND a bottom אישור button — both call the exact same onClose", () => {
  const closeButtonBlock = src.slice(src.indexOf('aria-label="סגור"') - 100, src.indexOf('aria-label="סגור"') + 50);
  assert.ok(closeButtonBlock.includes("onClick={onClose}"), "the ✕ button must call onClose");

  const confirmButtonBlock = src.slice(src.lastIndexOf("<button"));
  assert.ok(confirmButtonBlock.includes("onClick={onClose}"), "the אישור button must call the same onClose");
  assert.ok(confirmButtonBlock.includes("אישור"));
});

test("this dialog never mutates currency state — no server action / fetch of any kind", () => {
  assert.ok(!/Action\(/.test(src));
  assert.ok(!src.includes("fetch("));
});

// CURRENCY INFO — CENTER ON SCREEN.
test("centers via the same fixed inset-0 + flex items-center justify-center pattern every other dialog in this codebase uses", () => {
  assert.ok(src.includes("fixed inset-0 z-[70] flex items-center justify-center"));
});

test("the panel scrolls internally instead of overflowing the viewport when content is taller than the screen", () => {
  assert.ok(src.includes("max-h-[85vh]"));
  assert.ok(src.includes("overflow-y-auto"));
});
