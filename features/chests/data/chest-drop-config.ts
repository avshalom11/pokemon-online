import type { ChestTypeId } from "@/features/chests/data/chest-definitions";

// CHESTS PHASE 5 — Field Battle Chest Drops. The one source of truth for
// both probabilities below — never duplicated in features/chests/services
// or any future UI, same "one config module, pure roll functions read it"
// split features/eggs/data/egg-drop-config.ts already establishes for its
// own (entirely independent) battle-drop system.

// Chance a single confirmed field-battle victory drops a chest. No pity
// counter, no guaranteed drop, no accumulation across battles — every
// victory is an independent 0.12% roll, same "no streak tracking" rule
// EGG_DROP_CHANCE's own doc comment establishes for eggs.
export const CHEST_DROP_CHANCE = 0.0012;

// Chest-type distribution for a drop that already succeeded — sums to
// exactly 1. Declared in this exact order (silver -> gold -> diamond)
// because rollChestType (chest-drop-roll.service.ts) walks it as
// cumulative probability bands in insertion order, same convention
// rollEggRarity already uses for EGG_RARITY_DROP_WEIGHTS.
export const CHEST_TYPE_DROP_WEIGHTS: Record<ChestTypeId, number> = {
  silver: 0.55,
  gold: 0.35,
  diamond: 0.1,
};
