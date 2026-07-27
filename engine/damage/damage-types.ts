import type { MoveCategory, MoveType } from "../moves/index.ts";
import type { EffectivenessResult } from "./type-chart.ts";

// Public type surface for the Phase 5B.1 pure damage engine. See
// damage-calculation.ts for the formula this input/output shape feeds.

// The two move categories that actually deal damage via the base formula.
// "status" is a valid MoveCategory but never reaches the formula — see
// NonDamagingReason below.
export type DamagingMoveCategory = Extract<MoveCategory, "physical" | "special">;

export type OffensiveStatKind = "attack" | "specialAttack";
export type DefensiveStatKind = "defense" | "specialDefense";

// Only the stats the formula can ever select between — never HP, never
// Speed, and never a full PokemonStats/Prisma record. Both fields are
// always present because moveCategory (not the caller) decides which one is
// used; see statsForCategory in damage-calculation.ts.
export interface DamageOffensiveStats {
  attack: number;
  specialAttack: number;
}

export interface DamageDefensiveStats {
  defense: number;
  specialDefense: number;
}

export interface CalculateMoveDamageInput {
  level: number;
  moveCategory: MoveCategory;
  // null/undefined/0 all mean "does not use the power formula" — see
  // missing-power handling in calculateMoveDamage.
  movePower: number | null | undefined;
  attackerStats: DamageOffensiveStats;
  defenderStats: DamageDefensiveStats;
  // A single pre-rolled multiplier in [0.85, 1.00]. Production callers get
  // one from rollDamageRandomFactor() (random.ts); tests inject a literal
  // number directly instead of stubbing Math.random.
  randomFactor: number;

  // Phase 5C — STAB (Same Type Attack Bonus) inputs. Both optional and
  // independent of every other field: omitting either one simply means
  // "cannot determine STAB," which resolves to no bonus rather than an
  // error, so every pre-Phase-5C caller/input literal keeps compiling and
  // behaving exactly as before. moveType comes from the current Move
  // Registry (a Move's own `type` field); attackerTypes comes from the
  // current Species Registry (a PokemonSpecies' own `types` field) — never
  // inferred, never defaulted to a guess.
  moveType?: MoveType;
  attackerTypes?: readonly MoveType[];

  // Phase 5D — Type Effectiveness input. defenderTypes comes from the
  // current Species Registry (a PokemonSpecies' own `types` field) — never
  // legacy Pokémon data. Optional and independent of the STAB fields above:
  // omitting it (or moveType) simply means "cannot determine
  // effectiveness," which resolves to a neutral 1x multiplier rather than
  // an error, so every pre-Phase-5D caller/input literal keeps compiling
  // and behaving exactly as before. When both moveType and defenderTypes
  // ARE supplied, every type in either one must be a real, known Pokémon
  // type — see type-chart.ts's assertKnownType, which fails loudly instead
  // of silently assuming Normal.
  defenderTypes?: readonly MoveType[];
}

export type NonDamagingReason = "status-move" | "missing-power";

export interface DamagingMoveResult {
  kind: "damage";
  damage: number;
  baseDamage: number;
  randomFactor: number;
  category: DamagingMoveCategory;
  offensiveStat: OffensiveStatKind;
  defensiveStat: DefensiveStatKind;
  // Phase 5C: whether the move's type matched one of the attacker's own
  // types and the 1.5x STAB multiplier was applied.
  stabApplied: boolean;
  // Phase 5D: the combined type-effectiveness multiplier actually applied
  // (1 when effectiveness data wasn't supplied) and its categorical label.
  effectivenessMultiplier: number;
  effectivenessResult: EffectivenessResult;
}

export interface NonDamagingMoveResult {
  kind: "non-damaging";
  damage: 0;
  reason: NonDamagingReason;
}

export type CalculateMoveDamageResult = DamagingMoveResult | NonDamagingMoveResult;
