// CHESTS PHASE 2 — the pure chest reward-ROLL engine. Deliberately
// framework-free (no "server-only", no Prisma, no DB of any kind — same
// "pure formula, injectable randomness" convention every other production
// roll in this project already follows: egg-drop-roll.service.ts's
// rollEggRarity, hatch-level.service.ts's rollHatchLevel,
// engine/damage/random.ts's own roll helpers). Produces a describable
// ChestRewardResult[] and nothing else: no PlayerOwnedEgg row, no currency
// grant, no incubator grant, no chest consumption. Those all belong to a
// later Chest phase (opening/granting) — see this phase's own Final
// Report for the exact boundary.
//
// Every existing item/incubator id referenced below was verified against
// the real, existing catalogs before writing this file (features/shop/
// data/shop-items.ts for Poké Balls/Potions/Revive/evolution items,
// features/eggs/data/incubator-definitions.ts for incubators) — nothing
// here invents a substitute id.
import {
  isEvolutionItemId,
  type EvolutionItemId,
} from "@/data/pokemon/pokemon-evolutions";
import {
  CHEST_REWARD_CONFIGS,
  type ChestRewardConfig,
  type WeightedRarityTable,
} from "@/features/chests/data/chest-reward-config";
import type { ChestTypeId } from "@/features/chests/data/chest-definitions";
import type {
  ChestRewardResult,
  EggChestReward,
  ItemBundleChestReward,
  OptionalChestRewardCategory,
} from "@/features/chests/types/chest-reward.types";
import type { IncubatorTypeId } from "@/features/eggs/data/incubator-definitions";
import { SHOP_ITEMS } from "@/features/shop/data/shop-items";

// The existing, canonical evolution-item catalog (features/shop/data/
// shop-items.ts's own "stones" category — the exact same ids
// features/evolution/services/evolution-item-catalog.ts and
// data/pokemon/pokemon-evolutions.ts's own EvolutionItemId type already
// treat as canonical) — reused exactly as-is, never a separate
// chest-specific list. `isEvolutionItemId` (the existing catalog's own
// narrowing guard) is what proves every entry here is real.
export const EVOLUTION_ITEM_CATALOG: readonly EvolutionItemId[] = SHOP_ITEMS.filter(
  (item) => item.categoryId === "stones"
)
  .map((item) => item.id)
  .filter(isEvolutionItemId);

// ============================================================================
// Small, generic, independently-testable randomness primitives — every one
// takes an injected `random: () => number` (never reaches for Math.random
// itself), so a test can control every individual roll deterministically.
// Exported so both the per-category reward builders below AND tests can
// use them directly (verifying e.g. "uniform selection" or "inclusive
// range" in isolation, without needing to trace a full chest roll).
// ============================================================================

// A uniform integer in [min, max], BOTH ends inclusive — the one place
// this shape is computed, same "roll × width, floor, add min" formula
// rollHatchLevel (features/eggs/services/hatch-level.service.ts) already
// establishes for its own inclusive integer range.
export function rollInt(min: number, max: number, random: () => number): number {
  const width = max - min + 1;
  return min + Math.floor(random() * width);
}

// One uniformly-chosen element from `options` — every option equally
// likely (the spec's own "equal category-selection probability" rule).
export function pickUniform<T>(options: readonly T[], random: () => number): T {
  return options[Math.floor(random() * options.length)];
}

// `count` DISTINCT elements chosen uniformly WITHOUT replacement from
// `pool` — the standard "pick a random remaining index, remove it, repeat"
// algorithm: every element of `pool` is equally likely to be picked first,
// and (by induction) every unordered `count`-sized subset of `pool` is
// equally likely to be the final result — this is what makes both "choose
// N mandatory categories uniformly" (CATEGORY SELECTION RULES) and "prefer
// distinct evolution items" (Diamond's own EVOLUTION ITEMS rule) genuinely
// uniform, not merely "roughly random." Consumes exactly `count` calls to
// `random` (or fewer only if `pool` is smaller than `count`, never a
// concern for this feature's own fixed pool sizes).
export function pickDistinctUniform<T>(pool: readonly T[], count: number, random: () => number): T[] {
  const remaining = [...pool];
  const picked: T[] = [];
  for (let i = 0; i < count && remaining.length > 0; i += 1) {
    const index = Math.floor(random() * remaining.length);
    picked.push(remaining[index]);
    remaining.splice(index, 1);
  }
  return picked;
}

export interface WeightedOption<T> {
  weight: number;
  build: (random: () => number) => T;
}

// Picks ONE option by cumulative weight (same "declaration-order cumulative
// walk" convention rollEggRarity/rollEggReward below already use), then
// calls that option's own `build` — which may itself consume further
// `random` calls (e.g. rolling a quantity range) — so this single call can
// consume anywhere from 1 to several `random` values depending on which
// branch is selected. Used for every "equal probability between N options"
// and "internal weights X/Y/Z" rule in the spec (POKÉ BALLS/POTIONS/REVIVE/
// INCUBATOR sections) — one mechanism for both equal and unequal weights.
export function rollWeightedOptions<T>(options: readonly WeightedOption<T>[], random: () => number): T {
  const roll = random();
  let cumulative = 0;
  for (const option of options.slice(0, -1)) {
    cumulative += option.weight;
    if (roll < cumulative) return option.build(random);
  }
  return options[options.length - 1].build(random);
}

// The bonus-category roll (CATEGORY SELECTION RULES / each tier's own
// "after mandatory extras, each remaining category independently has a
// 50% bonus chance" rule): every candidate gets its own independent
// random() < 0.5 check (consuming exactly `candidates.length` calls,
// regardless of outcome). If a `cap` is given and more than `cap`
// candidates pass, exactly `cap` of the passing set are chosen uniformly
// (pickDistinctUniform) rather than simply truncating — so "the FIRST N to
// pass" is never favored over any other successful category. `cap: null`
// means uncapped (Diamond) — every passing candidate is awarded, with no
// extra selection step at all.
export function rollBonusCategories<T>(candidates: readonly T[], cap: number | null, random: () => number): T[] {
  const passed: T[] = [];
  for (const candidate of candidates) {
    if (random() < 0.5) passed.push(candidate);
  }
  if (cap === null || passed.length <= cap) return passed;
  return pickDistinctUniform(passed, cap, random);
}

// The egg reward's own rarity roll — identical cumulative-walk shape to
// rollEggRarity (features/eggs/services/egg-drop-roll.service.ts), just
// parameterized by a per-CHEST-tier weight table instead of the one global
// battle-drop table. Always consumes exactly 1 `random` call, even for a
// single-entry table (Diamond's) whose result is unconditional — kept
// consistent with every other tier so a caller's own call-count bookkeeping
// never has to special-case Diamond.
function rollEggReward(weights: WeightedRarityTable, random: () => number): EggChestReward {
  const roll = random();
  let cumulative = 0;
  for (const [rarity, weight] of weights.slice(0, -1)) {
    cumulative += weight;
    if (roll < cumulative) return { category: "egg", rarity };
  }
  return { category: "egg", rarity: weights[weights.length - 1][0] };
}

function itemBundle(category: "poke-balls" | "potions" | "revive", itemId: string, quantity: number): ItemBundleChestReward {
  return { category, itemId, quantity };
}

// ============================================================================
// Per-tier OPTIONAL category builders — one function per (tier, category)
// pair, each producing exactly one ChestRewardResult for that category,
// using only the real, existing item/incubator ids verified at the top of
// this file. This is deliberately the ONE place these tier-specific
// item/quantity rules are encoded (never duplicated into chest-reward-
// config.ts, which only holds the tier-level RULES — see that module's own
// doc comment).
// ============================================================================

type RewardBuilder = (random: () => number) => ChestRewardResult;

// ---- Poké Balls ----
function silverPokeBalls(random: () => number): ChestRewardResult {
  return rollWeightedOptions(
    [
      { weight: 0.5, build: (r) => itemBundle("poke-balls", "poke-ball", rollInt(2, 6, r)) },
      { weight: 0.5, build: (r) => itemBundle("poke-balls", "great-ball", rollInt(1, 3, r)) },
    ],
    random
  );
}

function goldPokeBalls(random: () => number): ChestRewardResult {
  return rollWeightedOptions(
    [
      { weight: 0.5, build: (r) => itemBundle("poke-balls", "great-ball", rollInt(3, 6, r)) },
      { weight: 0.5, build: (r) => itemBundle("poke-balls", "ultra-ball", rollInt(1, 3, r)) },
    ],
    random
  );
}

// Diamond's own explicit internal weights (40/40/20 — the spec's one
// named exception to "equal probability", alongside the egg tables).
function diamondPokeBalls(random: () => number): ChestRewardResult {
  return rollWeightedOptions(
    [
      { weight: 0.4, build: (r) => itemBundle("poke-balls", "great-ball", rollInt(4, 8, r)) },
      { weight: 0.4, build: (r) => itemBundle("poke-balls", "ultra-ball", rollInt(2, 4, r)) },
      { weight: 0.2, build: () => itemBundle("poke-balls", "master-ball", 1) },
    ],
    random
  );
}

// ---- Potions ----
function silverPotions(random: () => number): ChestRewardResult {
  return rollWeightedOptions(
    [
      { weight: 0.5, build: (r) => itemBundle("potions", "potion", rollInt(2, 5, r)) },
      { weight: 0.5, build: (r) => itemBundle("potions", "super-potion", rollInt(1, 3, r)) },
    ],
    random
  );
}

function goldPotions(random: () => number): ChestRewardResult {
  return rollWeightedOptions(
    [
      { weight: 0.5, build: (r) => itemBundle("potions", "super-potion", rollInt(2, 5, r)) },
      { weight: 0.5, build: (r) => itemBundle("potions", "hyper-potion", rollInt(1, 3, r)) },
    ],
    random
  );
}

function diamondPotions(random: () => number): ChestRewardResult {
  return rollWeightedOptions(
    [
      { weight: 0.5, build: (r) => itemBundle("potions", "hyper-potion", rollInt(2, 4, r)) },
      { weight: 0.5, build: (r) => itemBundle("potions", "max-potion", rollInt(1, 2, r)) },
    ],
    random
  );
}

// ---- Revive ----
// Silver's is a fixed Revive×1 — no randomness at all (never a spurious
// random() call for an outcome with only one possibility).
function silverRevive(): ChestRewardResult {
  return itemBundle("revive", "revive", 1);
}

function goldRevive(random: () => number): ChestRewardResult {
  return itemBundle("revive", "revive", rollInt(1, 2, random));
}

function diamondRevive(random: () => number): ChestRewardResult {
  return rollWeightedOptions(
    [
      { weight: 0.5, build: (r) => itemBundle("revive", "revive", rollInt(2, 3, r)) },
      { weight: 0.5, build: () => itemBundle("revive", "max-revive", 1) },
    ],
    random
  );
}

// ---- Incubator ----
// Silver's is a fixed Regular Incubator×1 — no randomness (same reasoning
// as silverRevive above).
function silverIncubator(): ChestRewardResult {
  return { category: "incubator", incubatorTypeId: "regular" };
}

function goldIncubator(random: () => number): ChestRewardResult {
  const options: readonly IncubatorTypeId[] = ["regular", "advanced", "ultra"];
  return { category: "incubator", incubatorTypeId: pickUniform(options, random) };
}

function diamondIncubator(random: () => number): ChestRewardResult {
  const options: readonly IncubatorTypeId[] = ["ultra", "master"];
  return { category: "incubator", incubatorTypeId: pickUniform(options, random) };
}

// ---- Evolution Item (never available in Silver — see SILVER_BUILDERS
// below, which simply has no "evolution-item" entry at all) ----
function goldEvolutionItem(random: () => number): ChestRewardResult {
  const [itemId] = pickDistinctUniform(EVOLUTION_ITEM_CATALOG, 1, random);
  return { category: "evolution-item", items: [{ itemId, quantity: 1 }] };
}

// "2 or 3 evolution items, equal probability" — the count itself (2 vs 3)
// is a uniform inclusive-range roll (rollInt(2, 3, ...)), then that many
// DISTINCT items are drawn from the full 16-entry catalog
// (pickDistinctUniform, which is itself always distinct-by-construction —
// see that function's own doc comment — so "prefer distinct items when
// enough entries exist" is automatically satisfied: 16 always comfortably
// exceeds the 2-3 drawn here).
function diamondEvolutionItem(random: () => number): ChestRewardResult {
  const count = rollInt(2, 3, random);
  const itemIds = pickDistinctUniform(EVOLUTION_ITEM_CATALOG, count, random);
  return { category: "evolution-item", items: itemIds.map((itemId) => ({ itemId, quantity: 1 })) };
}

const SILVER_BUILDERS: Partial<Record<OptionalChestRewardCategory, RewardBuilder>> = {
  "poke-balls": silverPokeBalls,
  potions: silverPotions,
  revive: silverRevive,
  incubator: silverIncubator,
};

const GOLD_BUILDERS: Partial<Record<OptionalChestRewardCategory, RewardBuilder>> = {
  "poke-balls": goldPokeBalls,
  potions: goldPotions,
  revive: goldRevive,
  "evolution-item": goldEvolutionItem,
  incubator: goldIncubator,
};

const DIAMOND_BUILDERS: Partial<Record<OptionalChestRewardCategory, RewardBuilder>> = {
  "poke-balls": diamondPokeBalls,
  potions: diamondPotions,
  revive: diamondRevive,
  "evolution-item": diamondEvolutionItem,
  incubator: diamondIncubator,
};

// Exported so a test can roll one specific (tier, category) reward in
// isolation — e.g. verifying Diamond's Poké Ball 40/40/20 weights exactly,
// or an evolution-item selection — without needing to trace a full chest
// roll's entire call sequence just to reach that one category.
export const CHEST_REWARD_BUILDERS: Record<ChestTypeId, Partial<Record<OptionalChestRewardCategory, RewardBuilder>>> = {
  silver: SILVER_BUILDERS,
  gold: GOLD_BUILDERS,
  diamond: DIAMOND_BUILDERS,
};

// ============================================================================
// The top-level engine — ONE generic implementation shared by all 3 tiers,
// driven entirely by that tier's own ChestRewardConfig (chest-reward-
// config.ts) plus its own builder map above. No tier-specific branching
// exists here: Silver's "0 mandatory extras", Gold's "1", and Diamond's
// "2" are all just `config.mandatoryExtraCount`; Silver/Gold's caps and
// Diamond's uncapped bonus phase are all just `config.bonusCap`.
// ============================================================================

// CHESTS PHASE 2 — the one reward-roll entry point. Pure and synchronous:
// returns a plain, describable list of rewards, writes nothing anywhere.
// `chestTypeId` selects the tier's own config/builders; `random` defaults
// to Math.random for real gameplay use (a later phase's own opening
// action), but every test in this feature always injects a deterministic
// sequence instead — see this phase's own Final Report for the exact
// testing convention.
//
// Category uniqueness (CORE RULE: "a reward category may appear at most
// once per chest opening") holds by construction, never by a post-hoc
// dedupe: the 3 mandatory categories are always distinct from each other
// and from every optional category; the mandatory-extra categories are
// drawn WITHOUT replacement from the optional pool
// (pickDistinctUniform); and the bonus roll only ever considers
// `remaining` — the optional pool with the mandatory-extra categories
// already removed — so a category already awarded can never be rolled
// for again.
export function rollChestReward(chestTypeId: ChestTypeId, random: () => number = Math.random): ChestRewardResult[] {
  const config: ChestRewardConfig = CHEST_REWARD_CONFIGS[chestTypeId];
  const builders = CHEST_REWARD_BUILDERS[chestTypeId];

  const results: ChestRewardResult[] = [
    rollEggReward(config.eggWeights, random),
    { category: "money", amount: rollInt(config.moneyRange.min, config.moneyRange.max, random) },
    { category: "gold", amount: rollInt(config.goldRange.min, config.goldRange.max, random) },
  ];

  const pool = config.optionalCategories;
  const mandatoryExtras = pickDistinctUniform(pool, config.mandatoryExtraCount, random);
  for (const category of mandatoryExtras) {
    results.push(builders[category]!(random));
  }

  const remaining = pool.filter((category) => !mandatoryExtras.includes(category));
  const bonusCategories = rollBonusCategories(remaining, config.bonusCap, random);
  for (const category of bonusCategories) {
    results.push(builders[category]!(random));
  }

  return results;
}
