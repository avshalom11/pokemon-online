import "server-only";

import { grantCurrencyRewards } from "@/features/currency/services/currency-reward.service";
import type { CurrencyReward } from "@/features/currency/types/currency.types";
import { createLevelUpNotification } from "@/features/notifications/services/notification-service";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { calculateLevelUpReward, getPlayerProgress } from "./progression-calculations";
import type { LevelUpResult } from "./progression-types";

// The only place PlayerProfile.level/experience are ever written. Always
// takes an existing transaction client rather than opening its own —
// every current caller (syncWildHp's defeat-reward branch, capture.service's
// attemptCapture) must grant XP atomically alongside another write (marking
// the reward as claimed, creating the captured Pokémon), so a standalone
// non-transactional variant would just invite a caller to skip that
// atomicity by accident.
//
// Also the single place a level-up notification is ever created (see
// features/notifications/services/notification-service.ts): since this is
// the one place a level-up is ever decided, and every current caller only
// ever reaches this function from inside its own exactly-once-guarded
// transaction, the notification's exactly-once guarantee is inherited for
// free — no separate duplicate-notification logic needed anywhere else.
//
// `experience` is always total accumulated XP (never reset on level-up —
// see progression-calculations.ts's getTotalXpRequiredForLevel), and
// `level` is stored purely for convenient querying elsewhere; both are
// always written together from the one derivation (getPlayerProgress) so
// they can never drift apart.
export async function addPlayerExperience(
  tx: Prisma.TransactionClient,
  playerId: string,
  xpAmount: number
): Promise<LevelUpResult> {
  // Never trust a caller-supplied reward to be non-negative/finite — floors
  // and clamps here mean total XP can only ever move forward.
  const safeXpGained = Math.max(0, Math.floor(xpAmount) || 0);

  const profile = await tx.playerProfile.findUniqueOrThrow({ where: { id: playerId } });
  const previousLevel = profile.level;
  const newTotalXp = profile.experience + safeXpGained;
  const progress = getPlayerProgress(newTotalXp);

  await tx.playerProfile.update({
    where: { id: playerId },
    data: { level: progress.level, experience: progress.totalXp },
  });

  // PLAYER LEVEL-UP REWARDS — granted here, inside the same exactly-once
  // transaction every current caller already wraps this call in (see this
  // function's own doc comment), so the Money/Gold grant inherits the exact
  // same exactly-once guarantee the level-up notification above does — no
  // separate guard needed. calculateLevelUpReward already returns {0, 0}
  // when no level was crossed, so `reward` is always safe to compute
  // unconditionally.
  const reward = calculateLevelUpReward(previousLevel, progress.level);

  if (progress.level > previousLevel) {
    await createLevelUpNotification(tx, playerId, progress.level);
  }

  const currencyRewards: CurrencyReward[] = [
    ...(reward.money > 0 ? [{ type: "money", amount: reward.money } as const] : []),
    ...(reward.gold > 0 ? [{ type: "gold", amount: reward.gold } as const] : []),
  ];
  if (currencyRewards.length > 0) {
    await grantCurrencyRewards(tx, playerId, currencyRewards);
  }

  return {
    previousLevel,
    newLevel: progress.level,
    xpGained: safeXpGained,
    totalXp: progress.totalXp,
    leveledUp: progress.level > previousLevel,
    levelsGained: progress.level - previousLevel,
    currentLevelXp: progress.currentLevelXp,
    xpRequiredForNextLevel: progress.xpRequiredForNextLevel,
    moneyReward: reward.money,
    goldReward: reward.gold,
  };
}

// Plain read of the player's canonical, already-stored account level —
// PlayerProfile.level is only ever written by addPlayerExperience above, so
// this is always the same single source of truth that the Home XP bar and
// every other level display already reads, never independently recomputed
// from party/owned-Pokémon data. Used by Phase 1 wild-level scaling
// (features/battle-session/services/battle-session.service.ts) to look up
// the player level a new encounter should scale to.
export async function getPlayerLevel(playerId: string): Promise<number> {
  const profile = await prisma.playerProfile.findUniqueOrThrow({ where: { id: playerId }, select: { level: true } });
  return profile.level;
}
