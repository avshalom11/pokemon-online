// CURRENCY INFO DIALOG — exact approved copy, verbatim, no reward
// amounts/chances anywhere in it.
import assert from "node:assert/strict";
import { test } from "node:test";

import { CURRENCY_INFO_PARAGRAPHS, CURRENCY_INFO_TITLES } from "./currency-info-messages.ts";

test("money title is exactly 'כסף'", () => {
  assert.equal(CURRENCY_INFO_TITLES.money, "כסף");
});

test("gold title is exactly 'זהב'", () => {
  assert.equal(CURRENCY_INFO_TITLES.gold, "זהב");
});

test("money copy matches the approved text exactly", () => {
  assert.deepEqual(CURRENCY_INFO_PARAGRAPHS.money, [
    "כסף משמש לקניות, מעבר בין מחוזות ושירותים שונים במשחק.",
    "אפשר להשיג כסף בעיקר מקרבות שדה.\nבנוסף ניתן להשיג כסף מתיבות, מקרבות מכונים, מליגות ומעליית רמת המשתמש.",
  ]);
});

test("gold copy matches the approved text exactly", () => {
  assert.deepEqual(CURRENCY_INFO_PARAGRAPHS.gold, [
    "זהב הוא מטבע יקר יותר שמשמש לרכישות מיוחדות במשחק.",
    "אפשר להשיג זהב מקרבות שדה, מתיבות, ממכונים, מליגות ומעליית רמת המשתמש.",
  ]);
});

test("no paragraph ever mentions a specific number (reward amount/chance) — this is a plain explainer, never a rewards reference", () => {
  for (const paragraphs of [CURRENCY_INFO_PARAGRAPHS.money, CURRENCY_INFO_PARAGRAPHS.gold]) {
    for (const paragraph of paragraphs) {
      assert.ok(!/\d/.test(paragraph), `paragraph must contain no digits: "${paragraph}"`);
    }
  }
});
