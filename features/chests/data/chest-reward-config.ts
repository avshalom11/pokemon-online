import type { ChestTypeId } from "@/features/chests/data/chest-definitions";
import type { OptionalChestRewardCategory } from "@/features/chests/types/chest-reward.types";
import type { PokemonRarity } from "@/shared/types/pokemon";

// One weighted rarity band, walked as cumulative probability in
// declaration order — same convention EGG_RARITY_DROP_WEIGHTS
// (features/eggs/data/egg-drop-config.ts) already establishes for the
// battle-drop system, just per-CHEST-tier here instead of one single
// global table. A single-entry table (Diamond's) is valid and always
// resolves to that one entry, unconditionally.
export type WeightedRarityTable = readonly (readonly [PokemonRarity, number])[];

// Inclusive integer bounds — every quantity/currency-amount roll in this
// feature uses [min, max] inclusive on both ends (the spec's own explicit
// requirement).
export interface IntRange {
  min: number;
  max: number;
}

// CHESTS PHASE 2 — the one source of truth for a chest tier's own reward
// RULES (never the roll logic itself — see chest-reward-roll.service.ts,
// which is driven entirely by this data). Deliberately does NOT include
// the optional categories' own item ids/quantity ranges: those differ in
// SHAPE per category (a currency amount vs. an item bundle vs. an
// incubator type vs. several evolution items), so they live as per-tier
// builder FUNCTIONS in the roll service instead, not as data here — this
// config only ever holds the tier-level RULES (egg weights, currency
// ranges, which categories are eligible, how many are mandatory, the
// bonus cap) that are genuinely uniform data.
export interface ChestRewardConfig {
  eggWeights: WeightedRarityTable;
  moneyRange: IntRange;
  goldRange: IntRange;
  // The full pool of optional categories eligible for THIS chest tier —
  // "evolution-item" is deliberately absent from Silver's own pool (never
  // available in Silver Chest, per the spec's own explicit rule).
  optionalCategories: readonly OptionalChestRewardCategory[];
  // How many of optionalCategories are chosen uniformly, WITHOUT
  // replacement, as MANDATORY extras before any bonus roll — 0 for Silver
  // (no mandatory extras at all), 1 for Gold, 2 for Diamond.
  mandatoryExtraCount: number;
  // The cap on how many of the REMAINING (non-mandatory-extra) categories
  // may be awarded via their own independent 50% bonus roll — 2 for
  // Silver, 3 for Gold, null (uncapped — every remaining category may
  // independently pass, with no "choose N of the successes" step at all)
  // for Diamond.
  bonusCap: number | null;
  // MEGA EVOLUTION PHASE 5 — the dedicated, independent Mega Stone roll's
  // own chance, entirely separate from optionalCategories/
  // mandatoryExtraCount/bonusCap above (mega-stone is never part of that
  // pool — see chest-reward.types.ts's own ChestRewardCategory doc
  // comment). Rolled LAST, strictly after every category above has already
  // been resolved (chest-reward-roll.service.ts's own rollChestReward) —
  // this field's presence/absence changes nothing about any earlier roll's
  // own random() call. Undefined (Silver) means "never rolled at all," not
  // "rolled but always 0%" — Silver consumes zero extra random() calls for
  // this, same as it would for a category it doesn't offer.
  megaStoneChance?: number;
}

export const SILVER_CHEST_REWARD_CONFIG: ChestRewardConfig = {
  eggWeights: [
    ["common", 0.8],
    ["rare", 0.2],
  ],
  moneyRange: { min: 500, max: 1500 },
  goldRange: { min: 1, max: 5 },
  optionalCategories: ["poke-balls", "potions", "revive", "incubator"],
  mandatoryExtraCount: 0,
  bonusCap: 2,
  // MEGA EVOLUTION PHASE 5 — 0% Mega Stone: megaStoneChance deliberately
  // left unset rather than `megaStoneChance: 0`, so Silver skips that roll
  // entirely (zero extra random() calls) instead of always-failing one.
};

export const GOLD_CHEST_REWARD_CONFIG: ChestRewardConfig = {
  eggWeights: [
    ["rare", 0.8],
    ["very-rare", 0.2],
  ],
  moneyRange: { min: 2000, max: 5000 },
  goldRange: { min: 15, max: 30 },
  optionalCategories: ["poke-balls", "potions", "revive", "evolution-item", "incubator"],
  mandatoryExtraCount: 1,
  bonusCap: 3,
  // MEGA EVOLUTION PHASE 5 — 10% independent chance at 1 Mega Stone.
  megaStoneChance: 0.1,
};

export const DIAMOND_CHEST_REWARD_CONFIG: ChestRewardConfig = {
  // A single-entry table — always "legendary", unconditionally (100%, per
  // the spec) — see WeightedRarityTable's own doc comment.
  eggWeights: [["legendary", 1]],
  moneyRange: { min: 7500, max: 10000 },
  goldRange: { min: 50, max: 90 },
  optionalCategories: ["poke-balls", "potions", "revive", "evolution-item", "incubator"],
  mandatoryExtraCount: 2,
  bonusCap: null,
  // MEGA EVOLUTION PHASE 5 — 20% independent chance at 1 Mega Stone.
  megaStoneChance: 0.2,
};

export const CHEST_REWARD_CONFIGS: Record<ChestTypeId, ChestRewardConfig> = {
  silver: SILVER_CHEST_REWARD_CONFIG,
  gold: GOLD_CHEST_REWARD_CONFIG,
  diamond: DIAMOND_CHEST_REWARD_CONFIG,
};
