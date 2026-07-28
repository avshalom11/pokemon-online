import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveDrainHealing, resolveRecoilDamage } from "./resolve-hp-transfer";

test("drain restores half of the ACTUAL hp lost, not the raw calculated damage", () => {
  // Target had 8 HP left; the Damage Engine calculated 30, but the actual
  // loss is clamped to 8 by the caller before this function ever sees it.
  const result = resolveDrainHealing({ actualDamageDealt: 8, drainPercent: 50, currentHp: 50, maxHp: 100 });
  assert.equal(result.healed, 4);
  assert.equal(result.remainingHp, 54);
});

test("drain clamps to max hp and heals 0 when the attacker is already full", () => {
  const result = resolveDrainHealing({ actualDamageDealt: 40, drainPercent: 50, currentHp: 100, maxHp: 100 });
  assert.equal(result.healed, 0);
  assert.equal(result.remainingHp, 100);
});

test("drain restores 0 when the move dealt no actual damage (miss/immune)", () => {
  const result = resolveDrainHealing({ actualDamageDealt: 0, drainPercent: 50, currentHp: 50, maxHp: 100 });
  assert.equal(result.healed, 0);
  assert.equal(result.remainingHp, 50);
});

test("recoil damages the attacker based on actual hp lost by the target", () => {
  const result = resolveRecoilDamage({ actualDamageDealt: 40, recoilPercent: 25, currentHp: 100 });
  assert.equal(result.damage, 10);
  assert.equal(result.remainingHp, 90);
});

test("recoil is clamped to at least 1 when it would otherwise round to 0", () => {
  const result = resolveRecoilDamage({ actualDamageDealt: 1, recoilPercent: 25, currentHp: 100 });
  assert.equal(result.damage, 1);
  assert.equal(result.remainingHp, 99);
});

test("recoil can faint the attacker, and never drops it below 0", () => {
  const result = resolveRecoilDamage({ actualDamageDealt: 40, recoilPercent: 25, currentHp: 5 });
  assert.equal(result.damage, 10);
  assert.equal(result.remainingHp, 0);
});

test("recoil never applies when the move dealt no actual damage", () => {
  const result = resolveRecoilDamage({ actualDamageDealt: 0, recoilPercent: 25, currentHp: 100 });
  assert.equal(result.damage, 0);
  assert.equal(result.remainingHp, 100);
});
