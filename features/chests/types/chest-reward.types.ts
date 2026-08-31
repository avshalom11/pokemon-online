import type { EvolutionItemId } from "@/data/pokemon/pokemon-evolutions";
import type { IncubatorTypeId } from "@/features/eggs/data/incubator-definitions";
import type { PokemonRarity } from "@/shared/types/pokemon";

// CHESTS PHASE 2 — every reward category a chest opening can ever produce.
// "egg" | "money" | "gold" are the 3 mandatory categories (CORE RULE) —
// every chest opening's result always contains exactly one of each. The
// rest are OPTIONAL: a chest tier's own config decides how many of these
// (if any) are chosen as further mandatory extras, and how many more may
// additionally pass an independent bonus roll — see chest-reward-config.ts
// and chest-reward-roll.service.ts.
export type OptionalChestRewardCategory = "poke-balls" | "potions" | "revive" | "evolution-item" | "incubator";
// MEGA EVOLUTION PHASE 5 — "mega-stone" is deliberately NOT part of
// OptionalChestRewardCategory: it never participates in the mandatory-
// extra/bonus-cap POOL mechanism those categories share (chest-reward-
// config.ts's own mandatoryExtraCount/bonusCap, chest-reward-roll.
// service.ts's own rollBonusCategories). It's a wholly separate,
// independently-rolled category — same "outside the pool, its own rule"
// shape "egg"/"money"/"gold" already have, just optional per tier (0% on
// Silver) rather than always-100%.
export type ChestRewardCategory = "egg" | "money" | "gold" | "mega-stone" | OptionalChestRewardCategory;

// The egg reward never carries a region — CHESTS PHASE 2 is pure reward
// SELECTION only; the player's CURRENT region is read (and stamped onto
// the real PlayerOwnedEgg row) only when a chest is actually opened
// (a later phase), the exact same "region at the moment of
// acquisition/opening, never baked into the reward roll itself" rule
// egg-shop-purchase.service.ts's own purchaseEggShopItem already follows
// for Shop-bought eggs.
export interface EggChestReward {
  category: "egg";
  rarity: PokemonRarity;
}

// Money and Gold share the same SHAPE — both are a plain, always-positive
// integer amount in their own currency, rolled uniformly over an inclusive
// [min, max] range (see IntRange, chest-reward-config.ts) — but are kept
// as two separate interfaces (never one `category: "money" | "gold"`
// union field) so `category` stays a true per-member discriminant:
// `Extract<ChestRewardResult, { category: "money" }>` only narrows
// correctly when each category tag maps to exactly one distinct member
// type. Deliberately its own pair of types rather than reusing
// features/currency's own CurrencyReward (which carries a `dropChance`
// concept this feature has no use for: both of these are always granted,
// 100% of the time, whenever a chest is opened — only the ROLLED AMOUNT is
// randomized, never whether the category appears at all).
export interface MoneyChestReward {
  category: "money";
  amount: number;
}

export interface GoldChestReward {
  category: "gold";
  amount: number;
}

// A bundle reward: ONE existing Shop item id plus a quantity — a bundle
// like "Great Ball ×6" is still exactly ONE reward category, per the
// spec's own "a bundle counts as one reward category" rule (CORE RULE).
// itemId always resolves against the real, existing Shop catalog
// (features/shop/data/shop-items.ts) — never an invented id.
export interface ItemBundleChestReward {
  category: "poke-balls" | "potions" | "revive";
  itemId: string;
  quantity: number;
}

// incubatorTypeId always resolves against the real, existing incubator
// catalog (features/eggs/data/incubator-definitions.ts) — never a new
// incubator concept invented for chests. Always quantity 1 (every tier's
// own incubator reward is a single unit — see chest-reward-config.ts's own
// per-tier builders), so no separate quantity field is carried here.
export interface IncubatorChestReward {
  category: "incubator";
  incubatorTypeId: IncubatorTypeId;
}

// One or more DISTINCT existing evolution items (features/evolution/
// services/evolution-item-catalog.ts's own canonical 16-item catalog,
// reused as-is — see chest-reward-roll.service.ts's own doc comment on
// why no separate chest-specific list was created). Gold always produces
// exactly 1 entry; Diamond produces 2 or 3.
export interface EvolutionItemChestReward {
  category: "evolution-item";
  items: readonly { itemId: EvolutionItemId; quantity: number }[];
}

// MEGA EVOLUTION PHASE 5 — a dedicated, independent extra roll (chest-
// reward-config.ts's own ChestRewardConfig.megaStoneChance, rolled last in
// chest-reward-roll.service.ts's own rollChestReward, strictly AFTER every
// existing roll) — never part of the generic evolution-item pool
// (EVOLUTION_ITEM_CATALOG in chest-reward-roll.service.ts deliberately
// excludes "mega-stone", a Phase 2 exclusion this phase keeps unchanged).
// Always exactly 1 unit when it appears at all — this reward either doesn't
// exist in the result array (roll failed, or the tier has no chance at
// all), or exists exactly once with quantity 1; never a range, never more
// than one.
export interface MegaStoneChestReward {
  category: "mega-stone";
  itemId: "mega-stone";
  quantity: 1;
}

export type ChestRewardResult =
  | EggChestReward
  | MoneyChestReward
  | GoldChestReward
  | ItemBundleChestReward
  | IncubatorChestReward
  | EvolutionItemChestReward
  | MegaStoneChestReward;
