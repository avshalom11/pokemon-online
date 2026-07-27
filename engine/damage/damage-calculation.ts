import type {
  CalculateMoveDamageInput,
  CalculateMoveDamageResult,
  DamagingMoveCategory,
  DefensiveStatKind,
  OffensiveStatKind,
} from "./damage-types.ts";
import { DamageValidationError } from "./damage-errors.ts";
import { calculateTypeEffectiveness } from "./type-chart.ts";
import type { MoveType } from "../moves/index.ts";

// Re-exported so every existing "./damage-calculation.ts" import path (this
// file's own test, index.ts's barrel) keeps working unchanged even though
// the class now actually lives in damage-errors.ts (split out to avoid a
// circular import with type-chart.ts, which also needs to throw it).
export { DamageValidationError };

// Phase 5B.1 — pure damage calculation engine. Phase 5C added STAB.
// Phase 5D added Type Effectiveness.
//
// Formula (Physical/Special moves only):
//
//   baseDamage         = floor( ( (2*level/5 + 2) * power * attackStat / defenseStat ) / 50 + 2 )
//   afterRandom        = floor( baseDamage * randomFactor )
//   afterStab          = STAB applies ? floor( afterRandom * 1.5 ) : afterRandom
//   damage             = effectivenessMultiplier === 0
//                           ? 0
//                           : floor( afterStab * effectivenessMultiplier ), never below 1
//
// Rounding happens at every stage, in this exact order, and never earlier:
// once on the whole bracketed expression after the "+ 2" (baseDamage), once
// after multiplying by randomFactor (afterRandom), once after multiplying
// by the STAB multiplier if it applies (afterStab), and once more after
// multiplying by the type-effectiveness multiplier (the final damage).
// Never floor before the "+ 2", never apply STAB before the random factor,
// and never apply type effectiveness before STAB — Base Damage -> Random
// -> STAB -> Type Effectiveness -> Final Damage, exactly in that order.
// The one exception is a 0x (immune) effectiveness result: that always
// forces exactly 0 final damage, bypassing the "at least 1" floor entirely
// (see the Phase 5D note below) — no other stage is ever skipped.
//
// Supported categories: "physical" (Attack/Defense) and "special" (Special
// Attack/Special Defense). "status" moves never reach the formula — they
// return a non-damaging result. Speed and HP are never read.
//
// Phase 5C — STAB (Same Type Attack Bonus): if the move's type
// (moveType) matches ANY of the attacker's own types (attackerTypes,
// 1 for single-type Pokémon, 2 for dual-type), the result is multiplied by
// the modern 1.5x multiplier exactly once — a match on a second type (or a
// duplicate type entry) never re-applies it (see computeStabApplied
// below). Both moveType and attackerTypes are optional: omitting either
// one simply means "cannot determine STAB," which resolves to no bonus
// rather than an error, so every pre-Phase-5C caller keeps working
// unchanged.
//
// Phase 5D — Type Effectiveness: moveType vs. defenderTypes (1 or 2) is
// looked up in the canonical Type Chart (type-chart.ts) and every matching
// defender type's multiplier is stacked multiplicatively (Fire vs.
// Grass/Steel = 2*2 = 4; Water vs. Dragon/Water = 0.5*0.5 = 0.25). Just
// like STAB, moveType/defenderTypes are optional and independent of every
// other field — omitting either resolves to a neutral 1x/"normal" rather
// than an error, so every pre-Phase-5D caller keeps working unchanged. A
// 0x (immune) result always yields exactly 0 final damage — the "deal at
// least 1 damage" rule never overrides a genuine immunity. Effectiveness
// is computed and applied entirely inside this file; nothing outside the
// Damage Engine ever calculates it (see calculateTypeEffectiveness in
// type-chart.ts, the one canonical Type Chart for the whole project).
//
// Intentionally excluded this phase (see AGENTS/phase spec — not a bug):
// critical hits, accuracy/evasion, status effects, multi-hit, fixed-damage
// moves (Seismic Toss/Sonic Boom-style), OHKO, recoil, drain, weather,
// abilities (including Adaptability), Terastalization, held items,
// screens, PP. A physical/special move with null/undefined/0 power (e.g.
// Seismic Toss) deliberately falls through to the same non-damaging
// result as a status move rather than being special-cased here.
//
// Wired into live battles since Phase 5B.2 (the player's own attack only —
// see features/battle/utils/battle-damage-rules.ts's resolveAttackDamage
// and features/battle/services/battle-action.service.ts).

export const MIN_DAMAGE_RANDOM_FACTOR = 0.85;
export const MAX_DAMAGE_RANDOM_FACTOR = 1.0;

// The modern (Gen 6+) Same Type Attack Bonus. Never abilities-adjusted
// (Adaptability), never Terastal-adjusted — the one standard multiplier,
// applied at most once per hit (see computeStabApplied below).
export const STAB_MULTIPLIER = 1.5;

const LEVEL_MULTIPLIER = 2;
const LEVEL_DIVISOR = 5;
const LEVEL_OFFSET = 2;
const DAMAGE_DIVISOR = 50;
const DAMAGE_OFFSET = 2;
const MIN_DAMAGING_RESULT = 1;

function statsForCategory(category: DamagingMoveCategory): {
  offensiveStat: OffensiveStatKind;
  defensiveStat: DefensiveStatKind;
} {
  return category === "physical"
    ? { offensiveStat: "attack", defensiveStat: "defense" }
    : { offensiveStat: "specialAttack", defensiveStat: "specialDefense" };
}

// The formula in isolation, exported separately so its rounding order can be
// asserted directly against hand-computed numbers in tests without also
// exercising validation/category routing.
export function calculateBaseDamage(level: number, power: number, attackStat: number, defenseStat: number): number {
  const levelFactor = (LEVEL_MULTIPLIER * level) / LEVEL_DIVISOR + LEVEL_OFFSET;
  const raw = (levelFactor * power * attackStat) / defenseStat;

  return Math.floor(raw / DAMAGE_DIVISOR + DAMAGE_OFFSET);
}

function validateLevelAndRandomFactor(level: number, randomFactor: number): void {
  if (!Number.isInteger(level) || level <= 0) {
    throw new DamageValidationError(`level must be a positive integer, got ${level}`);
  }

  if (
    !Number.isFinite(randomFactor) ||
    randomFactor < MIN_DAMAGE_RANDOM_FACTOR ||
    randomFactor > MAX_DAMAGE_RANDOM_FACTOR
  ) {
    throw new DamageValidationError(
      `randomFactor must be between ${MIN_DAMAGE_RANDOM_FACTOR} and ${MAX_DAMAGE_RANDOM_FACTOR}, got ${randomFactor}`
    );
  }
}

function validateDamagingStat(label: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new DamageValidationError(`${label} must be a positive number, got ${value}`);
  }
}

// True if the move's type matches ANY of the attacker's types. A dual-type
// attacker matching on either type still returns true exactly once — this
// is a boolean gate, not a per-matching-type multiplier, so a duplicate
// type entry (or matching on both types at once, which can't happen since
// a move only has one type) can never apply STAB twice. Missing/undefined
// inputs (a caller that hasn't supplied Phase 5C data) always resolve to
// false — no bonus, never a guess.
function computeStabApplied(moveType: MoveType | undefined, attackerTypes: readonly MoveType[] | undefined): boolean {
  if (!moveType || !attackerTypes) return false;
  return attackerTypes.includes(moveType);
}

// Pure: same input always produces the same output, no I/O, no registry
// lookup (see move-damage-query.ts for the moveId-resolving adapter).
export function calculateMoveDamage(input: CalculateMoveDamageInput): CalculateMoveDamageResult {
  validateLevelAndRandomFactor(input.level, input.randomFactor);

  if (input.moveCategory === "status") {
    return { kind: "non-damaging", damage: 0, reason: "status-move" };
  }

  if (input.moveCategory !== "physical" && input.moveCategory !== "special") {
    throw new DamageValidationError(`unsupported move category "${input.moveCategory as string}"`);
  }

  if (input.movePower === null || input.movePower === undefined || input.movePower === 0) {
    return { kind: "non-damaging", damage: 0, reason: "missing-power" };
  }

  const category = input.moveCategory;
  const { offensiveStat, defensiveStat } = statsForCategory(category);
  const attackStat = input.attackerStats[offensiveStat];
  const defenseStat = input.defenderStats[defensiveStat];

  validateDamagingStat(offensiveStat, attackStat);
  validateDamagingStat(defensiveStat, defenseStat);

  const baseDamage = calculateBaseDamage(input.level, input.movePower, attackStat, defenseStat);
  const afterRandom = Math.floor(baseDamage * input.randomFactor);

  const stabApplied = computeStabApplied(input.moveType, input.attackerTypes);
  const afterStab = stabApplied ? Math.floor(afterRandom * STAB_MULTIPLIER) : afterRandom;

  // Phase 5D: both moveType and defenderTypes must be supplied to look up
  // the Type Chart — otherwise (a pre-Phase-5D caller) this is a neutral
  // 1x/"normal" no-op, exactly like STAB's own missing-data default above.
  const { multiplier: effectivenessMultiplier, result: effectivenessResult } =
    input.moveType !== undefined && input.defenderTypes !== undefined
      ? calculateTypeEffectiveness(input.moveType, input.defenderTypes)
      : { multiplier: 1, result: "normal" as const };

  const afterEffectiveness = Math.floor(afterStab * effectivenessMultiplier);

  // A genuine immunity (0x) always yields exactly 0 damage — the "deal at
  // least 1" floor below is never allowed to override it.
  const damage = effectivenessMultiplier === 0 ? 0 : Math.max(MIN_DAMAGING_RESULT, afterEffectiveness);

  return {
    kind: "damage",
    damage,
    baseDamage,
    randomFactor: input.randomFactor,
    category,
    offensiveStat,
    defensiveStat,
    stabApplied,
    effectivenessMultiplier,
    effectivenessResult,
  };
}
