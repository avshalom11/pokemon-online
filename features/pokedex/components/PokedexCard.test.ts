// Regression guard for the "unseen Pokémon are hidden" rule: PokedexCard is
// a "use client" component with no React Testing Library/jsdom set up in
// this project (same limitation BattleContent.rarity-display.test.ts's own
// doc comment already notes), so this checks the same invariant via a
// static source read instead of rendering.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const cardSource = readFileSync(new URL("./PokedexCard.tsx", import.meta.url), "utf8");

test("an unseen entry's real name is never rendered unconditionally — it always falls back to a placeholder", () => {
  assert.ok(
    cardSource.includes('isUnseen ? "???" : species.name'),
    "the displayed name must be gated behind isUnseen, never species.name on its own"
  );
});

test("an unseen entry's types are never rendered at all", () => {
  assert.ok(
    /!isUnseen\s*\?[\s\S]{0,80}species\.types\.map/.test(cardSource),
    "types must only render inside a !isUnseen branch"
  );
});

test("an unseen card is never clickable — there is nothing to open a detail panel for", () => {
  assert.ok(/onClick=\{isUnseen \? undefined : onSelect\}/.test(cardSource), "onClick must be disabled for an unseen entry");
  assert.ok(/disabled=\{isUnseen\}/.test(cardSource), "the button itself must be disabled for an unseen entry");
});
