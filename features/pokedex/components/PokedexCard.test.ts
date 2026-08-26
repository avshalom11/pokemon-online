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

// POKÉDEX — LOCATION HINTS FOR UNSEEN POKÉMON. An unseen card is now
// clickable (it opens the strictly limited PokedexUnseenPanel instead of
// the full detail panel — see PokedexContent's own status branch), but
// this card component itself must never gain a disabled/enabled split of
// its own — onClick is unconditional here.
test("a card is always clickable, regardless of status — unseen no longer disables it", () => {
  assert.ok(cardSource.includes("onClick={onSelect}"), "onClick must always be onSelect, never conditionally undefined");
  assert.ok(!cardSource.includes("disabled={isUnseen}"), "the button must never be disabled for an unseen entry anymore");
  assert.ok(!cardSource.includes("disabled"), "no disabled attribute of any kind should remain on this button");
});

test("an unseen card's sprite/name are still exactly as hidden as before — this task never loosens that", () => {
  assert.ok(cardSource.includes('isUnseen ? "opacity-80 brightness-0"'), "the silhouette treatment must be unchanged");
  assert.ok(cardSource.includes('alt={isUnseen ? "פוקימון שטרם התגלה" : species.name}'));
});
