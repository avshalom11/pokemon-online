import { CAPTURE_RATE_TABLE, type CaptureBallId, type HpBracket } from "@/data/battle/capture-rate-config";
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

// The exact 0-1 probability. capture.service.ts's own server-side attempt
// only ever branches on rollCapture's boolean result below — but the Field
// Battle Bag's live percent display (lib/battle/ballCaptureDisplay.ts) reads
// this same function directly, so the number shown to the player can never
// drift from the number a real throw is actually rolled against.
export function calculateCaptureChance({ currentHp, maxHp, rarity }: CaptureChanceParams, ballId: CaptureBallId): number {
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
