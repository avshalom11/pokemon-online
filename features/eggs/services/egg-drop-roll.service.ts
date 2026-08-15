import { EGG_DROP_CHANCE, EGG_RARITY_DROP_WEIGHTS } from "@/features/eggs/data/egg-drop-config";
import type { PokemonRarity } from "@/shared/types/pokemon";

// Pure randomness only — no DB, no "server-only" (same reasoning
// engine/damage/random.ts's own roll helpers already follow: kept
// framework-free so a test can call these directly with a literal roll,
// never stubbing Math.random globally). Production callers (battle-session.
// service.ts's syncWildHp) never pass `random`, so this falls back to
// Math.random — the exact same optional-injection seam
// rollDamageRandomFactor/rollAccuracyCheck/rollCriticalHit already
// establish.
//
// A raw [0, 1) float roll compared with `<`, the same convention
// checkCriticalHit (engine/damage/critical.ts) already uses for a small
// probability: P(roll < EGG_DROP_CHANCE) is exactly EGG_DROP_CHANCE for a
// uniform [0, 1) roll. No pity counter, no streak tracking anywhere in this
// module or its caller — every call is a fully independent roll.
export function rollEggDrop(random: () => number = Math.random): boolean {
  return random() < EGG_DROP_CHANCE;
}

// Only ever meaningful once rollEggDrop above has already returned true —
// callers must not call this unconditionally. Walks EGG_RARITY_DROP_WEIGHTS
// (egg-drop-config.ts) in its own declared common -> legendary order,
// accumulating cumulative probability mass and returning the first band the
// roll falls under. The final entry (legendary) is never compared against
// an upper bound at all — whatever roll wasn't claimed by an earlier,
// narrower band falls through to it — so this always returns a valid
// rarity even if floating-point summation makes the nominal 1.0 total land
// a hair under or over.
export function rollEggRarity(random: () => number = Math.random): PokemonRarity {
  const roll = random();
  const entries = Object.entries(EGG_RARITY_DROP_WEIGHTS) as [PokemonRarity, number][];

  let cumulative = 0;
  for (const [rarity, weight] of entries.slice(0, -1)) {
    cumulative += weight;
    if (roll < cumulative) return rarity;
  }

  return entries[entries.length - 1][0];
}
