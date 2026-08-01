import type { PokemonRarity } from "@/shared/types/pokemon";

// TEMPORARY MVP capture formula — deliberately simple and replaceable (no
// ball-type modifiers, status conditions, etc.; see PROJECT_RULES'
// "DO NOT IMPLEMENT YET" list). Keyed off the existing PokemonRarity union
// (shared/types/pokemon.ts) so rarity strings are never duplicated.
//
// Rule: each rarity has a base chance at full HP, which ramps up toward
// MAX_CAPTURE_CHANCE as the wild Pokémon's HP drops — weighted heavily
// (0.7) so "wear it down first" is always the dominant, intuitive strategy
// regardless of rarity. The result is always clamped to a safe
// [MIN, MAX] range so a capture is never guaranteed nor impossible.
const RARITY_BASE_CAPTURE_CHANCE: Record<PokemonRarity, number> = {
  common: 0.6,
  rare: 0.4,
  "very-rare": 0.25,
  legendary: 0.1,
};

const MIN_CAPTURE_CHANCE = 0.05;
const MAX_CAPTURE_CHANCE = 0.95;
const LOW_HP_BONUS_WEIGHT = 0.7;

export interface CaptureChanceParams {
  currentHp: number;
  maxHp: number;
  rarity: PokemonRarity;
}

// Exact chance is intentionally never surfaced to the player — callers
// should only ever branch on rollCapture's boolean result.
//
// ballMultiplier (Great/Ultra Ball) scales the rarity/HP-derived chance
// before the final clamp — applied here, not at each call site, so a ball's
// advantage is still bounded by the same [MIN, MAX] safety range as a
// Poké Ball. Master Ball's guaranteed capture is deliberately NOT modeled
// as a multiplier (no finite multiplier could reach exactly 1.0 through
// this clamp) — see capture.service.ts's own guaranteed-capture branch,
// which bypasses this function entirely for that ball.
export function calculateCaptureChance(
  { currentHp, maxHp, rarity }: CaptureChanceParams,
  ballMultiplier = 1
): number {
  const baseChance = RARITY_BASE_CAPTURE_CHANCE[rarity];
  const missingHpRatio = maxHp > 0 ? 1 - Math.max(0, Math.min(1, currentHp / maxHp)) : 1;

  const chance = baseChance + missingHpRatio * LOW_HP_BONUS_WEIGHT * (MAX_CAPTURE_CHANCE - baseChance);

  return Math.max(MIN_CAPTURE_CHANCE, Math.min(MAX_CAPTURE_CHANCE, chance * ballMultiplier));
}

// The actual RNG roll lives here (not inline at each call site) so every
// capture attempt in the codebase goes through the same random source.
// Must only ever be called server-side — see
// features/battle/services/capture.service.ts.
export function rollCapture(params: CaptureChanceParams, ballMultiplier = 1): boolean {
  return Math.random() < calculateCaptureChance(params, ballMultiplier);
}
