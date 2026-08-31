import type { EvolutionItemId } from "@/data/pokemon/pokemon-evolutions";
import type { ChestTypeId } from "@/features/chests/data/chest-definitions";
import type { IncubatorTypeId } from "@/features/eggs/data/incubator-definitions";
import type { PokemonRarity } from "@/shared/types/pokemon";

// CHESTS PHASE 3 — one GRANTED reward, enriched for a future opening-result
// UI (Phase 4+): the same category shape Phase 2's own ChestRewardResult
// already defines (features/chests/types/chest-reward.types.ts), plus
// display info (name/image, resolved from the real, existing catalogs —
// never re-typed by hand) and the real DB identity of whatever was
// actually created (an owned egg's own id, a granted incubator's own id),
// so a future UI can e.g. link straight to the new egg in the Hatchery.
// Deliberately its own type, never a mutation of Phase 2's own
// ChestRewardResult: that type is the pure, unenriched ROLL result and
// must stay exactly as Phase 2 left it (this phase's own explicit "Phase 2
// reward weights/config are not modified" requirement).
export interface EggOpenedReward {
  category: "egg";
  ownedEggId: string;
  rarity: PokemonRarity;
  regionId: string;
  displayName: string;
  imageUrl: string;
}

export interface MoneyOpenedReward {
  category: "money";
  amount: number;
}

export interface GoldOpenedReward {
  category: "gold";
  amount: number;
}

export interface ItemBundleOpenedReward {
  category: "poke-balls" | "potions" | "revive";
  itemId: string;
  displayName: string;
  imageUrl: string;
  quantity: number;
}

export interface IncubatorOpenedReward {
  category: "incubator";
  playerIncubatorId: string;
  incubatorTypeId: IncubatorTypeId;
  displayName: string;
  imageUrl: string;
}

export interface EvolutionItemOpenedReward {
  category: "evolution-item";
  items: readonly { itemId: EvolutionItemId; displayName: string; imageUrl: string; quantity: number }[];
}

// MEGA EVOLUTION PHASE 5 — same enriched shape as ItemBundleOpenedReward
// above, kept as its own type (not folded into that one) since it's a
// distinct ChestRewardResult category (features/chests/types/chest-reward.
// types.ts's own doc comment explains why "mega-stone" is never part of
// the generic evolution-item pool).
export interface MegaStoneOpenedReward {
  category: "mega-stone";
  itemId: string;
  displayName: string;
  imageUrl: string;
  quantity: number;
}

export type OpenChestRewardView =
  | EggOpenedReward
  | MoneyOpenedReward
  | GoldOpenedReward
  | ItemBundleOpenedReward
  | IncubatorOpenedReward
  | EvolutionItemOpenedReward
  | MegaStoneOpenedReward;

// The complete opening result — a discriminated union so a caller/UI never
// has to guess whether `rewards` is meaningful. "not-enough-chests" is
// deliberately the only failure case (ownership+consumption are one atomic
// guarded step — see chest-open.service.ts's own doc comment): there is no
// separate "invalid chest type" case because chestTypeId is already a
// closed, validated union by the time it reaches the service (the
// server action's own zod schema is what rejects a malformed value before
// this point).
export type OpenChestResult =
  | { status: "success"; chestTypeId: ChestTypeId; rewards: readonly OpenChestRewardView[] }
  | { status: "not-enough-chests" };
