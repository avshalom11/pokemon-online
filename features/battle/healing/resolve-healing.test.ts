import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveHealing } from "./resolve-healing";

test("restores a percentage of MAXIMUM hp, not current hp", () => {
  const result = resolveHealing({ currentHp: 10, maxHp: 100, healPercent: 50 });
  assert.equal(result.healed, 50);
  assert.equal(result.remainingHp, 60);
  assert.equal(result.success, true);
});

test("clamps healing so current hp never exceeds max hp", () => {
  const result = resolveHealing({ currentHp: 90, maxHp: 100, healPercent: 50 });
  assert.equal(result.healed, 10);
  assert.equal(result.remainingHp, 100);
  assert.equal(result.success, true);
});

test("at full hp, heals 0 and reports failure rather than inventing a change", () => {
  const result = resolveHealing({ currentHp: 100, maxHp: 100, healPercent: 100 });
  assert.equal(result.healed, 0);
  assert.equal(result.remainingHp, 100);
  assert.equal(result.success, false);
});
