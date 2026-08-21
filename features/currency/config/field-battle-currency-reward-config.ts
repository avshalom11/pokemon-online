import type { CurrencyRewardRange } from "@/features/currency/types/currency.types";

// The single place every drop chance and amount range for defeating a wild
// Pokémon in a field battle lives — balance this feature by editing only
// this file, never a number buried in features/currency/services or
// battle-session.service.ts. Both currencies are rolled independently
// (see currency-reward.service.ts's rollCurrencyReward), so these two
// entries never need to sum to anything in particular.
//
// money: common, high drop chance, small-to-moderate amount.
// gold: rare, very low drop chance, small amount (it's the premium
// currency — see prisma/schema.prisma's own PlayerProfile.gold comment).
export const FIELD_BATTLE_CURRENCY_REWARD_CONFIG: Record<"money" | "gold", CurrencyRewardRange> = {
  money: {
    dropChance: 0.1,
    minAmount: 1,
    maxAmount: 40,
  },
  gold: {
    dropChance: 0.015,
    minAmount: 1,
    maxAmount: 10,
  },
};
