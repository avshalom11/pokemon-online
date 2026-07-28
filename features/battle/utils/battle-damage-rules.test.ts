import assert from "node:assert/strict";
import { test } from "node:test";

import { DamageValidationError } from "@/engine/damage";
import type { Move } from "@/engine/moves";
import type { PokemonBaseStats } from "@/shared/types/pokemon";
import { resolveAttackDamage } from "./battle-damage-rules.ts";

// Pure unit tests for the Phase 5B.2 glue between the centralized stat
// system and the Phase 5B.1 Damage Engine (Phase 5C added STAB, Phase 5D
// added Type Effectiveness) — no DB, no Move Registry, no fake-Prisma
// harness. Fixture moves stand in for real registry data so these tests
// are independent of the real move catalog's exact numbers (see
// battle-action.service.persistence.test.ts for end-to-end coverage
// against real registry moves/species).
//
// Every battler below is given `types: []` unless the test is specifically
// about STAB or Type Effectiveness — an empty type list can never match a
// move's type (no STAB) and reduces to a neutral 1x multiplier (no
// effectiveness change), so these results are identical to
// pre-Phase-5C/5D behavior.

function fixtureMove(overrides: Partial<Move>): Move {
  return {
    id: "test-move",
    name: "Test Move",
    generation: 1,
    introducedGeneration: 1,
    description: "A fixture move for pure damage-rules tests.",
    type: "normal",
    category: "physical",
    power: 40,
    accuracy: 100,
    maxPp: 20,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage" },
    flags: [],
    implementationStatus: "implemented",
    ...overrides,
  };
}

const PHYSICAL_MOVE = fixtureMove({ id: "physical-move", category: "physical", power: 40 });
const SPECIAL_MOVE = fixtureMove({ id: "special-move", category: "special", power: 40 });
const STATUS_MOVE = fixtureMove({ id: "status-move", category: "status", power: null, effect: { kind: "stat-change", changes: [] } });
const FIRE_MOVE = fixtureMove({ id: "fire-move", type: "fire", category: "special", power: 40 });
const WATER_MOVE = fixtureMove({ id: "water-move", type: "water", category: "special", power: 40 });
const ELECTRIC_MOVE = fixtureMove({ id: "electric-move", type: "electric", category: "special", power: 40 });

const BASE_STATS: PokemonBaseStats = {
  health: 50,
  attack: 50,
  defense: 50,
  specialAttack: 50,
  specialDefense: 50,
  speed: 50,
};

test("a physical move's damage increases when the attacker's base Attack increases", () => {
  const defender = { baseStats: BASE_STATS, level: 50, types: [] };
  const weak = resolveAttackDamage(PHYSICAL_MOVE, { baseStats: { ...BASE_STATS, attack: 40 }, level: 50, types: [] }, defender, 1.0);
  const strong = resolveAttackDamage(PHYSICAL_MOVE, { baseStats: { ...BASE_STATS, attack: 100 }, level: 50, types: [] }, defender, 1.0);

  assert.ok(weak.kind === "damage" && strong.kind === "damage");
  assert.ok(strong.damage > weak.damage);
});

test("a physical move's damage decreases when the defender's base Defense increases", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] };
  const softDefense = resolveAttackDamage(PHYSICAL_MOVE, attacker, { baseStats: { ...BASE_STATS, defense: 40 }, level: 50, types: [] }, 1.0);
  const hardDefense = resolveAttackDamage(PHYSICAL_MOVE, attacker, { baseStats: { ...BASE_STATS, defense: 120 }, level: 50, types: [] }, 1.0);

  assert.ok(softDefense.kind === "damage" && hardDefense.kind === "damage");
  assert.ok(hardDefense.damage < softDefense.damage);
});

test("a special move's damage increases when the attacker's base Special Attack increases", () => {
  const defender = { baseStats: BASE_STATS, level: 50, types: [] };
  const weak = resolveAttackDamage(SPECIAL_MOVE, { baseStats: { ...BASE_STATS, specialAttack: 40 }, level: 50, types: [] }, defender, 1.0);
  const strong = resolveAttackDamage(SPECIAL_MOVE, { baseStats: { ...BASE_STATS, specialAttack: 100 }, level: 50, types: [] }, defender, 1.0);

  assert.ok(weak.kind === "damage" && strong.kind === "damage");
  assert.ok(strong.damage > weak.damage);
});

test("a special move's damage decreases when the defender's base Special Defense increases", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] };
  const softDefense = resolveAttackDamage(SPECIAL_MOVE, attacker, { baseStats: { ...BASE_STATS, specialDefense: 40 }, level: 50, types: [] }, 1.0);
  const hardDefense = resolveAttackDamage(SPECIAL_MOVE, attacker, { baseStats: { ...BASE_STATS, specialDefense: 120 }, level: 50, types: [] }, 1.0);

  assert.ok(softDefense.kind === "damage" && hardDefense.kind === "damage");
  assert.ok(hardDefense.damage < softDefense.damage);
});

test("a status move always resolves to the Damage Engine's non-damaging result, regardless of stats", () => {
  const battler = { baseStats: BASE_STATS, level: 50, types: [] };
  const result = resolveAttackDamage(STATUS_MOVE, battler, battler, 1.0);

  assert.deepEqual(result, { kind: "non-damaging", damage: 0, reason: "status-move" });
});

test("a physical and a special move with identical power produce different damage against asymmetric stats", () => {
  const attacker = { baseStats: { ...BASE_STATS, attack: 80, specialAttack: 50 }, level: 50, types: [] };
  const defender = { baseStats: { ...BASE_STATS, defense: 50, specialDefense: 90 }, level: 50, types: [] };

  const physical = resolveAttackDamage(PHYSICAL_MOVE, attacker, defender, 1.0);
  const special = resolveAttackDamage(SPECIAL_MOVE, attacker, defender, 1.0);

  assert.ok(physical.kind === "damage" && special.kind === "damage");
  assert.notEqual(physical.damage, special.damage);
});

test("the same attacker/defender/move/randomFactor always resolves to the same damage (deterministic)", () => {
  const attacker = { baseStats: BASE_STATS, level: 42, types: [] };
  const defender = { baseStats: BASE_STATS, level: 37, types: [] };

  const first = resolveAttackDamage(PHYSICAL_MOVE, attacker, defender, 0.93);
  const second = resolveAttackDamage(PHYSICAL_MOVE, attacker, defender, 0.93);

  assert.deepEqual(first, second);
});

test("Damage Engine validation failures propagate through resolveAttackDamage rather than being swallowed", () => {
  // level 0 can never happen for a real PlayerPokemon/wild encounter (both
  // are always >= 1), but this proves an invalid level reaches
  // calculateMoveDamage's own validation and throws DamageValidationError
  // rather than resolveAttackDamage silently producing a wrong result.
  const invalidAttacker = { baseStats: BASE_STATS, level: 0, types: [] };
  const defender = { baseStats: BASE_STATS, level: 50, types: [] };

  assert.throws(() => resolveAttackDamage(PHYSICAL_MOVE, invalidAttacker, defender, 1.0), DamageValidationError);
});

test("stats are derived via the centralized stat system, not the raw base stats themselves", () => {
  // level 1 shrinks a base stat of 50 down to a small calculated stat (see
  // calculatePokemonNonHpStat) — if resolveAttackDamage ever used the raw
  // base stats directly instead of the level-scaled calculated stats, this
  // low-level result would come out identical to a level-50 one.
  const lowLevelBattler = { baseStats: BASE_STATS, level: 1, types: [] };
  const highLevelBattler = { baseStats: BASE_STATS, level: 50, types: [] };

  const lowLevel = resolveAttackDamage(PHYSICAL_MOVE, lowLevelBattler, lowLevelBattler, 1.0);
  const highLevel = resolveAttackDamage(PHYSICAL_MOVE, highLevelBattler, highLevelBattler, 1.0);

  assert.ok(lowLevel.kind === "damage" && highLevel.kind === "damage");
  assert.notEqual(lowLevel.damage, highLevel.damage);
});

// --- Phase 5C: STAB -----------------------------------------------------------

test("a Fire-type attacker using a Fire move receives STAB", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: ["fire"] as const };
  const defender = { baseStats: BASE_STATS, level: 50, types: [] };

  const result = resolveAttackDamage(FIRE_MOVE, attacker, defender, 1.0);

  assert.ok(result.kind === "damage");
  assert.equal(result.stabApplied, true);
});

test("a Fire-type attacker using a Water move does not receive STAB", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: ["fire"] as const };
  const defender = { baseStats: BASE_STATS, level: 50, types: [] };

  const result = resolveAttackDamage(WATER_MOVE, attacker, defender, 1.0);

  assert.ok(result.kind === "damage");
  assert.equal(result.stabApplied, false);
});

test("a dual-type attacker receives STAB from a move matching its first type", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: ["fire", "flying"] as const };
  const defender = { baseStats: BASE_STATS, level: 50, types: [] };

  const result = resolveAttackDamage(FIRE_MOVE, attacker, defender, 1.0);

  assert.ok(result.kind === "damage");
  assert.equal(result.stabApplied, true);
});

test("a dual-type attacker receives STAB from a move matching its second type", () => {
  const flyingMove = fixtureMove({ id: "flying-move", type: "flying", category: "physical", power: 40 });
  const attacker = { baseStats: BASE_STATS, level: 50, types: ["fire", "flying"] as const };
  const defender = { baseStats: BASE_STATS, level: 50, types: [] };

  const result = resolveAttackDamage(flyingMove, attacker, defender, 1.0);

  assert.ok(result.kind === "damage");
  assert.equal(result.stabApplied, true);
});

test("a status move never receives STAB, even when its type matches the attacker's own type", () => {
  const fireStatusMove = fixtureMove({
    id: "fire-status-move",
    type: "fire",
    category: "status",
    power: null,
    effect: { kind: "stat-change", changes: [] },
  });
  const attacker = { baseStats: BASE_STATS, level: 50, types: ["fire"] as const };

  const result = resolveAttackDamage(fireStatusMove, attacker, attacker, 1.0);

  assert.deepEqual(result, { kind: "non-damaging", damage: 0, reason: "status-move" });
});

test("STAB increases damage by exactly 1.5x over the same hit without it", () => {
  const withoutStab = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const withStab = { baseStats: BASE_STATS, level: 50, types: ["fire"] as const };
  const defender = { baseStats: BASE_STATS, level: 50, types: [] };

  const noStabResult = resolveAttackDamage(FIRE_MOVE, withoutStab, defender, 1.0);
  const stabResult = resolveAttackDamage(FIRE_MOVE, withStab, defender, 1.0);

  assert.ok(noStabResult.kind === "damage" && stabResult.kind === "damage");
  assert.equal(noStabResult.stabApplied, false);
  assert.equal(stabResult.stabApplied, true);
  assert.equal(stabResult.damage, Math.floor(noStabResult.damage * 1.5));
});

// --- Phase 5D: Type Effectiveness -----------------------------------------------

test("a Fire move deals more damage against a Grass-type defender than a neutral one", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const neutralDefender = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const grassDefender = { baseStats: BASE_STATS, level: 50, types: ["grass"] as const };

  const neutralResult = resolveAttackDamage(FIRE_MOVE, attacker, neutralDefender, 1.0);
  const grassResult = resolveAttackDamage(FIRE_MOVE, attacker, grassDefender, 1.0);

  assert.ok(neutralResult.kind === "damage" && grassResult.kind === "damage");
  assert.equal(neutralResult.effectivenessResult, "normal");
  assert.equal(grassResult.effectivenessResult, "super-effective");
  assert.equal(grassResult.damage, neutralResult.damage * 2);
});

test("a Fire move deals less damage against a Water-type defender than a neutral one", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const neutralDefender = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const waterDefender = { baseStats: BASE_STATS, level: 50, types: ["water"] as const };

  const neutralResult = resolveAttackDamage(FIRE_MOVE, attacker, neutralDefender, 1.0);
  const waterResult = resolveAttackDamage(FIRE_MOVE, attacker, waterDefender, 1.0);

  assert.ok(neutralResult.kind === "damage" && waterResult.kind === "damage");
  assert.equal(waterResult.effectivenessResult, "not-very-effective");
  assert.equal(waterResult.damage, Math.floor(neutralResult.damage * 0.5));
});

test("an Electric move against a Ground-type defender deals exactly 0 damage (immune)", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const groundDefender = { baseStats: BASE_STATS, level: 50, types: ["ground"] as const };

  const result = resolveAttackDamage(ELECTRIC_MOVE, attacker, groundDefender, 1.0);

  assert.ok(result.kind === "damage");
  assert.equal(result.effectivenessMultiplier, 0);
  assert.equal(result.effectivenessResult, "immune");
  assert.equal(result.damage, 0);
});

test("a dual-type defender stacks both type multipliers (Fire vs. Grass/Steel = 4x)", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const dualDefender = { baseStats: BASE_STATS, level: 50, types: ["grass", "steel"] as const };
  const neutralDefender = { baseStats: BASE_STATS, level: 50, types: [] as const };

  const neutralResult = resolveAttackDamage(FIRE_MOVE, attacker, neutralDefender, 1.0);
  const dualResult = resolveAttackDamage(FIRE_MOVE, attacker, dualDefender, 1.0);

  assert.ok(neutralResult.kind === "damage" && dualResult.kind === "damage");
  assert.equal(dualResult.effectivenessMultiplier, 4);
  assert.equal(dualResult.effectivenessResult, "super-effective");
  assert.equal(dualResult.damage, neutralResult.damage * 4);
});

test("STAB and Type Effectiveness combine correctly (multiply together)", () => {
  // Fire attacker using a Fire move (STAB 1.5x) against a Grass-type
  // defender (effectiveness 2x): combined 3x over the no-bonus baseline.
  const fireAttacker = { baseStats: BASE_STATS, level: 50, types: ["fire"] as const };
  const neutralAttacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const grassDefender = { baseStats: BASE_STATS, level: 50, types: ["grass"] as const };

  const baseline = resolveAttackDamage(FIRE_MOVE, neutralAttacker, { baseStats: BASE_STATS, level: 50, types: [] }, 1.0);
  const combined = resolveAttackDamage(FIRE_MOVE, fireAttacker, grassDefender, 1.0);

  assert.ok(baseline.kind === "damage" && combined.kind === "damage");
  assert.equal(combined.stabApplied, true);
  assert.equal(combined.effectivenessMultiplier, 2);
  // afterStab = floor(baseline.damage * 1.5); final = floor(afterStab * 2).
  const expectedAfterStab = Math.floor(baseline.damage * 1.5);
  assert.equal(combined.damage, Math.floor(expectedAfterStab * 2));
});

test("a status move never receives a type-effectiveness multiplier either", () => {
  const fireStatusMove = fixtureMove({
    id: "fire-status-move-2",
    type: "fire",
    category: "status",
    power: null,
    effect: { kind: "stat-change", changes: [] },
  });
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const grassDefender = { baseStats: BASE_STATS, level: 50, types: ["grass"] as const };

  const result = resolveAttackDamage(fireStatusMove, attacker, grassDefender, 1.0);

  assert.deepEqual(result, { kind: "non-damaging", damage: 0, reason: "status-move" });
});

// --- Phase 5E: Accuracy ------------------------------------------------------------

const LOW_ACCURACY_MOVE = fixtureMove({ id: "low-accuracy-move", category: "physical", power: 40, accuracy: 70 });

test("a low-accuracy move hits when the accuracyRoll is below its accuracy", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const defender = { baseStats: BASE_STATS, level: 50, types: [] as const };

  const result = resolveAttackDamage(LOW_ACCURACY_MOVE, attacker, defender, 1.0, 0);

  assert.equal(result.kind, "damage");
});

test("a low-accuracy move misses when the accuracyRoll is at or above its accuracy", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const defender = { baseStats: BASE_STATS, level: 50, types: [] as const };

  const result = resolveAttackDamage(LOW_ACCURACY_MOVE, attacker, defender, 1.0, 70);

  assert.ok(result.kind === "miss");
  assert.equal(result.damage, 0);
});

test("omitting accuracyRoll always hits, even for a move with a real low accuracy (pre-Phase-5E callers keep working unchanged)", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const defender = { baseStats: BASE_STATS, level: 50, types: [] as const };

  const result = resolveAttackDamage(LOW_ACCURACY_MOVE, attacker, defender, 1.0);

  assert.equal(result.kind, "damage");
});

test("a miss skips STAB even when the move's type would otherwise match the attacker's own type", () => {
  const lowAccuracyFireMove = fixtureMove({ id: "low-accuracy-fire-move", type: "fire", category: "special", power: 40, accuracy: 70 });
  const fireAttacker = { baseStats: BASE_STATS, level: 50, types: ["fire"] as const };
  const defender = { baseStats: BASE_STATS, level: 50, types: [] as const };

  const result = resolveAttackDamage(lowAccuracyFireMove, fireAttacker, defender, 1.0, 70);

  assert.ok(result.kind === "miss");
  assert.equal(result.damage, 0);
});

test("a miss skips Type Effectiveness even when the move would otherwise be super-effective", () => {
  const lowAccuracyFireMove = fixtureMove({ id: "low-accuracy-fire-move-2", type: "fire", category: "special", power: 40, accuracy: 70 });
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const grassDefender = { baseStats: BASE_STATS, level: 50, types: ["grass"] as const };

  const result = resolveAttackDamage(lowAccuracyFireMove, attacker, grassDefender, 1.0, 70);

  assert.ok(result.kind === "miss");
  assert.equal(result.damage, 0);
});

// --- Phase 5F: Critical Hit ---------------------------------------------------------

test("a low criticalRoll produces a critical hit that deals more damage than the same attack without one", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const defender = { baseStats: BASE_STATS, level: 50, types: [] as const };

  const normal = resolveAttackDamage(PHYSICAL_MOVE, attacker, defender, 1.0, 0, 0.5);
  const critical = resolveAttackDamage(PHYSICAL_MOVE, attacker, defender, 1.0, 0, 0);

  assert.ok(normal.kind === "damage" && critical.kind === "damage");
  assert.equal(normal.critical, false);
  assert.equal(critical.critical, true);
  assert.equal(critical.damage, Math.floor(normal.damage * 1.5));
});

test("omitting criticalRoll never produces a critical hit (pre-Phase-5F callers keep working unchanged)", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const defender = { baseStats: BASE_STATS, level: 50, types: [] as const };

  const result = resolveAttackDamage(PHYSICAL_MOVE, attacker, defender, 1.0, 0);

  assert.ok(result.kind === "damage");
  assert.equal(result.critical, false);
});

test("a miss never becomes critical, even with a criticalRoll that would otherwise crit", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const defender = { baseStats: BASE_STATS, level: 50, types: [] as const };

  const result = resolveAttackDamage(LOW_ACCURACY_MOVE, attacker, defender, 1.0, 70, 0);

  assert.ok(result.kind === "miss");
  assert.equal(result.damage, 0);
});

test("a critical hit still combines with STAB and Type Effectiveness through the full glue layer", () => {
  const fireAttacker = { baseStats: BASE_STATS, level: 50, types: ["fire"] as const };
  const grassDefender = { baseStats: BASE_STATS, level: 50, types: ["grass"] as const };

  const withoutCritical = resolveAttackDamage(FIRE_MOVE, fireAttacker, grassDefender, 1.0, 0, 0.5);
  const withCritical = resolveAttackDamage(FIRE_MOVE, fireAttacker, grassDefender, 1.0, 0, 0);

  assert.ok(withoutCritical.kind === "damage" && withCritical.kind === "damage");
  assert.equal(withoutCritical.critical, false);
  assert.equal(withCritical.critical, true);
  assert.equal(withCritical.damage, Math.floor(withoutCritical.damage * 1.5));
});

// --- Phase 6E: Stat Stages ----------------------------------------------------------

test("an Attack stage of +1 on the attacker increases physical damage over the neutral baseline", () => {
  const defender = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const neutral = resolveAttackDamage(PHYSICAL_MOVE, { baseStats: BASE_STATS, level: 50, types: [] }, defender, 1.0);
  const buffed = resolveAttackDamage(PHYSICAL_MOVE, { baseStats: BASE_STATS, level: 50, types: [], stages: { attack: 1 } }, defender, 1.0);

  assert.ok(neutral.kind === "damage" && buffed.kind === "damage");
  assert.ok(buffed.damage > neutral.damage);
});

test("a Defense stage of -1 on the defender increases the physical damage it takes", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const neutral = resolveAttackDamage(PHYSICAL_MOVE, attacker, { baseStats: BASE_STATS, level: 50, types: [] }, 1.0);
  const debuffed = resolveAttackDamage(PHYSICAL_MOVE, attacker, { baseStats: BASE_STATS, level: 50, types: [], stages: { defense: -1 } }, 1.0);

  assert.ok(neutral.kind === "damage" && debuffed.kind === "damage");
  assert.ok(debuffed.damage > neutral.damage);
});

test("an Accuracy stage on the attacker (or Evasion on the defender) shifts hit resolution", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const defender = { baseStats: BASE_STATS, level: 50, types: [] as const };

  // LOW_ACCURACY_MOVE has accuracy 70; a roll of 75 alone misses (70 <= 75).
  const neutralMiss = resolveAttackDamage(LOW_ACCURACY_MOVE, attacker, defender, 1.0, 75);
  assert.equal(neutralMiss.kind, "miss");

  // +2 accuracy stage -> combined-stage multiplier (3+2)/3 -> effective
  // accuracy floor(70 * 5/3) = 116, clamped to 100 -> the same roll (75)
  // now hits instead of missing.
  const buffedAccuracyHits = resolveAttackDamage(
    LOW_ACCURACY_MOVE,
    { ...attacker, stages: { accuracy: 2 } },
    defender,
    1.0,
    75
  );
  assert.equal(buffedAccuracyHits.kind, "damage");

  // +2 Evasion on the defender lowers the attacker's effective accuracy
  // instead (combined stage -2 -> multiplier 3/5): floor(70*3/5) = 42, so
  // a roll of 50 (which would hit at neutral accuracy) now misses.
  const neutralHit = resolveAttackDamage(LOW_ACCURACY_MOVE, attacker, defender, 1.0, 50);
  assert.equal(neutralHit.kind, "damage");
  const evasiveMiss = resolveAttackDamage(LOW_ACCURACY_MOVE, attacker, { ...defender, stages: { evasion: 2 } }, 1.0, 50);
  assert.equal(evasiveMiss.kind, "miss");
});

// --- Phase 6G: Burn ------------------------------------------------------------------

test("burn halves the burned attacker's physical damage, but never affects a special move", () => {
  const attacker = { baseStats: BASE_STATS, level: 50, types: [] as const };
  const burnedAttacker = { ...attacker, status: "burn" as const };
  const defender = { baseStats: BASE_STATS, level: 50, types: [] as const };

  const normalPhysical = resolveAttackDamage(PHYSICAL_MOVE, attacker, defender, 1.0);
  const burnedPhysical = resolveAttackDamage(PHYSICAL_MOVE, burnedAttacker, defender, 1.0);
  assert.ok(normalPhysical.kind === "damage" && burnedPhysical.kind === "damage");
  assert.ok(burnedPhysical.damage < normalPhysical.damage);

  const normalSpecial = resolveAttackDamage(SPECIAL_MOVE, attacker, defender, 1.0);
  const burnedSpecial = resolveAttackDamage(SPECIAL_MOVE, burnedAttacker, defender, 1.0);
  assert.ok(normalSpecial.kind === "damage" && burnedSpecial.kind === "damage");
  assert.equal(burnedSpecial.damage, normalSpecial.damage, "burn must never reduce special damage");
});
