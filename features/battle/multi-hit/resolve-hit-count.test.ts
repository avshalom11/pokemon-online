import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveHitCount } from "./resolve-hit-count";

test("a fixed-hit move (minHits === maxHits) always returns that count and never consumes a roll", () => {
  let rolled = false;
  const random = () => {
    rolled = true;
    return 0.5;
  };
  const hits = resolveHitCount({ minHits: 2, maxHits: 2 }, random);
  assert.equal(hits, 2);
  assert.equal(rolled, false);
});

test("a 2-5 move uses the canonical 3/8, 3/8, 1/8, 1/8 distribution", () => {
  assert.equal(resolveHitCount({ minHits: 2, maxHits: 5 }, () => 0), 2);
  assert.equal(resolveHitCount({ minHits: 2, maxHits: 5 }, () => 0.374), 2);
  assert.equal(resolveHitCount({ minHits: 2, maxHits: 5 }, () => 0.375), 3);
  assert.equal(resolveHitCount({ minHits: 2, maxHits: 5 }, () => 0.749), 3);
  assert.equal(resolveHitCount({ minHits: 2, maxHits: 5 }, () => 0.75), 4);
  assert.equal(resolveHitCount({ minHits: 2, maxHits: 5 }, () => 0.874), 4);
  assert.equal(resolveHitCount({ minHits: 2, maxHits: 5 }, () => 0.875), 5);
  assert.equal(resolveHitCount({ minHits: 2, maxHits: 5 }, () => 0.999), 5);
});

test("is deterministic given the same injected random source", () => {
  const a = resolveHitCount({ minHits: 2, maxHits: 5 }, () => 0.6);
  const b = resolveHitCount({ minHits: 2, maxHits: 5 }, () => 0.6);
  assert.equal(a, b);
});
