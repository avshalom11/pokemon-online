import assert from "node:assert/strict";
import { test } from "node:test";

import { resolvePreActionConfusion, resolvePreActionFlinch } from "./resolve-pre-action-volatile";

test("flinch prevents the action exactly when the flag is set", () => {
  assert.equal(resolvePreActionFlinch({ flinch: true }), true);
  assert.equal(resolvePreActionFlinch({}), false);
});

test("confusion can allow the selected move to proceed (self-hit roll fails)", () => {
  const result = resolvePreActionConfusion({ confusion: { turnsRemaining: 3 }, selfHitRoll: () => 0.9 });
  assert.equal(result.outcome, "acts-normally");
  assert.deepEqual(result.updatedConfusion, { turnsRemaining: 2 });
});

test("confusion can cause a self-hit, skipping the selected move", () => {
  const result = resolvePreActionConfusion({ confusion: { turnsRemaining: 3 }, selfHitRoll: () => 0.1 });
  assert.equal(result.outcome, "hurts-itself");
  assert.deepEqual(result.updatedConfusion, { turnsRemaining: 2 });
});

test("confusion recovers when its duration reaches 0, without rolling a self-hit", () => {
  let rolled = false;
  const result = resolvePreActionConfusion({
    confusion: { turnsRemaining: 1 },
    selfHitRoll: () => {
      rolled = true;
      return 0;
    },
  });
  assert.equal(result.outcome, "recovered");
  assert.equal(rolled, false);
});
