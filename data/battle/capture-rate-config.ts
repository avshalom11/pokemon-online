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
// data/pokemon/pokemon-evolutions.ts's isEvolutionItemId already uses.
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

// Every NON-legendary rarity, unchanged from before the LEGENDARY CAPTURE
// CHANCES task — rarity -> HP bracket -> ball -> capture chance (0-1, a
// plain probability, never a multiplier). "legendary" is deliberately
// EXCLUDED from this Record (see LEGENDARY_CAPTURE_RATE_CURVE below for
// why) — Exclude<PokemonRarity, "legendary"> still gives the same
// compile-time exhaustiveness guarantee for every OTHER rarity that a
// future addition to PokemonRarity (or HpBracket/CaptureBallId) is a
// compile error here until this table is updated to match.
export const CAPTURE_RATE_TABLE: Record<Exclude<PokemonRarity, "legendary">, CaptureRateByBracket> = {
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
};

// LEGENDARY CAPTURE CHANCES — legendary is the one rarity that does NOT use
// the discrete-bracket lookup above. Instead this is a curve of anchor
// points at exact HP percentages (100/75/50/25/0), and engine/battle/
// capture.ts's own getLegendaryCaptureChance SMOOTHLY (linearly)
// interpolates between the two anchors surrounding the wild Pokémon's
// actual, continuous HP percentage — so e.g. 60% HP lands strictly between
// the 75% and 50% rows, rather than snapping to one bracket the way every
// other rarity still does. 0 stands in for "Near 0%" (the table's own
// bottom row) — an HP percentage never truly reaches exactly 0 while still
// catchable (that Pokémon would be defeated instead), so this is the limit
// the curve approaches, not a state ever actually queried at hpPercent < 0.
//
// Values are this task's own exact table, converted from percent to a 0-1
// probability (e.g. "0.2%" -> 0.002):
//   HP%   Poké Ball  Great Ball  Ultra Ball
//   100    0.2%       0.5%        1%
//    75    0.4%       1%          2%
//    50    0.8%       2%          3%
//    25    1.2%       3.5%        5%
//     0    2%         5%          7%
// Master Ball is unaffected (still guarantees capture, entirely outside
// this table — see capture.service.ts).
export type LegendaryHpAnchor = 100 | 75 | 50 | 25 | 0;

export const LEGENDARY_CAPTURE_RATE_CURVE: Record<LegendaryHpAnchor, CaptureRateByBall> = {
  100: { "poke-ball": 0.002, "great-ball": 0.005, "ultra-ball": 0.01 },
  75: { "poke-ball": 0.004, "great-ball": 0.01, "ultra-ball": 0.02 },
  50: { "poke-ball": 0.008, "great-ball": 0.02, "ultra-ball": 0.03 },
  25: { "poke-ball": 0.012, "great-ball": 0.035, "ultra-ball": 0.05 },
  0: { "poke-ball": 0.02, "great-ball": 0.05, "ultra-ball": 0.07 },
};
