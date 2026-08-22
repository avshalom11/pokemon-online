"use server";

import { getNotificationBellData, markAllNotificationsRead, markNotificationRead } from "@/features/notifications/services/notification-service";
import type { NotificationBellData } from "@/features/notifications/types";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// Both thin Server Action wrappers — same shape as every other action file
// in this codebase (resolve the session, resolve the profile, delegate to
// the service). Ownership is enforced inside the service itself, never
// trusted from the client.

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const session = await getCurrentSession();
  if (!session) return;

  const profile = await getPlayerProfile(session.user.id);
  await markNotificationRead(profile.id, notificationId);
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const session = await getCurrentSession();
  if (!session) return;

  const profile = await getPlayerProfile(session.user.id);
  await markAllNotificationsRead(profile.id);
}

// FRIENDS QUICK ACTIONS — PrivateMessagePopupWatcher.tsx's own poll
// target, reusing the exact same getNotificationBellData the header's own
// server-rendered dropdown already seeds itself from at layout mount (no
// separate/duplicated query) — just callable from the client on an
// interval too now, same "existing lightweight polling pattern" Global
// Chat/Private Chat already established (2-3s setInterval + a plain
// server action), never a new WebSocket/presence layer.
export async function getNotificationBellDataAction(): Promise<NotificationBellData> {
  const session = await getCurrentSession();
  if (!session) return { unreadCount: 0, recent: [] };

  const profile = await getPlayerProfile(session.user.id);
  return getNotificationBellData(profile.id);
}
