import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveEndOfTurnStatusDamage } from "./resolve-end-of-turn-status.ts";

test("burn/poison deal 1/8 max HP (floored, minimum 1) and never go below 0", () => {
  const burn = resolveEndOfTurnStatusDamage("burn", 100, 80);
  assert.deepEqual(burn, { damage: 10, remainingHp: 90 });

  const poison = resolveEndOfTurnStatusDamage("poison", 5, 80);
  assert.deepEqual(poison, { damage: 10, remainingHp: 0 });
});

test("a status other than burn/poison produces no residual damage", () => {
  assert.equal(resolveEndOfTurnStatusDamage("paralysis", 100, 100), null);
  assert.equal(resolveEndOfTurnStatusDamage(null, 100, 100), null);
});

test("residual damage is never less than 1, even for a very low max HP", () => {
  const result = resolveEndOfTurnStatusDamage("poison", 5, 5);
  assert.equal(result?.damage, 1);
});
