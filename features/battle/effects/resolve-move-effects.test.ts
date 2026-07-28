import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveMoveEffects, type ResolveMoveEffectsInput } from "./resolve-move-effects.ts";

const BASE_INPUT: Omit<ResolveMoveEffectsInput, "effect" | "effectTargetActor"> = {
  hit: true,
  immuneToTarget: false,
  effectTargetFainted: false,
  effectTargetStages: {},
  effectTargetCurrentStatus: null,
  effectTargetTypes: ["water"],
  effectChanceRoll: () => 0,
  sleepDurationRoll: () => 0,
};

test("a guaranteed stat-change effect (e.g. Growl) lowers the target's stage and emits stat-stage-changed", () => {
  const result = resolveMoveEffects({
    ...BASE_INPUT,
    effect: { kind: "stat-change", changes: [{ stat: "attack", stages: -1 }] },
    effectTargetActor: "enemy",
  });

  assert.deepEqual(result.updatedStages, { attack: -1 });
  assert.deepEqual(result.events, [{ type: "stat-stage-changed", actor: "enemy", stat: "attack", previousStage: 0, newStage: -1 }]);
});

test("a chance-gated secondary status (e.g. Ember's burn chance) applies when the roll succeeds", () => {
  const result = resolveMoveEffects({
    ...BASE_INPUT,
    effect: { kind: "damage-with-status-chance", status: "burn", chancePercent: 10 },
    effectTargetActor: "enemy",
    effectChanceRoll: () => 0.05, // 5% < 10% -> succeeds
  });

  assert.deepEqual(result.appliedStatus, { status: "burn", turnsRemaining: null });
  assert.deepEqual(result.events, [{ type: "status-applied", actor: "enemy", status: "burn" }]);
});

test("a chance-gated secondary status does not apply when the roll fails", () => {
  const result = resolveMoveEffects({
    ...BASE_INPUT,
    effect: { kind: "damage-with-status-chance", status: "burn", chancePercent: 10 },
    effectTargetActor: "enemy",
    effectChanceRoll: () => 0.5, // 50% >= 10% -> fails
  });

  assert.equal(result.appliedStatus, null);
  assert.deepEqual(result.events, []);
});

test("a missed move applies no effect at all", () => {
  const result = resolveMoveEffects({
    ...BASE_INPUT,
    hit: false,
    effect: { kind: "status", status: "paralysis" },
    effectTargetActor: "enemy",
  });

  assert.equal(result.appliedStatus, null);
  assert.deepEqual(result.events, []);
});

test("a fainted target never receives a secondary opponent effect", () => {
  const result = resolveMoveEffects({
    ...BASE_INPUT,
    effectTargetFainted: true,
    effect: { kind: "damage-with-status-chance", status: "paralysis", chancePercent: 100 },
    effectTargetActor: "enemy",
  });

  assert.equal(result.appliedStatus, null);
  assert.deepEqual(result.events, []);
});

test("an immune hit never applies an opponent-targeted secondary effect", () => {
  const result = resolveMoveEffects({
    ...BASE_INPUT,
    immuneToTarget: true,
    effect: { kind: "damage-with-status-chance", status: "paralysis", chancePercent: 100 },
    effectTargetActor: "enemy",
  });

  assert.equal(result.appliedStatus, null);
  assert.deepEqual(result.events, []);
});

test("an already-statused target rejects a new status and reports status-application-failed", () => {
  const result = resolveMoveEffects({
    ...BASE_INPUT,
    effectTargetCurrentStatus: "poison",
    effect: { kind: "status", status: "paralysis" },
    effectTargetActor: "enemy",
  });

  assert.equal(result.appliedStatus, null);
  assert.deepEqual(result.events, [
    { type: "status-application-failed", actor: "enemy", status: "paralysis", reason: "already-statused" },
  ]);
});

test("a stat-change effect that's already at the +6/-6 cap reports stat-stage-limit instead of pretending it changed", () => {
  const result = resolveMoveEffects({
    ...BASE_INPUT,
    effectTargetStages: { attack: 6 },
    effect: { kind: "stat-change", changes: [{ stat: "attack", stages: 2 }] },
    effectTargetActor: "player",
  });

  assert.deepEqual(result.events, [{ type: "stat-stage-limit", actor: "player", stat: "attack", direction: "higher" }]);
  assert.deepEqual(result.updatedStages, { attack: 6 });
});

test("an out-of-scope effect kind (e.g. heal) is a silent no-op, never an error", () => {
  const result = resolveMoveEffects({
    ...BASE_INPUT,
    effect: { kind: "heal", healPercent: 50 },
    effectTargetActor: "player",
  });

  assert.deepEqual(result.events, []);
  assert.equal(result.appliedStatus, null);
});
