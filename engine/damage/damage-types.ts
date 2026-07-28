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

  // Phase 5E — Accuracy input. accuracy comes from the current Move
  // Registry's own `accuracy` field (an integer 1-100, or null for a move
  // that always hits, e.g. Swift/Bide/Struggle). Omitting the field
  // entirely (every pre-Phase-5E caller/input literal) means "no accuracy
  // check requested," which resolves to an automatic hit — the same
  // missing-data convention moveType/attackerTypes/defenderTypes above
  // already use, so every existing caller keeps compiling and behaving
  // exactly as before. accuracyRoll is a single pre-rolled integer in
  // [0, 99] from rollAccuracyCheck() (random.ts); tests inject a literal
  // integer directly instead of stubbing Math.random. Supplying a numeric
  // accuracy without a paired accuracyRoll also resolves to an automatic
  // hit, since the engine can never roll its own random value — see
  // checkMoveAccuracy's own doc comment in accuracy.ts for the full rule.
  accuracy?: number | null;
  accuracyRoll?: number;

  // Phase 5F — Critical Hit input. There is no per-move data to read here
  // (one single global CRITICAL_HIT_CHANCE — see critical.ts); criticalRoll
  // is a single pre-rolled float in [0, 1) from rollCriticalHit() (random.ts),
  // the same raw Math.random()-shaped contract accuracyRoll and randomFactor
  // are themselves built from. Omitting it entirely (every pre-Phase-5F
  // caller/input literal) means "no critical check requested," which
  // resolves to "never critical" — the same missing-data convention every
  // other optional field above already uses, so every existing caller keeps
  // compiling and behaving exactly as before.
  criticalRoll?: number;

  // Phase 6-cleanup — an already-confirmed hit (multi-hit moves resolve
  // accuracy exactly once for the whole move, then compute each
  // additional hit's damage independently). When true, the accuracy
  // check is skipped entirely and this call always hits — accuracyRoll is
  // ignored in that case (there is nothing to compare it against). False/
  // omitted (every other caller) means "run the normal accuracy check,"
  // exactly as before.
  accuracyAlreadyConfirmed?: boolean;
}

export type NonDamagingReason = "status-move" | "missing-power";

// Phase 5G — Battle Outcome metadata. A UI-facing categorical label for
// "what happened," derived entirely from the effectiveness multiplier
// already computed above (see the mapping in calculateMoveDamage) — never
// its own gameplay decision, and never a string the engine displays. Same
// four categories as EffectivenessResult except "immune" is spelled "none"
// here, since that's the vocabulary the UI/spec for this field uses;
// "super-effective"/"not-very-effective"/"normal" are shared verbatim.
export type BattleEffectiveness = "none" | "not-very-effective" | "normal" | "super-effective";

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
  // Phase 5E: the accuracy check always passed here — a failed check
  // returns MissedMoveResult instead, never this kind (see
  // calculateMoveDamage). accuracy/accuracyRoll are both null when no
  // accuracy data was supplied/resolvable at all (see the input field's own
  // doc comment above); otherwise they're the exact values the hit was
  // decided from.
  hit: true;
  accuracy: number | null;
  accuracyRoll: number | null;
  // Phase 5F: whether the flat 1.5x critical-hit multiplier was applied.
  // Only ever checked (and only ever true) for a hit against a non-immune
  // target — an immune (0x effectiveness) hit always has critical: false
  // and criticalRoll: null, exactly like the missing-data case below.
  // criticalRoll is null when no critical data was supplied/resolvable at
  // all (see the input field's own doc comment above) or the target was
  // immune; otherwise it's the exact value the result was decided from.
  critical: boolean;
  criticalRoll: number | null;
  // Phase 5G: Battle Outcome metadata — the UI-facing mirror of
  // effectivenessResult above (see BattleEffectiveness's own doc comment).
  effectiveness: BattleEffectiveness;
}

export interface NonDamagingMoveResult {
  kind: "non-damaging";
  damage: 0;
  reason: NonDamagingReason;
}

// Phase 5E: a damaging move (physical/special, real power) that failed its
// accuracy check. Deals exactly 0 damage and never reaches STAB, Type
// Effectiveness, or the base damage formula at all — see calculateMoveDamage
// for the exact short-circuit. Kept distinct from NonDamagingMoveResult
// (status-move/missing-power) since those are the move's own permanent
// nature, whereas a miss is a per-attempt outcome that could just as easily
// have hit — see the "hit" test file's own probability tests.
export interface MissedMoveResult {
  kind: "miss";
  damage: 0;
  hit: false;
  accuracy: number;
  accuracyRoll: number;
  // Phase 5G: a miss can never be critical and has no effectiveness to
  // report — always false/"normal" rather than an omitted field, so the UI
  // can read every damaging-attempt result (hit or miss) the same way
  // without a kind-narrowing branch just to find these two fields.
  critical: false;
  effectiveness: "normal";
}

export type CalculateMoveDamageResult = DamagingMoveResult | NonDamagingMoveResult | MissedMoveResult;
