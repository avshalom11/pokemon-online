import "server-only";

import { grantCurrencyRewards } from "@/features/currency/services/currency-reward.service";
import { grantChest } from "@/features/chests/services/chest-ownership.service";
import { getXpRequiredForNextLevel } from "@/features/player-progression/progression-calculations";
import { addPlayerExperience } from "@/features/player-progression/progression-service";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { RegionId } from "@/shared/types/region";
import { getGymRewardDefinition, getRegionalChampionRewardDefinition, type GymChestReward } from "../data/gym-reward-registry";

// GYMS & LEAGUES PHASE 4 — the ONE place a Gym Leader or Regional Champion
// victory is turned into an actual grant against the player's real
// currency/XP/chest inventory. Every number this reads comes from
// gym-reward-registry.ts (the single source of truth also read by the UI's
// reward-preview) — this file never hardcodes an amount itself. Always
// takes an existing transaction client, same convention every other reward
// primitive in this codebase already follows (addPlayerExperience,
// grantCurrencyRewards, grantChest) — the caller (gym-battle-action.service.ts)
// is responsible for the exactly-once gate (markGymBattleCompleted/
// markRegionalChampionDefeated's own firstCompletion/firstDefeat return
// value); this file trusts that gate completely and always grants when
// called. No Gold currency is ever granted here (section 18/19) — only
// "money" (PlayerProfile.coins) — and no Egg/wild-only reward of any kind.

export interface GrantedGymReward {
  readonly kind: "gym-leader" | "regional-champion";
  readonly money: number;
  readonly xpPercentOfNextLevel: number;
  // The concrete XP amount actually granted, already resolved from the
  // player's real level at grant time (section 13/20) — never left for the
  // UI to recompute itself.
  readonly xpAmount: number;
  readonly newPlayerLevel: number;
  readonly leveledUp: boolean;
  readonly badgeId?: string;
  readonly medalId?: string;
  readonly chestRewards: readonly GymChestReward[];
}

// XP DEFINITION (section 13) — `xpPercentOfNextLevel` percent of the XP
// required to advance from the player's CURRENT level to the next one
// (getXpRequiredForNextLevel — the existing, single XP curve; never a
// second one). Same floor-then-clamp rounding convention
// addPlayerExperience itself already applies to any XP amount it's handed
// (Math.max(0, Math.floor(...))), applied here too so the "concrete XP
// amount" this function returns for the UI is the exact integer that will
// actually be granted, not a value addPlayerExperience will silently round
// differently.
export function calculateGymRewardXp(currentLevel: number, xpPercentOfNextLevel: number): number {
  const requiredXp = getXpRequiredForNextLevel(currentLevel);
  return Math.max(0, Math.floor((requiredXp * xpPercentOfNextLevel) / 100));
}

async function currentPlayerLevel(tx: Prisma.TransactionClient, playerId: string): Promise<number> {
  const profile = await tx.playerProfile.findUniqueOrThrow({ where: { id: playerId }, select: { level: true } });
  return profile.level;
}

// GYM REWARD RULE (section 12) — only ever called for a Gym LEADER victory;
// Easy/Medium never reach this (gym-battle-action.service.ts only calls it
// when battleSlot === "leader" AND markGymBattleCompleted's own
// firstCompletion was true). No Gold currency, no Chest — Money + Player XP
// percentage + the Badge (badge itself already awarded by
// markGymBattleCompleted; badgeId here is a display cross-reference only).
export async function grantGymLeaderReward(
  tx: Prisma.TransactionClient,
  playerId: string,
  regionId: RegionId,
  gymNumber: 1 | 2 | 3
): Promise<GrantedGymReward> {
  const definition = getGymRewardDefinition(regionId, gymNumber);
  const level = await currentPlayerLevel(tx, playerId);
  const xpAmount = calculateGymRewardXp(level, definition.xpPercentOfNextLevel);

  await grantCurrencyRewards(tx, playerId, [{ type: "money", amount: definition.money }]);
  const levelUpResult = await addPlayerExperience(tx, playerId, xpAmount);

  return {
    kind: "gym-leader",
    money: definition.money,
    xpPercentOfNextLevel: definition.xpPercentOfNextLevel,
    xpAmount,
    newPlayerLevel: levelUpResult.newLevel,
    leveledUp: levelUpResult.leveledUp,
    badgeId: definition.badgeId,
    chestRewards: [],
  };
}

// REGIONAL CHAMPION REWARDS (section 15) — Money + Player XP percentage +
// Chest reward(s), via the existing generic grantChest primitive (never a
// Gym-specific Chest ownership system). No Gold currency. Only ever called
// once per region, on the one call whose markRegionalChampionDefeated
// returned firstDefeat === true.
export async function grantRegionalChampionReward(
  tx: Prisma.TransactionClient,
  playerId: string,
  regionId: RegionId
): Promise<GrantedGymReward> {
  const definition = getRegionalChampionRewardDefinition(regionId);
  const level = await currentPlayerLevel(tx, playerId);
  const xpAmount = calculateGymRewardXp(level, definition.xpPercentOfNextLevel);

  await grantCurrencyRewards(tx, playerId, [{ type: "money", amount: definition.money }]);
  const levelUpResult = await addPlayerExperience(tx, playerId, xpAmount);

  for (const chest of definition.chestRewards) {
    await grantChest(tx, playerId, chest.chestTypeId, chest.quantity);
  }

  return {
    kind: "regional-champion",
    money: definition.money,
    xpPercentOfNextLevel: definition.xpPercentOfNextLevel,
    xpAmount,
    newPlayerLevel: levelUpResult.newLevel,
    leveledUp: levelUpResult.leveledUp,
    medalId: definition.medalId,
    chestRewards: definition.chestRewards,
  };
}
