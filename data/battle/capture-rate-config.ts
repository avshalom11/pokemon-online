import type { PokemonRarity } from "@/shared/types/pokemon";

// The ONE place every capture percentage is defined — engine/battle/
// capture.ts reads this table and never hardcodes a chance itself, same
// "data/ holds the tunable numbers, engine/ holds the algorithm" split
// data/battle/type-chart.ts and data/encounter/rarity-config.ts already
// establish. Change a number here to rebalance capture; nothing else needs
// to change.
//
// Every catalog ball this table covers, by its Shop/Inventory itemId
// (features/shop/data/shop-items.ts) — never a separate id list. Master
// Ball is deliberately absent: it guarantees capture and is never rolled
// against this table at all (see capture.service.ts's own guaranteed-
// capture branch, which bypasses this file entirely).
export type CaptureBallId = "poke-ball" | "great-ball" | "ultra-ball";

const CAPTURE_BALL_IDS: readonly CaptureBallId[] = ["poke-ball", "great-ball", "ultra-ball"];

// Narrows an arbitrary Shop/Inventory itemId to CaptureBallId — the only
// place that narrowing happens, so a non-capture-ball itemId (Master Ball,
// a Potion, a Stone) can never be trusted as a table key. Same idiom
// data/pokemon/pokemon-evolutions.ts's isEvolutionStoneItemId already uses.
export function isCaptureBallId(itemId: string): itemId is CaptureBallId {
  return (CAPTURE_BALL_IDS as readonly string[]).includes(itemId);
}

// Wild HP-percentage brackets. Each is (lowerBound, upperBound] — i.e. a
// value exactly ON a boundary (e.g. exactly 75%) always counts toward the
// LOWER, more-wounded bracket ("75-50", not "100-75") — except the very
// bottom bracket, which is inclusive on both ends ([0, 10]). This is what
// getHpBracket (engine/battle/capture.ts) implements, and is the one rule
// that makes every possible HP value belong to exactly one bracket, never
// zero or two.
export type HpBracket = "100-75" | "75-50" | "50-25" | "25-10" | "10-0";

type CaptureRateByBall = Record<CaptureBallId, number>;
type CaptureRateByBracket = Record<HpBracket, CaptureRateByBall>;

// rarity -> HP bracket -> ball -> capture chance (0-1, a plain probability
// — never a multiplier applied on top of some other formula). A Record
// keyed by the full PokemonRarity/HpBracket/CaptureBallId unions, so a
// future addition to any of those three types is a compile error here
// until this table is updated to match — the same exhaustiveness guarantee
// RARITY_PRESENTATION (lib/battle/battleRarityPresentation.ts) already
// relies on for PokemonRarity.
export const CAPTURE_RATE_TABLE: Record<PokemonRarity, CaptureRateByBracket> = {
  common: {
    "100-75": { "poke-ball": 0.3, "great-ball": 0.6, "ultra-ball": 0.9 },
    "75-50": { "poke-ball": 0.4, "great-ball": 0.7, "ultra-ball": 0.95 },
    "50-25": { "poke-ball": 0.5, "great-ball": 0.8, "ultra-ball": 0.95 },
    "25-10": { "poke-ball": 0.6, "great-ball": 0.9, "ultra-ball": 0.95 },
    "10-0": { "poke-ball": 0.7, "great-ball": 0.95, "ultra-ball": 0.95 },
  },
  rare: {
    "100-75": { "poke-ball": 0.2, "great-ball": 0.4, "ultra-ball": 0.6 },
    "75-50": { "poke-ball": 0.3, "great-ball": 0.5, "ultra-ball": 0.7 },
    "50-25": { "poke-ball": 0.4, "great-ball": 0.6, "ultra-ball": 0.8 },
    "25-10": { "poke-ball": 0.5, "great-ball": 0.7, "ultra-ball": 0.9 },
    "10-0": { "poke-ball": 0.6, "great-ball": 0.8, "ultra-ball": 0.95 },
  },
  "very-rare": {
    "100-75": { "poke-ball": 0.1, "great-ball": 0.2, "ultra-ball": 0.3 },
    "75-50": { "poke-ball": 0.15, "great-ball": 0.25, "ultra-ball": 0.4 },
    "50-25": { "poke-ball": 0.2, "great-ball": 0.35, "ultra-ball": 0.5 },
    "25-10": { "poke-ball": 0.25, "great-ball": 0.4, "ultra-ball": 0.6 },
    "10-0": { "poke-ball": 0.3, "great-ball": 0.45, "ultra-ball": 0.7 },
  },
  legendary: {
    "100-75": { "poke-ball": 0.01, "great-ball": 0.02, "ultra-ball": 0.03 },
    "75-50": { "poke-ball": 0.02, "great-ball": 0.03, "ultra-ball": 0.04 },
    "50-25": { "poke-ball": 0.03, "great-ball": 0.04, "ultra-ball": 0.05 },
    "25-10": { "poke-ball": 0.04, "great-ball": 0.05, "ultra-ball": 0.06 },
    "10-0": { "poke-ball": 0.08, "great-ball": 0.1, "ultra-ball": 0.14 },
  },
};
