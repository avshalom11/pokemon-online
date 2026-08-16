import { CHEST_DROP_CHANCE, CHEST_TYPE_DROP_WEIGHTS } from "@/features/chests/data/chest-drop-config";
import type { ChestTypeId } from "@/features/chests/data/chest-definitions";

// Pure randomness only — no DB, no "server-only" (same reasoning
// features/eggs/services/egg-drop-roll.service.ts's own doc comment
// already gives: kept framework-free so a test can call these directly
// with a literal roll, never stubbing Math.random globally). Production
// callers (battle-session.service.ts's syncWildHp) never pass `random`,
// so this falls back to Math.random.
//
// A raw [0, 1) float roll compared with `<` — P(roll < CHEST_DROP_CHANCE)
// is exactly CHEST_DROP_CHANCE for a uniform [0, 1) roll. No pity counter,
// no streak tracking anywhere in this module or its caller — every call is
// a fully independent roll, entirely separate from the Egg drop system's
// own rollEggDrop (a different roll, a different random() call, never
// gating or being gated by each other).
export function rollChestDrop(random: () => number = Math.random): boolean {
  return random() < CHEST_DROP_CHANCE;
}

// Only ever meaningful once rollChestDrop above has already returned true
// — callers must not call this unconditionally. Walks
// CHEST_TYPE_DROP_WEIGHTS (chest-drop-config.ts) in its own declared
// silver -> gold -> diamond order, accumulating cumulative probability
// mass and returning the first band the roll falls under — identical
// shape to rollEggRarity (egg-drop-roll.service.ts). The final entry
// (diamond) is never compared against an upper bound at all — whatever
// roll wasn't claimed by an earlier, narrower band falls through to it —
// so this always returns a valid chest type even if floating-point
// summation makes the nominal 1.0 total land a hair under or over.
export function rollChestType(random: () => number = Math.random): ChestTypeId {
  const roll = random();
  const entries = Object.entries(CHEST_TYPE_DROP_WEIGHTS) as [ChestTypeId, number][];

  let cumulative = 0;
  for (const [chestTypeId, weight] of entries.slice(0, -1)) {
    cumulative += weight;
    if (roll < cumulative) return chestTypeId;
  }

  return entries[entries.length - 1][0];
}
