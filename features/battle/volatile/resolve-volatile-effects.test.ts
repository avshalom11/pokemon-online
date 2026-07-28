import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveProtectAttempt, resolveVolatileEffects } from "./resolve-volatile-effects";

const BASE_INPUT = {
  actor: "player" as const,
  effectTargetActor: "enemy" as const,
  hit: true,
  immuneToTarget: false,
  effectTargetFainted: false,
  effectTargetTypes: [] as const,
  effectChanceRoll: () => 0,
  confusionDurationRoll: () => 0,
  disableDurationRoll: () => 0,
  encoreDurationRoll: () => 0,
  trappingDurationRoll: () => 0,
};

test("a status move applies confusion and rolls its duration", () => {
  const result = resolveVolatileEffects({
    ...BASE_INPUT,
    effect: { kind: "status", status: "confusion" },
    effectTargetVolatile: {},
  });

  assert.ok(result.updatedTargetVolatile.confusion);
  assert.equal(result.events[0]?.type, "volatile-applied");
});

test("leech seed fails against a Grass-type target (Gen 1+ immunity)", () => {
  const result = resolveVolatileEffects({
    ...BASE_INPUT,
    effect: { kind: "leech-seed" },
    effectTargetVolatile: {},
    effectTargetTypes: ["grass"],
  });

  assert.equal(result.updatedTargetVolatile.leechSeed, undefined);
  assert.deepEqual(result.events[0], { type: "volatile-application-failed", actor: "enemy", condition: "leech-seed", reason: "immune" });
});

test("disable fails without a valid previously used move", () => {
  const result = resolveVolatileEffects({
    ...BASE_INPUT,
    effect: { kind: "disable-move" },
    effectTargetVolatile: {},
  });

  assert.equal(result.updatedTargetVolatile.disable, undefined);
  assert.deepEqual(result.events[0], { type: "volatile-application-failed", actor: "enemy", condition: "disable", reason: "no-valid-move" });
});

test("disabling a move that is the target's current Encore clears the Encore (no impossible state)", () => {
  const result = resolveVolatileEffects({
    ...BASE_INPUT,
    effect: { kind: "disable-move" },
    effectTargetVolatile: { lastUsedMoveId: "tackle", encore: { moveId: "tackle", turnsRemaining: 3 } },
  });

  assert.equal(result.updatedTargetVolatile.disable?.moveId, "tackle");
  assert.equal(result.updatedTargetVolatile.encore, undefined);
});

test("Protect succeeds with certainty on a fresh streak, and its declining chance is deterministic thereafter", () => {
  const first = resolveProtectAttempt("player", {}, () => 0.99);
  assert.equal(first.success, true);
  assert.equal(first.updatedVolatile.protect?.consecutiveUses, 1);

  // consecutiveUses=1 -> chance is 1/3; a roll of 0.5 fails.
  const second = resolveProtectAttempt("player", first.updatedVolatile, () => 0.5);
  assert.equal(second.success, false);
  assert.equal(second.updatedVolatile.protect, undefined);
});
