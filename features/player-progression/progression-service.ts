import "server-only";

import { createLevelUpNotification } from "@/features/notifications/services/notification-service";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getPlayerProgress } from "./progression-calculations";
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

  if (progress.level > previousLevel) {
    await createLevelUpNotification(tx, playerId, progress.level);
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
  };
}
