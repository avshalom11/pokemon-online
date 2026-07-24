"use server";

import { markAllNotificationsRead, markNotificationRead } from "@/features/notifications/services/notification-service";
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
