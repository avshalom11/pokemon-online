"use server";

import { getOnlinePlayerCount, recordHeartbeat } from "@/features/presence/services/presence.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// Thin Server Action wrappers — same shape as every other action file in
// this codebase (resolve the session, resolve the profile, delegate to the
// service). Identity is never trusted from the client: the player whose
// presence is recorded is always this request's own real session.

// ONLINE PRESENCE — called once per PRESENCE_HEARTBEAT_INTERVAL_MS tick by
// PresenceHeartbeat.tsx, mounted once at the (game) layout level. Silently
// no-ops for an unauthenticated caller (should never actually happen — the
// heartbeat only ever renders inside the authenticated (game) layout — but
// this is still a real network endpoint anyone could call directly) rather
// than throwing.
export async function sendHeartbeatAction(): Promise<void> {
  const session = await getCurrentSession();
  if (!session) return;

  const profile = await getPlayerProfile(session.user.id);
  await recordHeartbeat(profile.id);
}

// HOME ONLINE COUNT — re-callable client-side (features/home/components/
// OnlinePlayerCountStat.tsx) so the count can refresh without a full page
// reload. Requires an
// authenticated session like every other action here, but the number
// itself is never player-specific — "do not count unauthenticated
// visitors" is satisfied by getOnlinePlayerCount itself only ever counting
// PlayerProfile rows, which exist only for real accounts.
export async function getOnlineCountAction(): Promise<number> {
  const session = await getCurrentSession();
  if (!session) return 0;

  return getOnlinePlayerCount();
}
