import assert from "node:assert/strict";
import { test } from "node:test";

import { canActThisTurn, resolvePreActionStatus, rollSleepDuration } from "./resolve-pre-action-status.ts";

test("a healthy (unstatused) actor can always act, drawing no rolls", () => {
  const result = resolvePreActionStatus({
    status: null,
    sleepTurnsRemaining: null,
    fullParalysisRoll: () => {
      throw new Error("must not be called");
    },
    freezeThawRoll: () => {
      throw new Error("must not be called");
    },
  });
  assert.equal(result.outcome, "can-act");
  assert.equal(canActThisTurn(result.outcome), true);
});

test("paralysis can fully prevent the action", () => {
  const prevented = resolvePreActionStatus({
    status: "paralysis",
    sleepTurnsRemaining: null,
    fullParalysisRoll: () => 0, // < 0.25 -> fully paralyzed
    freezeThawRoll: () => 1,
  });
  assert.equal(prevented.outcome, "fully-paralyzed");
  assert.equal(canActThisTurn(prevented.outcome), false);
  assert.equal(prevented.status, "paralysis", "paralysis never clears on its own");

  const allowed = resolvePreActionStatus({
    status: "paralysis",
    sleepTurnsRemaining: null,
    fullParalysisRoll: () => 0.99,
    freezeThawRoll: () => 1,
  });
  assert.equal(allowed.outcome, "can-act");
});

test("sleep prevents acting and eventually expires", () => {
  const stillAsleep = resolvePreActionStatus({
    status: "sleep",
    sleepTurnsRemaining: 2,
    fullParalysisRoll: () => 1,
    freezeThawRoll: () => 1,
  });
  assert.equal(stillAsleep.outcome, "asleep");
  assert.equal(stillAsleep.sleepTurnsRemaining, 1);
  assert.equal(canActThisTurn(stillAsleep.outcome), false);

  const wakesUp = resolvePreActionStatus({
    status: "sleep",
    sleepTurnsRemaining: 1,
    fullParalysisRoll: () => 1,
    freezeThawRoll: () => 1,
  });
  assert.equal(wakesUp.outcome, "woke-up");
  assert.equal(wakesUp.status, null);
  // Waking up still consumes this turn's action, per this module's own
  // documented rule.
  assert.equal(canActThisTurn(wakesUp.outcome), false);
});

test("freeze can prevent acting and can thaw (allowing the move that same turn)", () => {
  const frozen = resolvePreActionStatus({
    status: "freeze",
    sleepTurnsRemaining: null,
    fullParalysisRoll: () => 1,
    freezeThawRoll: () => 0.99, // >= 0.2 -> stays frozen
  });
  assert.equal(frozen.outcome, "frozen");
  assert.equal(canActThisTurn(frozen.outcome), false);

  const thawed = resolvePreActionStatus({
    status: "freeze",
    sleepTurnsRemaining: null,
    fullParalysisRoll: () => 1,
    freezeThawRoll: () => 0, // < 0.2 -> thaws
  });
  assert.equal(thawed.outcome, "thawed");
  assert.equal(thawed.status, null);
  assert.equal(canActThisTurn(thawed.outcome), true);
});

test("rollSleepDuration stays within [1, 3]", () => {
  for (let i = 0; i < 100; i++) {
    const duration = rollSleepDuration(() => i / 100);
    assert.ok(duration >= 1 && duration <= 3);
  }
});
