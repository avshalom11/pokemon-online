import "server-only";

import { playerLevelUpMessage } from "@/features/player-progression/progression-messages";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { NotificationBellData, NotificationSummary, NotificationType } from "../types";

// How many recent notifications the header's dropdown shows — a small,
// fixed window rather than a full notifications page (not built by this
// task; see this module's own scope notes).
const RECENT_NOTIFICATIONS_LIMIT = 10;

// Generic create, always inside an existing transaction (see
// createLevelUpNotification below and progression-service.ts's
// addPlayerExperience, its only caller today) — a notification is always a
// side effect of some other atomic write (an XP grant, in the future
// perhaps an item pickup), never a standalone mutation of its own.
export async function createNotification(
  tx: Prisma.TransactionClient,
  playerId: string,
  type: NotificationType,
  message: string
): Promise<void> {
  await tx.notification.create({ data: { playerId, type, message } });
}

// The one place PLAYER_LEVEL_UP notifications are created — called from
// progression-service.ts's addPlayerExperience, the single place a
// level-up is ever decided, inside that same transaction. That caller's own
// exactly-once reward guards (battle-session.service.ts's
// wildDefeatRewardGranted flag, capture.service.ts's deleteMany-count
// check) already make addPlayerExperience itself run at most once per
// reward event, so this notification's exactly-once guarantee is inherited
// for free — no separate duplicate-notification guard needed here.
export async function createLevelUpNotification(
  tx: Prisma.TransactionClient,
  playerId: string,
  newLevel: number
): Promise<void> {
  await createNotification(tx, playerId, "PLAYER_LEVEL_UP", playerLevelUpMessage(newLevel));
}

// The header's data source — fetched once per request by
// app/(game)/layout.tsx alongside getPlayerHeaderData, same "one
// authoritative data-loading path" rule that established.
export async function getNotificationBellData(playerId: string): Promise<NotificationBellData> {
  const [unreadCount, recent] = await Promise.all([
    prisma.notification.count({ where: { playerId, isRead: false } }),
    prisma.notification.findMany({
      where: { playerId },
      orderBy: { createdAt: "desc" },
      take: RECENT_NOTIFICATIONS_LIMIT,
    }),
  ]);

  return {
    unreadCount,
    recent: recent.map(toSummary),
  };
}

// Every mutation below re-validates ownership server-side against
// `playerId` (the caller's own profile id, resolved from the session —
// never a client-sent value) — same convention every other mutation in this
// codebase already follows (see e.g. party-management.service.ts).

export async function markNotificationRead(playerId: string, notificationId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, playerId },
    data: { isRead: true },
  });
}

export async function markAllNotificationsRead(playerId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { playerId, isRead: false },
    data: { isRead: true },
  });
}

function toSummary(row: {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}): NotificationSummary {
  return {
    id: row.id,
    type: row.type as NotificationType,
    message: row.message,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  };
}
