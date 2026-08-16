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
export type ChestRewardCategory = "egg" | "money" | "gold" | OptionalChestRewardCategory;

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

export type ChestRewardResult =
  | EggChestReward
  | MoneyChestReward
  | GoldChestReward
  | ItemBundleChestReward
  | IncubatorChestReward
  | EvolutionItemChestReward;
