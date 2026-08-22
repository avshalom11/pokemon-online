import "server-only";

import { isOnline, PRESENCE_ONLINE_WINDOW_MS } from "@/features/presence/config/presence.config";
import { prisma } from "@/lib/db/prisma";

// ONLINE PRESENCE — the one place a heartbeat is ever written.
// `playerId` is always the caller's own resolved PlayerProfile id (see
// presence.actions.ts's sendHeartbeatAction) — never trusted from the
// client. A plain field write: no read-then-write race to guard against,
// since this only ever advances lastSeenAt to "now", never depends on its
// previous value.
export async function recordHeartbeat(playerId: string): Promise<void> {
  await prisma.playerProfile.update({ where: { id: playerId }, data: { lastSeenAt: new Date() } });
}

// IMMEDIATE OFFLINE ON LOGOUT — the one place a player is ever marked
// offline BEFORE the heartbeat timeout would otherwise catch it. Sets
// lastSeenAt back to null (the same "never seen"/offline value a
// brand-new profile starts with) rather than some past timestamp, so
// isOnline(null) is unambiguously false regardless of
// PRESENCE_ONLINE_WINDOW_MS. `playerId` is always the caller's own
// resolved PlayerProfile id (see lib/auth/actions.ts's logoutAction,
// resolved from the session BEFORE it signs out) — never trusted from the
// client. The one caller wraps this in a try/catch so a write failure here
// can never block the actual sign-out; closing the browser or losing
// connection without explicitly logging out still relies purely on the
// existing heartbeat timeout, completely unaffected by this function.
export async function markOffline(playerId: string): Promise<void> {
  await prisma.playerProfile.update({ where: { id: playerId }, data: { lastSeenAt: null } });
}

// Bulk online/offline resolution for a batch of player ids — the ONE
// primitive both Global Chat (per message sender, global-chat.service.ts's
// getRecentGlobalChatMessages) and the Friends Bar (per friend,
// friendship.service.ts's getFriendsAndRequests) go through, so "is X
// online" is computed with the exact same rule (isOnline, presence.
// config.ts) in exactly one place. PRIVACY — never exposes the underlying
// lastSeenAt timestamp itself to any caller; only a per-id boolean.
export async function getOnlinePlayerIdSet(playerIds: readonly string[]): Promise<Set<string>> {
  if (playerIds.length === 0) return new Set();
  const uniqueIds = [...new Set(playerIds)];
  const rows = await prisma.playerProfile.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, lastSeenAt: true },
  });
  const now = new Date();
  const onlineIds = rows
    .filter((row: { lastSeenAt: Date | null }) => isOnline(row.lastSeenAt, now))
    .map((row: { id: string }) => row.id);
  return new Set(onlineIds);
}

// HOME ONLINE COUNT — a single site-wide aggregate, never a list of WHO is
// online (this feature's own explicit privacy rule: only a boolean per
// player, or one aggregate count, is ever exposed — never identities and
// timestamps together). One indexed count query (see the
// PlayerProfile.lastSeenAt index in prisma/schema.prisma) rather than
// fetching every profile and filtering in JS, so this stays cheap
// regardless of total player count.
export async function getOnlinePlayerCount(): Promise<number> {
  const cutoff = new Date(Date.now() - PRESENCE_ONLINE_WINDOW_MS);
  return prisma.playerProfile.count({ where: { lastSeenAt: { gte: cutoff } } });
}
