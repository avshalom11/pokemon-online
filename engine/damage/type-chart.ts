import { DamageValidationError } from "./damage-errors.ts";
import type { MoveType } from "../moves/index.ts";

// Phase 5D — the ONE canonical Pokémon Type Chart. Every type-effectiveness
// lookup in the live game goes through TYPE_CHART/calculateTypeEffectiveness
// below — no other effectiveness table exists or may be added anywhere else
// in the project. Deliberately independent of the pre-existing, disconnected
// data/battle/type-chart.ts + engine/battle/type-effectiveness.ts pair,
// which is used only by the old, unwired engine/battle/damage-calculation.ts
// and is left completely untouched by this phase (same rule Phase 5B.1
// already established for battle-engine.ts/battle-ai.ts/accuracy.ts/
// turn-order.ts/data/moves/move-data.ts).
//
// `TYPE_CHART` is a `Record<MoveType, TypeMatchups>` — a TS *total* map, so
// the compiler itself refuses to compile if even one of the 18 canonical
// types is missing an entry. That's the primary "every registered type
// must exist in the chart" guarantee; assertKnownType below is the runtime
// backstop for a value that claims to be a MoveType but isn't actually one
// of the chart's keys (see calculateTypeEffectiveness).

export interface TypeMatchups {
  superEffectiveAgainst: readonly MoveType[];
  notEffectiveAgainst: readonly MoveType[];
  noEffectAgainst: readonly MoveType[];
}

// Modern (Gen 6+) type chart — the same matchups used everywhere else a
// "current" Pokémon ruleset is assumed in this project (e.g. Fairy exists,
// Steel resists Poison, Ghost/Dark interactions are post-Gen-2).
export const TYPE_CHART: Readonly<Record<MoveType, TypeMatchups>> = {
  normal: {
    superEffectiveAgainst: [],
    notEffectiveAgainst: ["rock", "steel"],
    noEffectAgainst: ["ghost"],
  },
  fire: {
    superEffectiveAgainst: ["grass", "ice", "bug", "steel"],
    notEffectiveAgainst: ["fire", "water", "rock", "dragon"],
    noEffectAgainst: [],
  },
  water: {
    superEffectiveAgainst: ["fire", "ground", "rock"],
    notEffectiveAgainst: ["water", "grass", "dragon"],
    noEffectAgainst: [],
  },
  electric: {
    superEffectiveAgainst: ["water", "flying"],
    notEffectiveAgainst: ["electric", "grass", "dragon"],
    noEffectAgainst: ["ground"],
  },
  grass: {
    superEffectiveAgainst: ["water", "ground", "rock"],
    notEffectiveAgainst: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
    noEffectAgainst: [],
  },
  ice: {
    superEffectiveAgainst: ["grass", "ground", "flying", "dragon"],
    notEffectiveAgainst: ["fire", "water", "ice", "steel"],
    noEffectAgainst: [],
  },
  fighting: {
    superEffectiveAgainst: ["normal", "ice", "rock", "dark", "steel"],
    notEffectiveAgainst: ["poison", "flying", "psychic", "bug", "fairy"],
    noEffectAgainst: ["ghost"],
  },
  poison: {
    superEffectiveAgainst: ["grass", "fairy"],
    notEffectiveAgainst: ["poison", "ground", "rock", "ghost"],
    noEffectAgainst: ["steel"],
  },
  ground: {
    superEffectiveAgainst: ["fire", "electric", "poison", "rock", "steel"],
    notEffectiveAgainst: ["grass", "bug"],
    noEffectAgainst: ["flying"],
  },
  flying: {
    superEffectiveAgainst: ["grass", "fighting", "bug"],
    notEffectiveAgainst: ["electric", "rock", "steel"],
    noEffectAgainst: [],
  },
  psychic: {
    superEffectiveAgainst: ["fighting", "poison"],
    notEffectiveAgainst: ["psychic", "steel"],
    noEffectAgainst: ["dark"],
  },
  bug: {
    superEffectiveAgainst: ["grass", "psychic", "dark"],
    notEffectiveAgainst: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
    noEffectAgainst: [],
  },
  rock: {
    superEffectiveAgainst: ["fire", "ice", "flying", "bug"],
    notEffectiveAgainst: ["fighting", "ground", "steel"],
    noEffectAgainst: [],
  },
  ghost: {
    superEffectiveAgainst: ["psychic", "ghost"],
    notEffectiveAgainst: ["dark"],
    noEffectAgainst: ["normal"],
  },
  dragon: {
    superEffectiveAgainst: ["dragon"],
    notEffectiveAgainst: ["steel"],
    noEffectAgainst: ["fairy"],
  },
  dark: {
    superEffectiveAgainst: ["psychic", "ghost"],
    notEffectiveAgainst: ["fighting", "dark", "fairy"],
    noEffectAgainst: [],
  },
  steel: {
    superEffectiveAgainst: ["ice", "rock", "fairy"],
    notEffectiveAgainst: ["steel", "fire", "water", "electric"],
    noEffectAgainst: [],
  },
  fairy: {
    superEffectiveAgainst: ["fighting", "dragon", "dark"],
    notEffectiveAgainst: ["fire", "poison", "steel"],
    noEffectAgainst: [],
  },
};

export type EffectivenessResult = "super-effective" | "not-very-effective" | "immune" | "normal";

export interface TypeEffectiveness {
  multiplier: number;
  result: EffectivenessResult;
}

// Runtime backstop for "unknown types must fail loudly, never silently
// assume Normal" — every real caller is already statically typed as
// MoveType (a closed union matching PokemonType's own 18 members exactly),
// so this only ever fires for a value that bypassed TypeScript entirely.
function assertKnownType(type: MoveType): void {
  if (!(type in TYPE_CHART)) {
    throw new DamageValidationError(`unknown Pokémon type "${String(type)}" — not present in the canonical type chart`);
  }
}

function getSingleTypeMultiplier(attackType: MoveType, defenderType: MoveType): number {
  const matchups = TYPE_CHART[attackType];

  if (matchups.noEffectAgainst.includes(defenderType)) return 0;
  if (matchups.superEffectiveAgainst.includes(defenderType)) return 2;
  if (matchups.notEffectiveAgainst.includes(defenderType)) return 0.5;
  return 1;
}

function classifyMultiplier(multiplier: number): EffectivenessResult {
  if (multiplier === 0) return "immune";
  if (multiplier > 1) return "super-effective";
  if (multiplier < 1) return "not-very-effective";
  return "normal";
}

// Dual-type defenders stack multiplicatively, one factor per defender type
// (Fire vs. Grass/Steel = 2 * 2 = 4; Water vs. Dragon/Water = 0.5 * 0.5 =
// 0.25). An empty defenderTypes list reduces to the identity (1, "normal")
// — this is what a caller that hasn't supplied Phase 5D data gets by
// omitting the field entirely one level up (see damage-calculation.ts).
export function calculateTypeEffectiveness(moveType: MoveType, defenderTypes: readonly MoveType[]): TypeEffectiveness {
  assertKnownType(moveType);
  defenderTypes.forEach(assertKnownType);

  const multiplier = defenderTypes.reduce(
    (acc, defenderType) => acc * getSingleTypeMultiplier(moveType, defenderType),
    1
  );

  return { multiplier, result: classifyMultiplier(multiplier) };
}
