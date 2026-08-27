// LEGENDARY CAPTURE CHANCES — focused coverage for the new smooth
// interpolation curve legendary alone uses, plus a regression pin proving
// every other rarity's existing bracket-based formula is byte-for-byte
// unchanged.
import assert from "node:assert/strict";
import { test } from "node:test";

import { calculateCaptureChance, getHpBracket } from "./capture.ts";
import { CAPTURE_RATE_TABLE, LEGENDARY_CAPTURE_RATE_CURVE, type CaptureBallId } from "@/data/battle/capture-rate-config";

const BALLS: CaptureBallId[] = ["poke-ball", "great-ball", "ultra-ball"];

// 1. The exact anchor values (task's own table) are returned verbatim at
// each of the five HP anchor points, for all three balls.
test("legendary: exact anchor values at 100/75/50/25/0% HP match the task's own table", () => {
  const anchors: [number, Record<CaptureBallId, number>][] = [
    [100, { "poke-ball": 0.002, "great-ball": 0.005, "ultra-ball": 0.01 }],
    [75, { "poke-ball": 0.004, "great-ball": 0.01, "ultra-ball": 0.02 }],
    [50, { "poke-ball": 0.008, "great-ball": 0.02, "ultra-ball": 0.03 }],
    [25, { "poke-ball": 0.012, "great-ball": 0.035, "ultra-ball": 0.05 }],
    [0, { "poke-ball": 0.02, "great-ball": 0.05, "ultra-ball": 0.07 }],
  ];

  for (const [hpPercent, expected] of anchors) {
    for (const ballId of BALLS) {
      const chance = calculateCaptureChance({ currentHp: hpPercent, maxHp: 100, rarity: "legendary" }, ballId);
      assert.equal(chance, expected[ballId], `hp=${hpPercent}% ball=${ballId}`);
    }
  }
});

// 2. Smooth (linear) interpolation strictly between two anchors — the
// halfway point between two anchors must be the exact numeric average of
// their table values, not either endpoint and not a bracket snap.
test("legendary: the midpoint between two anchors is the exact average of their values (true interpolation, not a bracket snap)", () => {
  // Halfway between 100% and 75% -> 87.5% HP.
  const at875 = calculateCaptureChance({ currentHp: 87.5, maxHp: 100, rarity: "legendary" }, "great-ball");
  assert.equal(at875, (0.005 + 0.01) / 2);

  // Halfway between 50% and 25% -> 37.5% HP.
  const at375 = calculateCaptureChance({ currentHp: 37.5, maxHp: 100, rarity: "legendary" }, "ultra-ball");
  assert.equal(at375, (0.03 + 0.05) / 2);

  // Halfway between 25% and 0% -> 12.5% HP.
  const at125 = calculateCaptureChance({ currentHp: 12.5, maxHp: 100, rarity: "legendary" }, "poke-ball");
  assert.equal(at125, (0.012 + 0.02) / 2);
});

// 3. No discontinuity at a shared boundary — approaching 75% HP from either
// side must converge on exactly the 75% anchor's own value.
test("legendary: values are continuous across every anchor boundary (no jump)", () => {
  for (const boundary of [75, 50, 25]) {
    for (const ballId of BALLS) {
      const exact = calculateCaptureChance({ currentHp: boundary, maxHp: 100, rarity: "legendary" }, ballId);
      const justAbove = calculateCaptureChance({ currentHp: boundary + 0.001, maxHp: 100, rarity: "legendary" }, ballId);
      const justBelow = calculateCaptureChance({ currentHp: boundary - 0.001, maxHp: 100, rarity: "legendary" }, ballId);
      assert.ok(Math.abs(justAbove - exact) < 0.0001, `discontinuity above ${boundary}% for ${ballId}`);
      assert.ok(Math.abs(justBelow - exact) < 0.0001, `discontinuity below ${boundary}% for ${ballId}`);
    }
  }
});

// 4. Monotonic — dropping wild HP must never decrease the legendary chance,
// for a fixed ball, matching the table's own strictly-increasing shape.
test("legendary: capture chance never decreases as HP drops, for every ball", () => {
  const hpSamples = [100, 90, 80, 75, 60, 50, 40, 25, 10, 1, 0];
  for (const ballId of BALLS) {
    let previous = -Infinity;
    for (const hp of hpSamples) {
      const chance = calculateCaptureChance({ currentHp: hp, maxHp: 100, rarity: "legendary" }, ballId);
      assert.ok(chance >= previous, `expected legendary/${ballId} chance to not decrease as HP drops to ${hp}%`);
      previous = chance;
    }
  }
});

// 5. Master Ball is entirely untouched by this table — it's never rolled
// against LEGENDARY_CAPTURE_RATE_CURVE at all (capture.service.ts's own
// guaranteed-capture branch bypasses this module completely), so there is
// nothing in this file that could affect it either way. Documented here
// only as an explicit "not applicable" marker, not a real behavior check.

// 6. REGRESSION — every non-legendary rarity's bracket-based formula is
// completely unchanged: calculateCaptureChance for common/rare/very-rare
// still equals a direct CAPTURE_RATE_TABLE lookup, for every bracket and
// ball, exactly like before this task.
test("regression: every non-legendary rarity's capture chance is still a direct, unmodified CAPTURE_RATE_TABLE lookup", () => {
  const hpByBracket: Record<string, [number, number]> = {
    "100-75": [90, 100],
    "75-50": [60, 100],
    "50-25": [30, 100],
    "25-10": [15, 100],
    "10-0": [5, 100],
  };

  for (const rarity of Object.keys(CAPTURE_RATE_TABLE) as (keyof typeof CAPTURE_RATE_TABLE)[]) {
    for (const bracket of Object.keys(CAPTURE_RATE_TABLE[rarity]) as (keyof (typeof CAPTURE_RATE_TABLE)[typeof rarity])[]) {
      const [currentHp, maxHp] = hpByBracket[bracket as string];
      assert.equal(getHpBracket(currentHp, maxHp), bracket, "sanity: HP sample must land in the bracket it claims to");
      for (const ballId of BALLS) {
        const expected = CAPTURE_RATE_TABLE[rarity][bracket][ballId];
        const actual = calculateCaptureChance({ currentHp, maxHp, rarity }, ballId);
        assert.equal(actual, expected, `${rarity}/${bracket}/${ballId}`);
      }
    }
  }
});

// 7. REGRESSION — the exact previous legendary bracket values are GONE
// (proves the old discrete-bracket behavior was actually replaced, not
// left dormant alongside the new curve).
test("regression: legendary no longer uses the old discrete-bracket table shape", () => {
  assert.equal("legendary" in CAPTURE_RATE_TABLE, false, "legendary must no longer be a key of the bracket-based CAPTURE_RATE_TABLE");
  assert.deepEqual(Object.keys(LEGENDARY_CAPTURE_RATE_CURVE).map(Number).sort((a, b) => a - b), [0, 25, 50, 75, 100]);
});
