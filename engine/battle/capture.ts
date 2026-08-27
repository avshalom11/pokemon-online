import {
  CAPTURE_RATE_TABLE,
  LEGENDARY_CAPTURE_RATE_CURVE,
  type CaptureBallId,
  type HpBracket,
  type LegendaryHpAnchor,
} from "@/data/battle/capture-rate-config";
import type { PokemonRarity } from "@/shared/types/pokemon";

// Capture-rate lookup — reads the canonical CAPTURE_RATE_TABLE
// (data/battle/capture-rate-config.ts) directly; never computes a chance
// from a formula and never hardcodes a percentage here. Master Ball is
// handled entirely outside this module (see capture.service.ts's own
// guaranteed-capture branch, which never calls rollCapture at all) — this
// file only ever covers the three rollable balls (CaptureBallId).

// Determines which HP-percentage bracket a wild Pokémon's remaining HP
// falls into — see HpBracket's own doc comment (data/battle/
// capture-rate-config.ts) for the exact (lowerBound, upperBound] boundary
// rule this implements. Clamped to [0, 100] first so an out-of-range
// currentHp/maxHp pair (never expected, but never trusted either) can't
// fall through without a matching bracket.
export function getHpBracket(currentHp: number, maxHp: number): HpBracket {
  const hpPercent = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;

  if (hpPercent > 75) return "100-75";
  if (hpPercent > 50) return "75-50";
  if (hpPercent > 25) return "50-25";
  if (hpPercent > 10) return "25-10";
  return "10-0";
}

export interface CaptureChanceParams {
  currentHp: number;
  maxHp: number;
  rarity: PokemonRarity;
}

// LEGENDARY CAPTURE CHANCES — the continuous HP percentage (never a
// discrete bracket) legendary's own smooth interpolation is computed
// against. Deliberately a SEPARATE computation from getHpBracket above,
// not a shared refactor of it — getHpBracket's own bracket-based lookup
// for every other rarity must stay byte-for-byte unchanged.
function getHpPercent(currentHp: number, maxHp: number): number {
  return maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
}

// LEGENDARY CAPTURE CHANCES — linearly interpolates between the two
// LEGENDARY_CAPTURE_RATE_CURVE anchors (data/battle/capture-rate-config.ts)
// surrounding `hpPercent`, rather than snapping to one of them. The four
// anchor pairs are checked from highest to lowest; at a value that sits
// exactly ON a shared boundary (e.g. hpPercent === 75), the first matching
// pair's own interpolation resolves to precisely that anchor's table value
// either way (t lands at 0 or 1), so there is no discontinuity at the
// boundaries themselves.
function getLegendaryCaptureChance(hpPercent: number, ballId: CaptureBallId): number {
  const clamped = Math.max(0, Math.min(100, hpPercent));
  const segments: [LegendaryHpAnchor, LegendaryHpAnchor][] = [
    [100, 75],
    [75, 50],
    [50, 25],
    [25, 0],
  ];

  for (const [upper, lower] of segments) {
    if (clamped <= upper && clamped >= lower) {
      const upperChance = LEGENDARY_CAPTURE_RATE_CURVE[upper][ballId];
      const lowerChance = LEGENDARY_CAPTURE_RATE_CURVE[lower][ballId];
      const t = (upper - clamped) / (upper - lower);
      return upperChance + (lowerChance - upperChance) * t;
    }
  }

  // Unreachable given the clamp above (every value in [0, 100] falls into
  // one of the four segments) — kept only so this function has an explicit
  // total return type instead of an implicit `undefined` escape hatch.
  return LEGENDARY_CAPTURE_RATE_CURVE[0][ballId];
}

// The exact 0-1 probability. capture.service.ts's own server-side attempt
// only ever branches on rollCapture's boolean result below — but the Field
// Battle Bag's live percent display (lib/battle/ballCaptureDisplay.ts) reads
// this same function directly, so the number shown to the player can never
// drift from the number a real throw is actually rolled against.
//
// LEGENDARY CAPTURE CHANCES — legendary is the one rarity branched out
// here into its own smooth-interpolation path (getLegendaryCaptureChance
// above); every other rarity's lookup (bracket -> CAPTURE_RATE_TABLE) is
// completely unchanged from before this task.
export function calculateCaptureChance({ currentHp, maxHp, rarity }: CaptureChanceParams, ballId: CaptureBallId): number {
  if (rarity === "legendary") {
    return getLegendaryCaptureChance(getHpPercent(currentHp, maxHp), ballId);
  }

  const bracket = getHpBracket(currentHp, maxHp);
  return CAPTURE_RATE_TABLE[rarity][bracket][ballId];
}

// The actual RNG roll lives here (not inline at each call site) so every
// (non-Master-Ball) capture attempt in the codebase goes through the same
// random source. Must only ever be called server-side — see
// features/battle/services/capture.service.ts.
export function rollCapture(params: CaptureChanceParams, ballId: CaptureBallId): boolean {
  return Math.random() < calculateCaptureChance(params, ballId);
}
