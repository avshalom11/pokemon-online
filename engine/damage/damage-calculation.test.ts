import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DamageValidationError,
  MAX_DAMAGE_RANDOM_FACTOR,
  MIN_DAMAGE_RANDOM_FACTOR,
  calculateBaseDamage,
  calculateMoveDamage,
} from "./damage-calculation.ts";
import type { CalculateMoveDamageInput } from "./damage-types.ts";

// Shared baseline: level 50, power 40, Attack/Defense 50/50 -> baseDamage 19
// (hand-computed: (2*50/5+2)=22; 22*40*50/50=880; 880/50=17.6; +2=19.6; floor=19).
const PHYSICAL_BASELINE: CalculateMoveDamageInput = {
  level: 50,
  moveCategory: "physical",
  movePower: 40,
  attackerStats: { attack: 50, specialAttack: 999 },
  defenderStats: { defense: 50, specialDefense: 999 },
  randomFactor: 1.0,
};

// Same level/power, but Special Attack 80 / Special Defense 30 -> baseDamage 48
// (22*40*80/30=2346.666..; /50=46.9333..; +2=48.9333..; floor=48).
const SPECIAL_BASELINE: CalculateMoveDamageInput = {
  level: 50,
  moveCategory: "special",
  movePower: 40,
  attackerStats: { attack: 999, specialAttack: 80 },
  defenderStats: { defense: 999, specialDefense: 30 },
  randomFactor: 1.0,
};

// --- Stat selection ----------------------------------------------------------

test("physical move uses Attack and Defense", () => {
  const result = calculateMoveDamage(PHYSICAL_BASELINE);
  assert.equal(result.kind, "damage");
  assert.equal(result.kind === "damage" && result.offensiveStat, "attack");
  assert.equal(result.kind === "damage" && result.defensiveStat, "defense");
  assert.equal(result.kind === "damage" && result.baseDamage, 19);
});

test("special move uses Special Attack and Special Defense", () => {
  const result = calculateMoveDamage(SPECIAL_BASELINE);
  assert.equal(result.kind, "damage");
  assert.equal(result.kind === "damage" && result.offensiveStat, "specialAttack");
  assert.equal(result.kind === "damage" && result.defensiveStat, "specialDefense");
  assert.equal(result.kind === "damage" && result.baseDamage, 48);
});

test("physical move does not use Special stats, even when they differ wildly from Attack/Defense", () => {
  const withHugeSpecialStats = calculateMoveDamage(PHYSICAL_BASELINE);
  const withTinySpecialStats = calculateMoveDamage({
    ...PHYSICAL_BASELINE,
    attackerStats: { attack: 50, specialAttack: 1 },
    defenderStats: { defense: 50, specialDefense: 1 },
  });

  assert.deepEqual(withHugeSpecialStats, withTinySpecialStats);
});

test("special move does not use Physical stats, even when they differ wildly from Special Attack/Defense", () => {
  const withHugePhysicalStats = calculateMoveDamage(SPECIAL_BASELINE);
  const withTinyPhysicalStats = calculateMoveDamage({
    ...SPECIAL_BASELINE,
    attackerStats: { attack: 1, specialAttack: 80 },
    defenderStats: { defense: 1, specialDefense: 30 },
  });

  assert.deepEqual(withHugePhysicalStats, withTinyPhysicalStats);
});

test("physical and Special calculations produce different results when the relevant stats differ", () => {
  const sharedStats = {
    attackerStats: { attack: 50, specialAttack: 80 },
    defenderStats: { defense: 50, specialDefense: 30 },
  };

  const physical = calculateMoveDamage({
    level: 50,
    moveCategory: "physical",
    movePower: 40,
    randomFactor: 1.0,
    ...sharedStats,
  });
  const special = calculateMoveDamage({
    level: 50,
    moveCategory: "special",
    movePower: 40,
    randomFactor: 1.0,
    ...sharedStats,
  });

  assert.equal(physical.kind === "damage" && physical.baseDamage, 19);
  assert.equal(special.kind === "damage" && special.baseDamage, 48);
  assert.notEqual(physical.kind === "damage" && physical.damage, special.kind === "damage" && special.damage);
});

// --- Non-damaging moves -------------------------------------------------------

test("status move returns a non-damaging result with reason status-move", () => {
  const result = calculateMoveDamage({
    level: 50,
    moveCategory: "status",
    movePower: null,
    attackerStats: { attack: 50, specialAttack: 50 },
    defenderStats: { defense: 50, specialDefense: 50 },
    randomFactor: 1.0,
  });

  assert.deepEqual(result, { kind: "non-damaging", damage: 0, reason: "status-move" });
});

test("null-power physical/special move returns a non-damaging result with reason missing-power", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_BASELINE, movePower: null });
  assert.deepEqual(result, { kind: "non-damaging", damage: 0, reason: "missing-power" });
});

test("undefined-power physical/special move returns a non-damaging result with reason missing-power", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_BASELINE, movePower: undefined });
  assert.deepEqual(result, { kind: "non-damaging", damage: 0, reason: "missing-power" });
});

test("zero-power physical/special move returns a non-damaging result with reason missing-power", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_BASELINE, movePower: 0 });
  assert.deepEqual(result, { kind: "non-damaging", damage: 0, reason: "missing-power" });
});

// --- Random factor -------------------------------------------------------------

test("random factor 0.85 (the minimum) is accepted and applied", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_BASELINE, randomFactor: 0.85 });
  // baseDamage 19 * 0.85 = 16.15 -> floor 16.
  assert.deepEqual(result, {
    kind: "damage",
    damage: 16,
    baseDamage: 19,
    randomFactor: 0.85,
    category: "physical",
    offensiveStat: "attack",
    defensiveStat: "defense",
    stabApplied: false,
    effectivenessMultiplier: 1,
    effectivenessResult: "normal",
    hit: true,
    accuracy: null,
    accuracyRoll: null,
    critical: false,
    criticalRoll: null,
    effectiveness: "normal",
  });
});

test("random factor 1.00 (the maximum) is accepted and applied", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_BASELINE, randomFactor: 1.0 });
  assert.equal(result.kind === "damage" && result.damage, 19);
});

test("random factor below 0.85 is rejected", () => {
  assert.throws(
    () => calculateMoveDamage({ ...PHYSICAL_BASELINE, randomFactor: 0.84 }),
    DamageValidationError
  );
});

test("random factor above 1.00 is rejected", () => {
  assert.throws(
    () => calculateMoveDamage({ ...PHYSICAL_BASELINE, randomFactor: 1.01 }),
    DamageValidationError
  );
});

test("the random factor constants match the 0.85-1.00 spec exactly", () => {
  assert.equal(MIN_DAMAGE_RANDOM_FACTOR, 0.85);
  assert.equal(MAX_DAMAGE_RANDOM_FACTOR, 1.0);
});

// --- Level validation ----------------------------------------------------------

test("level zero is rejected", () => {
  assert.throws(() => calculateMoveDamage({ ...PHYSICAL_BASELINE, level: 0 }), DamageValidationError);
});

test("a negative level is rejected", () => {
  assert.throws(() => calculateMoveDamage({ ...PHYSICAL_BASELINE, level: -5 }), DamageValidationError);
});

test("a non-integer level is rejected", () => {
  assert.throws(() => calculateMoveDamage({ ...PHYSICAL_BASELINE, level: 5.5 }), DamageValidationError);
});

// --- Stat validation -------------------------------------------------------------

test("a zero defense stat is rejected (prevents division by zero)", () => {
  assert.throws(
    () =>
      calculateMoveDamage({
        ...PHYSICAL_BASELINE,
        defenderStats: { defense: 0, specialDefense: 999 },
      }),
    DamageValidationError
  );
});

test("a negative defense stat is rejected", () => {
  assert.throws(
    () =>
      calculateMoveDamage({
        ...PHYSICAL_BASELINE,
        defenderStats: { defense: -10, specialDefense: 999 },
      }),
    DamageValidationError
  );
});

test("a zero attack stat is rejected", () => {
  assert.throws(
    () =>
      calculateMoveDamage({
        ...PHYSICAL_BASELINE,
        attackerStats: { attack: 0, specialAttack: 999 },
      }),
    DamageValidationError
  );
});

// --- NaN / Infinity safety -------------------------------------------------------

test("a valid damaging result is never NaN", () => {
  const result = calculateMoveDamage(PHYSICAL_BASELINE);
  assert.ok(result.kind === "damage");
  assert.ok(!Number.isNaN(result.damage));
  assert.ok(!Number.isNaN(result.baseDamage));
});

test("a valid damaging result is never Infinity", () => {
  const result = calculateMoveDamage(PHYSICAL_BASELINE);
  assert.ok(result.kind === "damage");
  assert.ok(Number.isFinite(result.damage));
  assert.ok(Number.isFinite(result.baseDamage));
});

// --- Minimum damage --------------------------------------------------------------

test("a valid damaging move always deals at least 1 damage, even for a very weak attacker vs. a very strong defender", () => {
  const result = calculateMoveDamage({
    level: 1,
    moveCategory: "physical",
    movePower: 1,
    attackerStats: { attack: 1, specialAttack: 1 },
    defenderStats: { defense: 999999, specialDefense: 999999 },
    randomFactor: MIN_DAMAGE_RANDOM_FACTOR,
  });

  assert.ok(result.kind === "damage");
  assert.ok(result.damage >= 1);
});

test("status and powerless moves are never forced to deal 1 damage", () => {
  const status = calculateMoveDamage({ ...PHYSICAL_BASELINE, moveCategory: "status", movePower: null });
  const powerless = calculateMoveDamage({ ...PHYSICAL_BASELINE, movePower: 0 });

  assert.equal(status.damage, 0);
  assert.equal(powerless.damage, 0);
});

// --- Rounding order ----------------------------------------------------------------

test("calculateBaseDamage matches the hand-computed formula for representative inputs", () => {
  assert.equal(calculateBaseDamage(50, 40, 50, 50), 19);
  assert.equal(calculateBaseDamage(50, 40, 80, 30), 48);
  assert.equal(calculateBaseDamage(50, 90, 100, 50), 81);
});

test("baseDamage is floored BEFORE multiplying by randomFactor, not after", () => {
  // level 1, power 33, attack 2500, defense 4000:
  //   levelFactor = 2*1/5+2 = 2.4
  //   raw = 2.4*33*2500/4000 = 49.5
  //   raw/50 + 2 = 2.99 -> floor -> baseDamage 2
  // If randomFactor were applied to the *unrounded* 2.99 instead of the
  // floored 2, floor(2.99*0.9)=2 -- a different, wrong answer.
  const result = calculateMoveDamage({
    level: 1,
    moveCategory: "physical",
    movePower: 33,
    attackerStats: { attack: 2500, specialAttack: 1 },
    defenderStats: { defense: 4000, specialDefense: 1 },
    randomFactor: 0.9,
  });

  assert.ok(result.kind === "damage");
  assert.equal(result.baseDamage, 2);
  assert.equal(result.damage, 1); // floor(2 * 0.9) = floor(1.8) = 1, not floor(2.99*0.9)=2
});

// --- Determinism -------------------------------------------------------------------

test("the same input always returns the same output", () => {
  const first = calculateMoveDamage(PHYSICAL_BASELINE);
  const second = calculateMoveDamage(PHYSICAL_BASELINE);
  assert.deepEqual(first, second);
});

// --- Phase 5C: STAB (Same Type Attack Bonus) ----------------------------------------

// Same stats as SPECIAL_BASELINE above (baseDamage 48 at randomFactor 1.0),
// plus a Fire-type move used by a Fire-type attacker.
const FIRE_SPECIAL_WITH_STAB: CalculateMoveDamageInput = {
  level: 50,
  moveCategory: "special",
  movePower: 40,
  attackerStats: { attack: 999, specialAttack: 80 },
  defenderStats: { defense: 999, specialDefense: 30 },
  randomFactor: 1.0,
  moveType: "fire",
  attackerTypes: ["fire"],
};

test("a Fire-type Pokémon using a Fire-type move receives STAB", () => {
  const result = calculateMoveDamage(FIRE_SPECIAL_WITH_STAB);
  assert.ok(result.kind === "damage");
  assert.equal(result.stabApplied, true);
  // baseDamage 48 * 1.0 (random) = 48; STAB: floor(48 * 1.5) = 72.
  assert.equal(result.damage, 72);
});

test("a Fire-type Pokémon using a Normal-type move does not receive STAB", () => {
  const result = calculateMoveDamage({ ...FIRE_SPECIAL_WITH_STAB, moveType: "normal" });
  assert.ok(result.kind === "damage");
  assert.equal(result.stabApplied, false);
  assert.equal(result.damage, 48);
});

test("a Water-type Pokémon using a Water-type move receives STAB", () => {
  const result = calculateMoveDamage({ ...FIRE_SPECIAL_WITH_STAB, moveType: "water", attackerTypes: ["water"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.stabApplied, true);
  assert.equal(result.damage, 72);
});

test("a dual-type Pokémon receives STAB from a move matching its first listed type", () => {
  const result = calculateMoveDamage({ ...FIRE_SPECIAL_WITH_STAB, attackerTypes: ["fire", "flying"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.stabApplied, true);
  assert.equal(result.damage, 72);
});

test("a dual-type Pokémon receives STAB from a move matching its second listed type", () => {
  const result = calculateMoveDamage({ ...FIRE_SPECIAL_WITH_STAB, moveType: "flying", attackerTypes: ["fire", "flying"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.stabApplied, true);
  assert.equal(result.damage, 72);
});

test("a dual-type Pokémon never receives STAB twice, even with a duplicate type entry", () => {
  const result = calculateMoveDamage({ ...FIRE_SPECIAL_WITH_STAB, attackerTypes: ["fire", "fire"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.stabApplied, true);
  // Must stay 72 (a single 1.5x application), never floor(48 * 1.5 * 1.5) = 108.
  assert.equal(result.damage, 72);
});

test("a status move never receives STAB, even when moveType/attackerTypes would otherwise match", () => {
  const result = calculateMoveDamage({
    level: 50,
    moveCategory: "status",
    movePower: null,
    attackerStats: { attack: 50, specialAttack: 50 },
    defenderStats: { defense: 50, specialDefense: 50 },
    randomFactor: 1.0,
    moveType: "fire",
    attackerTypes: ["fire"],
  });

  assert.deepEqual(result, { kind: "non-damaging", damage: 0, reason: "status-move" });
});

test("STAB multiplies the post-random damage by exactly 1.5x", () => {
  const withoutStab = calculateMoveDamage({ ...FIRE_SPECIAL_WITH_STAB, moveType: "normal" });
  const withStab = calculateMoveDamage(FIRE_SPECIAL_WITH_STAB);

  assert.ok(withoutStab.kind === "damage" && withStab.kind === "damage");
  assert.equal(withStab.damage, Math.floor(withoutStab.damage * 1.5));
});

test("STAB is applied to the floored post-random damage, not to the unrounded pre-random value", () => {
  // level 1, power 1, attack 1, defense 999999, randomFactor 0.85:
  //   baseDamage = 2 (see the "at least 1 damage" test above for the same numbers)
  //   afterRandom = floor(2 * 0.85) = floor(1.7) = 1
  //   correct: floor(1 * 1.5) = 1
  //   wrong (STAB applied to the unfloored 2*0.85=1.7 instead): floor(1.7*1.5)=floor(2.55)=2
  const result = calculateMoveDamage({
    level: 1,
    moveCategory: "physical",
    movePower: 1,
    attackerStats: { attack: 1, specialAttack: 1 },
    defenderStats: { defense: 999999, specialDefense: 999999 },
    randomFactor: 0.85,
    moveType: "fire",
    attackerTypes: ["fire"],
  });

  assert.ok(result.kind === "damage");
  assert.equal(result.baseDamage, 2);
  assert.equal(result.stabApplied, true);
  assert.equal(result.damage, 1);
});

test("omitting moveType/attackerTypes never applies STAB (pre-Phase-5C callers keep working unchanged)", () => {
  const withoutTypes = calculateMoveDamage(SPECIAL_BASELINE);
  assert.ok(withoutTypes.kind === "damage");
  assert.equal(withoutTypes.stabApplied, false);
  assert.equal(withoutTypes.damage, 48);
});

// --- Phase 5D: Type Effectiveness ---------------------------------------------------

// Same stats as SPECIAL_BASELINE (baseDamage 48 at randomFactor 1.0), no
// STAB (no attackerTypes) — isolates Type Effectiveness on its own.
const SPECIAL_WITH_EFFECTIVENESS: CalculateMoveDamageInput = {
  level: 50,
  moveCategory: "special",
  movePower: 40,
  attackerStats: { attack: 999, specialAttack: 80 },
  defenderStats: { defense: 999, specialDefense: 30 },
  randomFactor: 1.0,
};

test("Fire -> Grass is super-effective and doubles the damage (2x)", () => {
  const result = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "fire", defenderTypes: ["grass"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.effectivenessMultiplier, 2);
  assert.equal(result.effectivenessResult, "super-effective");
  assert.equal(result.damage, 96); // floor(48 * 2)
});

test("Fire -> Water is not-very-effective and halves the damage (0.5x)", () => {
  const result = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "fire", defenderTypes: ["water"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.effectivenessMultiplier, 0.5);
  assert.equal(result.effectivenessResult, "not-very-effective");
  assert.equal(result.damage, 24); // floor(48 * 0.5)
});

test("Water -> Fire is super-effective (2x)", () => {
  const result = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "water", defenderTypes: ["fire"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.effectivenessMultiplier, 2);
  assert.equal(result.effectivenessResult, "super-effective");
  assert.equal(result.damage, 96);
});

test("Electric -> Water is super-effective (2x)", () => {
  const result = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "electric", defenderTypes: ["water"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.effectivenessMultiplier, 2);
  assert.equal(result.damage, 96);
});

test("Electric -> Ground is a complete immunity: damage is exactly 0, not clamped to 1", () => {
  const result = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "electric", defenderTypes: ["ground"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.effectivenessMultiplier, 0);
  assert.equal(result.effectivenessResult, "immune");
  assert.equal(result.damage, 0);
});

test("Normal -> Ghost is a complete immunity (0x)", () => {
  const result = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "normal", defenderTypes: ["ghost"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.effectivenessMultiplier, 0);
  assert.equal(result.damage, 0);
});

test("Ghost -> Normal is a complete immunity (0x)", () => {
  const result = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "ghost", defenderTypes: ["normal"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.effectivenessMultiplier, 0);
  assert.equal(result.damage, 0);
});

test("Fire -> Grass/Steel dual-type defender stacks to 4x", () => {
  const result = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "fire", defenderTypes: ["grass", "steel"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.effectivenessMultiplier, 4);
  assert.equal(result.effectivenessResult, "super-effective");
  assert.equal(result.damage, 192); // floor(48 * 4)
});

test("Fire -> Water/Dragon dual-type defender stacks to 0.25x", () => {
  const result = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "fire", defenderTypes: ["water", "dragon"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.effectivenessMultiplier, 0.25);
  assert.equal(result.effectivenessResult, "not-very-effective");
  assert.equal(result.damage, 12); // floor(48 * 0.25)
});

test("a neutral matchup applies exactly 1x and leaves damage unchanged", () => {
  const result = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "fire", defenderTypes: ["electric"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.effectivenessMultiplier, 1);
  assert.equal(result.effectivenessResult, "normal");
  assert.equal(result.damage, 48);
});

test("STAB and Type Effectiveness combine multiplicatively (Fire/Fire attacker vs. Grass defender)", () => {
  const result = calculateMoveDamage({
    ...SPECIAL_WITH_EFFECTIVENESS,
    moveType: "fire",
    attackerTypes: ["fire"],
    defenderTypes: ["grass"],
  });

  assert.ok(result.kind === "damage");
  assert.equal(result.stabApplied, true);
  assert.equal(result.effectivenessMultiplier, 2);
  // afterRandom = 48; afterStab = floor(48*1.5) = 72; final = floor(72*2) = 144.
  assert.equal(result.damage, 144);
});

test("the random factor still applies normally alongside Type Effectiveness", () => {
  const result = calculateMoveDamage({
    ...SPECIAL_WITH_EFFECTIVENESS,
    moveType: "electric",
    defenderTypes: ["water"],
    randomFactor: 0.85,
  });

  assert.ok(result.kind === "damage");
  // afterRandom = floor(48 * 0.85) = floor(40.8) = 40; effectiveness 2x -> floor(40*2) = 80.
  assert.equal(result.damage, 80);
});

test("status moves are unaffected by Type Effectiveness even when moveType/defenderTypes are supplied", () => {
  const result = calculateMoveDamage({
    level: 50,
    moveCategory: "status",
    movePower: null,
    attackerStats: { attack: 50, specialAttack: 50 },
    defenderStats: { defense: 50, specialDefense: 50 },
    randomFactor: 1.0,
    moveType: "electric",
    defenderTypes: ["ground"],
  });

  assert.deepEqual(result, { kind: "non-damaging", damage: 0, reason: "status-move" });
});

test("type effectiveness is applied to the floored post-STAB damage, not to an unrounded intermediate value", () => {
  // level 1, power 1, attack 1, defense 999999, randomFactor 0.85 (same
  // numbers as the STAB rounding-order test above): baseDamage = 2,
  // afterRandom = floor(2*0.85) = floor(1.7) = 1.
  //   correct: floor(1 * 2) = 2
  //   wrong (effectiveness applied to the unfloored 1.7 instead):
  //     floor(1.7 * 2) = floor(3.4) = 3
  const result = calculateMoveDamage({
    level: 1,
    moveCategory: "physical",
    movePower: 1,
    attackerStats: { attack: 1, specialAttack: 1 },
    defenderStats: { defense: 999999, specialDefense: 999999 },
    randomFactor: 0.85,
    moveType: "water",
    defenderTypes: ["fire"],
  });

  assert.ok(result.kind === "damage");
  assert.equal(result.baseDamage, 2);
  assert.equal(result.effectivenessMultiplier, 2);
  assert.equal(result.damage, 2);
});

test("omitting moveType/defenderTypes never applies an effectiveness multiplier (pre-Phase-5D callers keep working unchanged)", () => {
  const withoutTypes = calculateMoveDamage(SPECIAL_BASELINE);
  assert.ok(withoutTypes.kind === "damage");
  assert.equal(withoutTypes.effectivenessMultiplier, 1);
  assert.equal(withoutTypes.effectivenessResult, "normal");
  assert.equal(withoutTypes.damage, 48);
});

// --- Phase 5E: Accuracy ------------------------------------------------------------

// Same stats as PHYSICAL_BASELINE (baseDamage 19 at randomFactor 1.0), with
// a real accuracy value added so the check actually runs.
const PHYSICAL_WITH_ACCURACY: CalculateMoveDamageInput = {
  ...PHYSICAL_BASELINE,
  accuracy: 70,
};

test("accuracy 100 always hits regardless of the roll", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_BASELINE, accuracy: 100, accuracyRoll: 99 });
  assert.equal(result.kind, "damage");
});

test("accuracy 95 can hit (a roll below 95)", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_BASELINE, accuracy: 95, accuracyRoll: 0 });
  assert.equal(result.kind, "damage");
});

test("accuracy 95 can miss (a roll in its 5% miss band)", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_BASELINE, accuracy: 95, accuracyRoll: 95 });
  assert.equal(result.kind, "miss");
});

test("accuracy 70 can miss (a roll at or above 70)", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_WITH_ACCURACY, accuracyRoll: 70 });
  assert.equal(result.kind, "miss");
});

test("accuracy 70 can hit (a roll below 70)", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_WITH_ACCURACY, accuracyRoll: 0 });
  assert.equal(result.kind, "damage");
});

test("accuracy 0 always misses regardless of the roll", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_BASELINE, accuracy: 0, accuracyRoll: 0 });
  assert.equal(result.kind, "miss");
});

test("a miss deals exactly 0 damage", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_WITH_ACCURACY, accuracyRoll: 70 });
  assert.ok(result.kind === "miss");
  assert.equal(result.damage, 0);
});

test("a miss result carries hit: false and the exact accuracy/accuracyRoll it was decided from", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_WITH_ACCURACY, accuracyRoll: 70 });
  assert.ok(result.kind === "miss");
  assert.equal(result.hit, false);
  assert.equal(result.accuracy, 70);
  assert.equal(result.accuracyRoll, 70);
});

test("a hit result carries hit: true and the exact accuracy/accuracyRoll it was decided from", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_WITH_ACCURACY, accuracyRoll: 0 });
  assert.ok(result.kind === "damage");
  assert.equal(result.hit, true);
  assert.equal(result.accuracy, 70);
  assert.equal(result.accuracyRoll, 0);
});

test("a miss never applies STAB — a move that would otherwise get STAB deals 0 damage instead", () => {
  const result = calculateMoveDamage({
    ...FIRE_SPECIAL_WITH_STAB,
    accuracy: 70,
    accuracyRoll: 70, // miss
  });

  assert.ok(result.kind === "miss");
  assert.equal(result.damage, 0);
  // MissedMoveResult has no stabApplied field at all — the STAB step never ran.
  assert.ok(!("stabApplied" in result));
});

test("a miss never applies Type Effectiveness — a move that would otherwise be super-effective deals 0 damage instead", () => {
  const result = calculateMoveDamage({
    ...SPECIAL_WITH_EFFECTIVENESS,
    moveType: "fire",
    defenderTypes: ["grass"],
    accuracy: 70,
    accuracyRoll: 70, // miss
  });

  assert.ok(result.kind === "miss");
  assert.equal(result.damage, 0);
  // MissedMoveResult has no effectivenessMultiplier field at all — the
  // Type Effectiveness step never ran.
  assert.ok(!("effectivenessMultiplier" in result));
});

test("a miss leaves no stat-validation side effect — an otherwise-invalid defense stat never even gets checked once the move has already missed", () => {
  // A 0 defense stat would normally throw (see the stat-validation tests
  // above) — proving it does NOT throw here confirms the accuracy check
  // truly short-circuits before stat validation ever runs.
  const result = calculateMoveDamage({
    ...PHYSICAL_WITH_ACCURACY,
    accuracyRoll: 70, // miss
    defenderStats: { defense: 0, specialDefense: 999 },
  });

  assert.equal(result.kind, "miss");
});

test("Phase 6D/6G: a status move IS now accuracy-checked, and misses exactly like a damaging move would", () => {
  const result = calculateMoveDamage({
    level: 50,
    moveCategory: "status",
    movePower: null,
    attackerStats: { attack: 50, specialAttack: 50 },
    defenderStats: { defense: 50, specialDefense: 50 },
    randomFactor: 1.0,
    accuracy: 0,
    accuracyRoll: 0,
  });

  assert.deepEqual(result, {
    kind: "miss",
    damage: 0,
    hit: false,
    accuracy: 0,
    accuracyRoll: 0,
    critical: false,
    effectiveness: "normal",
  });
});

test("a status move with no accuracy data (or accuracy: null) still resolves to its non-damaging result, never a miss", () => {
  const result = calculateMoveDamage({
    level: 50,
    moveCategory: "status",
    movePower: null,
    attackerStats: { attack: 50, specialAttack: 50 },
    defenderStats: { defense: 50, specialDefense: 50 },
    randomFactor: 1.0,
  });

  assert.deepEqual(result, { kind: "non-damaging", damage: 0, reason: "status-move" });
});

test("a status move that passes its accuracy check still resolves to the non-damaging result", () => {
  const result = calculateMoveDamage({
    level: 50,
    moveCategory: "status",
    movePower: null,
    attackerStats: { attack: 50, specialAttack: 50 },
    defenderStats: { defense: 50, specialDefense: 50 },
    randomFactor: 1.0,
    accuracy: 100,
    accuracyRoll: 99,
  });

  assert.deepEqual(result, { kind: "non-damaging", damage: 0, reason: "status-move" });
});

test("a missing-power move is never accuracy-checked, even when a real accuracy/accuracyRoll pair would otherwise miss", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_BASELINE, movePower: null, accuracy: 0, accuracyRoll: 0 });
  assert.deepEqual(result, { kind: "non-damaging", damage: 0, reason: "missing-power" });
});

test("accuracy null (e.g. Swift/Bide/Struggle) always hits and never consumes a roll", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_BASELINE, accuracy: null });
  assert.ok(result.kind === "damage");
  assert.equal(result.hit, true);
  assert.equal(result.accuracy, null);
  assert.equal(result.accuracyRoll, null);
});

test("omitting accuracy/accuracyRoll entirely always hits (pre-Phase-5E callers keep working unchanged)", () => {
  const result = calculateMoveDamage(PHYSICAL_BASELINE);
  assert.ok(result.kind === "damage");
  assert.equal(result.hit, true);
  assert.equal(result.damage, 19);
});

test("a numeric accuracy without a paired accuracyRoll always hits rather than throwing", () => {
  const result = calculateMoveDamage(PHYSICAL_WITH_ACCURACY);
  assert.ok(result.kind === "damage");
  assert.equal(result.hit, true);
  assert.equal(result.damage, 19);
});

test("an accuracy above 100 is rejected", () => {
  assert.throws(
    () => calculateMoveDamage({ ...PHYSICAL_BASELINE, accuracy: 101, accuracyRoll: 0 }),
    DamageValidationError
  );
});

test("a negative accuracy is rejected", () => {
  assert.throws(
    () => calculateMoveDamage({ ...PHYSICAL_BASELINE, accuracy: -1, accuracyRoll: 0 }),
    DamageValidationError
  );
});

test("an accuracyRoll above 99 is rejected", () => {
  assert.throws(
    () => calculateMoveDamage({ ...PHYSICAL_WITH_ACCURACY, accuracyRoll: 100 }),
    DamageValidationError
  );
});

test("a negative accuracyRoll is rejected", () => {
  assert.throws(
    () => calculateMoveDamage({ ...PHYSICAL_WITH_ACCURACY, accuracyRoll: -1 }),
    DamageValidationError
  );
});

// --- Phase 5F: Critical Hit ---------------------------------------------------------

// A guaranteed hit (accuracy 100 always hits regardless of roll) built on
// top of PHYSICAL_BASELINE (baseDamage 19 at randomFactor 1.0), so every
// test below isolates the critical-hit step alone.
const PHYSICAL_GUARANTEED_HIT: CalculateMoveDamageInput = {
  ...PHYSICAL_BASELINE,
  accuracy: 100,
  accuracyRoll: 0,
};

test("a normal hit (a high criticalRoll) is not critical", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_GUARANTEED_HIT, criticalRoll: 0.5 });
  assert.ok(result.kind === "damage");
  assert.equal(result.critical, false);
  assert.equal(result.damage, 19);
});

test("a critical hit (a low criticalRoll) multiplies the final damage by 1.5", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_GUARANTEED_HIT, criticalRoll: 0 });
  assert.ok(result.kind === "damage");
  assert.equal(result.critical, true);
  // afterRandom = 19 (randomFactor 1.0), no STAB, no effectiveness change ->
  // afterEffectiveness = 19; critical: floor(19 * 1.5) = floor(28.5) = 28.
  assert.equal(result.damage, 28);
});

test("critical is only checked after a successful hit — a miss never rolls or reports one", () => {
  const result = calculateMoveDamage({
    ...PHYSICAL_BASELINE,
    accuracy: 0,
    accuracyRoll: 0, // guaranteed miss
    criticalRoll: 0, // would be a guaranteed critical, if it were ever checked
  });

  assert.ok(result.kind === "miss");
  assert.equal(result.damage, 0);
  // Phase 5G: MissedMoveResult always reports critical: false (the critical
  // step never actually ran — this is the fixed Battle Outcome value for
  // any miss, not a real check result).
  assert.equal(result.critical, false);
});

test("a missed attack can never become critical, even at the lowest possible criticalRoll", () => {
  const result = calculateMoveDamage({
    ...PHYSICAL_BASELINE,
    accuracy: 50,
    accuracyRoll: 50, // guaranteed miss (roll must be < accuracy)
    criticalRoll: 0,
  });

  assert.equal(result.kind, "miss");
});

test("a type-immune hit can never become critical, even at the lowest possible criticalRoll", () => {
  const result = calculateMoveDamage({
    ...PHYSICAL_GUARANTEED_HIT,
    moveType: "normal",
    defenderTypes: ["ghost"], // Normal -> Ghost is a complete immunity (0x)
    criticalRoll: 0,
  });

  assert.ok(result.kind === "damage");
  assert.equal(result.damage, 0);
  assert.equal(result.critical, false);
  assert.equal(result.criticalRoll, null);
});

test("a status move never becomes critical, even when a criticalRoll that would otherwise crit is supplied", () => {
  const result = calculateMoveDamage({
    level: 50,
    moveCategory: "status",
    movePower: null,
    attackerStats: { attack: 50, specialAttack: 50 },
    defenderStats: { defense: 50, specialDefense: 50 },
    randomFactor: 1.0,
    criticalRoll: 0,
  });

  assert.deepEqual(result, { kind: "non-damaging", damage: 0, reason: "status-move" });
});

test("a missing-power move never becomes critical, even when a criticalRoll that would otherwise crit is supplied", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_GUARANTEED_HIT, movePower: null, criticalRoll: 0 });
  assert.deepEqual(result, { kind: "non-damaging", damage: 0, reason: "missing-power" });
});

test("STAB and Critical combine correctly", () => {
  const result = calculateMoveDamage({
    ...FIRE_SPECIAL_WITH_STAB,
    accuracy: 100,
    accuracyRoll: 0,
    criticalRoll: 0, // guaranteed critical
  });

  assert.ok(result.kind === "damage");
  assert.equal(result.stabApplied, true);
  assert.equal(result.critical, true);
  // afterRandom = 48; afterStab = floor(48*1.5) = 72; afterEffectiveness =
  // 72 (no type data here); critical: floor(72*1.5) = floor(108) = 108.
  assert.equal(result.damage, 108);
});

test("Type Effectiveness and Critical combine correctly", () => {
  const result = calculateMoveDamage({
    ...SPECIAL_WITH_EFFECTIVENESS,
    moveType: "fire",
    defenderTypes: ["grass"],
    accuracy: 100,
    accuracyRoll: 0,
    criticalRoll: 0, // guaranteed critical
  });

  assert.ok(result.kind === "damage");
  assert.equal(result.effectivenessMultiplier, 2);
  assert.equal(result.critical, true);
  // afterRandom = 48 (no STAB); afterEffectiveness = floor(48*2) = 96;
  // critical: floor(96*1.5) = 144.
  assert.equal(result.damage, 144);
});

test("STAB, Type Effectiveness, and Critical all combine correctly together", () => {
  const result = calculateMoveDamage({
    ...SPECIAL_WITH_EFFECTIVENESS,
    moveType: "fire",
    attackerTypes: ["fire"],
    defenderTypes: ["grass"],
    accuracy: 100,
    accuracyRoll: 0,
    criticalRoll: 0, // guaranteed critical
  });

  assert.ok(result.kind === "damage");
  assert.equal(result.stabApplied, true);
  assert.equal(result.effectivenessMultiplier, 2);
  assert.equal(result.critical, true);
  // afterRandom = 48; afterStab = floor(48*1.5) = 72; afterEffectiveness =
  // floor(72*2) = 144; critical: floor(144*1.5) = 216.
  assert.equal(result.damage, 216);
});

test("critical is applied to the floored post-effectiveness damage, not to an unrounded intermediate value", () => {
  // level 50, power 40, attack 60, defense 50, randomFactor 1.0, no
  // STAB/effectiveness data: afterEffectiveness lands on 23 exactly (see
  // below). floor(23 * 1.5) = floor(34.5) = 34 is the correct answer;
  // applying the 1.5x to some unrounded upstream value instead of this
  // floored 23 would produce a different number.
  const result = calculateMoveDamage({
    level: 50,
    moveCategory: "physical",
    movePower: 40,
    attackerStats: { attack: 60, specialAttack: 1 },
    defenderStats: { defense: 50, specialDefense: 1 },
    randomFactor: 1.0,
    accuracy: 100,
    accuracyRoll: 0,
    criticalRoll: 0,
  });

  assert.ok(result.kind === "damage");
  // levelFactor@50 = 22; raw = 22*40*60/50 = 1056; baseDamage = floor(1056/50+2) = floor(23.12) = 23.
  assert.equal(result.baseDamage, 23);
  // afterRandom = 23 (randomFactor 1.0); no STAB/effectiveness ->
  // afterEffectiveness = 23; critical: floor(23*1.5) = floor(34.5) = 34.
  assert.equal(result.damage, 34);
});

test("the minimum-1-damage floor still applies after a critical hit", () => {
  const result = calculateMoveDamage({
    level: 1,
    moveCategory: "physical",
    movePower: 1,
    attackerStats: { attack: 1, specialAttack: 1 },
    defenderStats: { defense: 999999, specialDefense: 999999 },
    randomFactor: MIN_DAMAGE_RANDOM_FACTOR,
    accuracy: 100,
    accuracyRoll: 0,
    criticalRoll: 0, // guaranteed critical
  });

  assert.ok(result.kind === "damage");
  assert.ok(result.damage >= 1);
});

test("a critical result reports back the exact criticalRoll it was decided from", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_GUARANTEED_HIT, criticalRoll: 0.02 });
  assert.ok(result.kind === "damage");
  assert.equal(result.critical, true);
  assert.equal(result.criticalRoll, 0.02);
});

test("a non-critical result reports back the exact criticalRoll it was decided from", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_GUARANTEED_HIT, criticalRoll: 0.5 });
  assert.ok(result.kind === "damage");
  assert.equal(result.critical, false);
  assert.equal(result.criticalRoll, 0.5);
});

test("omitting criticalRoll entirely always resolves to non-critical (pre-Phase-5F callers keep working unchanged)", () => {
  const result = calculateMoveDamage(PHYSICAL_BASELINE);
  assert.ok(result.kind === "damage");
  assert.equal(result.critical, false);
  assert.equal(result.criticalRoll, null);
  assert.equal(result.damage, 19);
});

test("a criticalRoll of exactly 1 is rejected", () => {
  assert.throws(
    () => calculateMoveDamage({ ...PHYSICAL_GUARANTEED_HIT, criticalRoll: 1 }),
    DamageValidationError
  );
});

test("a negative criticalRoll is rejected", () => {
  assert.throws(
    () => calculateMoveDamage({ ...PHYSICAL_GUARANTEED_HIT, criticalRoll: -0.1 }),
    DamageValidationError
  );
});

// --- Phase 5G: Battle Outcome metadata -----------------------------------------------
//
// The Damage Engine never generates user-facing strings — these tests only
// check the structured "effectiveness"/"hit"/"critical"/"damage" fields the
// UI will later read to decide what to show, never any text itself.

test("a normal-effectiveness hit reports effectiveness: \"normal\"", () => {
  const result = calculateMoveDamage(PHYSICAL_BASELINE);
  assert.ok(result.kind === "damage");
  assert.equal(result.effectiveness, "normal");
});

test("a super-effective hit reports effectiveness: \"super-effective\"", () => {
  const result = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "fire", defenderTypes: ["grass"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.effectiveness, "super-effective");
});

test("a not-very-effective hit reports effectiveness: \"not-very-effective\"", () => {
  const result = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "fire", defenderTypes: ["water"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.effectiveness, "not-very-effective");
});

test("a type immunity reports effectiveness: \"none\" (not \"immune\") and 0 damage", () => {
  const result = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "electric", defenderTypes: ["ground"] });
  assert.ok(result.kind === "damage");
  assert.equal(result.effectiveness, "none");
  assert.equal(result.hit, true);
  assert.equal(result.critical, false);
  assert.equal(result.damage, 0);
});

test("a miss reports hit: false, critical: false, effectiveness: \"normal\", damage: 0", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_WITH_ACCURACY, accuracyRoll: 70 });
  assert.ok(result.kind === "miss");
  assert.equal(result.hit, false);
  assert.equal(result.critical, false);
  assert.equal(result.effectiveness, "normal");
  assert.equal(result.damage, 0);
});

test("a miss is never critical, even at the guaranteed-critical roll", () => {
  const result = calculateMoveDamage({
    ...PHYSICAL_WITH_ACCURACY,
    accuracyRoll: 70, // miss
    criticalRoll: 0, // would guarantee a critical, if it were ever checked
  });
  assert.ok(result.kind === "miss");
  assert.equal(result.critical, false);
});

test("a critical hit still reports critical: true (existing Critical Hit logic unchanged)", () => {
  const result = calculateMoveDamage({ ...PHYSICAL_GUARANTEED_HIT, criticalRoll: 0 });
  assert.ok(result.kind === "damage");
  assert.equal(result.critical, true);
  assert.equal(result.effectiveness, "normal");
});

test("a critical hit combined with super-effective reports both critical: true and effectiveness: \"super-effective\"", () => {
  const result = calculateMoveDamage({
    ...SPECIAL_WITH_EFFECTIVENESS,
    moveType: "fire",
    defenderTypes: ["grass"],
    accuracy: 100,
    accuracyRoll: 0,
    criticalRoll: 0, // guaranteed critical
  });

  assert.ok(result.kind === "damage");
  assert.equal(result.critical, true);
  assert.equal(result.effectiveness, "super-effective");
  // Same numbers as the pre-existing "Type Effectiveness and Critical
  // combine correctly" test above — damage math itself is unchanged.
  assert.equal(result.damage, 144);
});

test("damage values are unaffected by the new effectiveness field — same numbers as the pre-Phase-5G formula", () => {
  const normal = calculateMoveDamage(PHYSICAL_BASELINE);
  const superEffective = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "fire", defenderTypes: ["grass"] });
  const notVeryEffective = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "fire", defenderTypes: ["water"] });

  assert.ok(normal.kind === "damage" && superEffective.kind === "damage" && notVeryEffective.kind === "damage");
  assert.equal(normal.damage, 19);
  assert.equal(superEffective.damage, 96);
  assert.equal(notVeryEffective.damage, 24);
});

test("the Damage Engine result never contains a user-facing string field", () => {
  const result = calculateMoveDamage({ ...SPECIAL_WITH_EFFECTIVENESS, moveType: "fire", defenderTypes: ["grass"] });
  assert.ok(result.kind === "damage");
  assert.ok(!("message" in result));
  assert.ok(!("text" in result));
});
