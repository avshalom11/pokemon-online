// Field Battle Bag — live capture-chance display. Proves getBallCapturePercent
// (the Bag's only source for the percentage shown beside each Poké Ball) is
// a thin wrapper around the REAL calculateCaptureChance formula
// (engine/battle/capture.ts) and CAPTURE_RATE_TABLE (data/battle/
// capture-rate-config.ts) — never a second, hardcoded, or drifted formula.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getBallCapturePercent, MASTER_BALL_ITEM_ID } from "./ballCaptureDisplay.ts";
import { calculateCaptureChance } from "@/engine/battle/capture";
import { CAPTURE_RATE_TABLE, type CaptureBallId } from "@/data/battle/capture-rate-config";

const ROLLABLE_BALLS: CaptureBallId[] = ["poke-ball", "great-ball", "ultra-ball"];

// 1. Every owned ball produces a displayable percentage.
test("every real capture ball (including Master Ball) resolves to a non-null percent", () => {
  const params = { currentHp: 50, maxHp: 100, rarity: "common" as const };
  for (const ballId of ROLLABLE_BALLS) {
    assert.notEqual(getBallCapturePercent(ballId, params), null);
  }
  assert.equal(getBallCapturePercent(MASTER_BALL_ITEM_ID, params), 100);
});

test("a non-ball item (e.g. a Medicine itemId) never gets a fabricated percent", () => {
  assert.equal(getBallCapturePercent("potion", { currentHp: 50, maxHp: 100, rarity: "common" }), null);
});

// 2 & 5. The displayed number is always derived from calculateCaptureChance
// — the exact same function/inputs a real capture attempt (capture.service.ts's
// rollCapture call) uses — never a second formula, and never able to
// disagree with what throwing that ball right now would actually roll
// against.
test("the displayed percent is exactly Math.round(calculateCaptureChance(...) * 100) for every rollable ball", () => {
  const params = { currentHp: 37, maxHp: 120, rarity: "very-rare" as const };
  for (const ballId of ROLLABLE_BALLS) {
    const expected = Math.round(calculateCaptureChance(params, ballId) * 100);
    assert.equal(getBallCapturePercent(ballId, params), expected);
  }
});

test("every table entry round-trips through getBallCapturePercent unchanged (full coverage, not just one sample)", () => {
  const rarities = Object.keys(CAPTURE_RATE_TABLE) as (keyof typeof CAPTURE_RATE_TABLE)[];
  for (const rarity of rarities) {
    for (const bracket of Object.keys(CAPTURE_RATE_TABLE[rarity]) as (keyof (typeof CAPTURE_RATE_TABLE)[typeof rarity])[]) {
      for (const ballId of ROLLABLE_BALLS) {
        const rawChance = CAPTURE_RATE_TABLE[rarity][bracket][ballId];
        // Pick an HP pair that lands in this exact bracket.
        const hpByBracket: Record<string, [number, number]> = {
          "100-75": [90, 100],
          "75-50": [60, 100],
          "50-25": [30, 100],
          "25-10": [15, 100],
          "10-0": [5, 100],
        };
        const [currentHp, maxHp] = hpByBracket[bracket as string];
        const percent = getBallCapturePercent(ballId, { currentHp, maxHp, rarity });
        assert.equal(percent, Math.round(rawChance * 100));
      }
    }
  }
});

// 3. Lower wild HP must never produce a lower (or equal, where the table
// itself strictly increases) displayed chance than higher HP, for a fixed
// ball/rarity — mirrors CAPTURE_RATE_TABLE's own monotonic-by-bracket shape.
test("lower current HP never decreases the displayed percent, for a fixed ball and rarity", () => {
  const brackets: Array<{ currentHp: number; maxHp: number }> = [
    { currentHp: 100, maxHp: 100 }, // 100-75
    { currentHp: 60, maxHp: 100 }, // 75-50
    { currentHp: 40, maxHp: 100 }, // 50-25
    { currentHp: 15, maxHp: 100 }, // 25-10
    { currentHp: 5, maxHp: 100 }, // 10-0
  ];

  for (const rarity of Object.keys(CAPTURE_RATE_TABLE) as (keyof typeof CAPTURE_RATE_TABLE)[]) {
    for (const ballId of ROLLABLE_BALLS) {
      let previous = -Infinity;
      for (const { currentHp, maxHp } of brackets) {
        const percent = getBallCapturePercent(ballId, { currentHp, maxHp, rarity })!;
        assert.ok(percent >= previous, `expected ${rarity}/${ballId} percent to not decrease as HP drops`);
        previous = percent;
      }
    }
  }
});

// 4. Different balls against the identical wild state must produce
// different (never-lower for a stronger ball) percentages — proves the
// ball's own modifier is actually read, not a constant.
test("Great Ball and Ultra Ball never show a lower percent than Poké Ball for the same wild state", () => {
  const params = { currentHp: 80, maxHp: 100, rarity: "rare" as const };
  const pokeBall = getBallCapturePercent("poke-ball", params)!;
  const greatBall = getBallCapturePercent("great-ball", params)!;
  const ultraBall = getBallCapturePercent("ultra-ball", params)!;

  assert.ok(greatBall >= pokeBall);
  assert.ok(ultraBall >= greatBall);
  // For this specific rarity/bracket the table's real numbers are strictly
  // increasing (0.2 / 0.4 / 0.6) — pin that so a future table edit that
  // accidentally flattens the balls apart is caught here too.
  assert.equal(pokeBall, 20);
  assert.equal(greatBall, 40);
  assert.equal(ultraBall, 60);
});

// 6. Regression guard: this display feature must never have touched actual
// capture mechanics. Pin a few known CAPTURE_RATE_TABLE values and confirm
// calculateCaptureChance (the function rollCapture itself calls) still
// returns the exact same raw probability this file reuses for display.
test("capture mechanics are untouched — calculateCaptureChance still returns the real, unrounded probability", () => {
  assert.equal(calculateCaptureChance({ currentHp: 100, maxHp: 100, rarity: "legendary" }, "poke-ball"), 0.01);
  assert.equal(calculateCaptureChance({ currentHp: 5, maxHp: 100, rarity: "legendary" }, "ultra-ball"), 0.14);
  assert.equal(calculateCaptureChance({ currentHp: 100, maxHp: 100, rarity: "common" }, "poke-ball"), 0.3);
});
