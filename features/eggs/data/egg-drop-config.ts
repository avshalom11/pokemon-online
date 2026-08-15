import type { PokemonRarity } from "@/shared/types/pokemon";

// EGGS PHASE 2 — Field Battle Egg Drops. The one source of truth for both
// probabilities below — never duplicated in features/eggs/services or any
// future UI. Both are read only by features/eggs/services/
// egg-drop-roll.service.ts's pure roll functions.

// Chance a single confirmed field-battle victory drops an egg. No pity
// counter, no guaranteed drop, no accumulation across battles — every
// victory is an independent 0.25% roll (see rollEggDrop's own doc comment
// for why nothing here tracks a streak).
export const EGG_DROP_CHANCE = 0.0025;

// Rarity distribution for a drop that already succeeded — sums to exactly
// 1. Declared in this exact order (common -> legendary) because
// rollEggRarity (egg-drop-roll.service.ts) walks it as cumulative
// probability bands in insertion order.
export const EGG_RARITY_DROP_WEIGHTS: Record<PokemonRarity, number> = {
  common: 0.7,
  rare: 0.2,
  "very-rare": 0.08,
  legendary: 0.02,
};
