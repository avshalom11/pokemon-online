import "server-only";

import {
  GLOBAL_CHAT_MAX_MESSAGES,
  GLOBAL_CHAT_MESSAGE_MAX_LENGTH,
  GLOBAL_CHAT_SEND_COOLDOWN_MS,
} from "@/features/chat/config/global-chat.config";
import type { GlobalChatMessageView, SendGlobalChatMessageResult } from "@/features/chat/types";
import { getActiveChatBanExpiry } from "@/features/moderation/services/active-ban.service";
import { getStaffRolesByPlayerIds } from "@/features/moderation/services/staff-role.service";
import type { StaffRole } from "@/features/moderation/types";
import { getOnlinePlayerIdSet } from "@/features/presence/services/presence.service";
import { getPlayerIdentitiesByIds, type PlayerIdentity } from "@/lib/auth/player-profile";
import { formatChatMessageTimestamp } from "@/lib/chat/format-message-timestamp";
import { prisma } from "@/lib/db/prisma";

function toView(
  row: { id: string; playerId: string; message: string; createdAt: Date },
  identityByPlayerId: Map<string, PlayerIdentity>,
  onlinePlayerIds: Set<string>,
  staffRoleByPlayerId: Map<string, StaffRole>
): GlobalChatMessageView {
  const identity = identityByPlayerId.get(row.playerId);
  return {
    id: row.id,
    playerDisplayName: identity?.displayName ?? "שחקן",
    playerUsername: identity?.username ?? null,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
    sentTimeLabel: formatChatMessageTimestamp(row.createdAt),
    // ONLINE PRESENCE
    isOnline: onlinePlayerIds.has(row.playerId),
    // STAFF / MODERATION — PHASE 5
    senderStaffRole: staffRoleByPlayerId.get(row.playerId) ?? null,
  };
}

// The one site-wide feed GlobalChatBar reads — both for its first
// server-rendered paint (app/(game)/layout.tsx) and for every client poll
// tick after (getGlobalChatMessagesAction). Read-only: never mutates
// anything, so polling it on an interval carries none of the write-side
// cooldown/cap concerns sendGlobalChatMessage below has to guard. Returned
// oldest-first (a plain reverse of the DB's own newest-first query), so the
// client can render it directly top-to-bottom without re-sorting.
export async function getRecentGlobalChatMessages(): Promise<GlobalChatMessageView[]> {
  const rows = await prisma.globalChatMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: GLOBAL_CHAT_MAX_MESSAGES,
  });
  const ascending = [...rows].reverse();
  const senderIds = ascending.map((row) => row.playerId);
  const [identityByPlayerId, onlinePlayerIds, staffRoleByPlayerId] = await Promise.all([
    getPlayerIdentitiesByIds(senderIds),
    // ONLINE PRESENCE — recomputed fresh on every read (this function is
    // polled ~every GLOBAL_CHAT_POLL_INTERVAL_MS), so each sender's dot
    // stays live without a dedicated presence poll of its own.
    getOnlinePlayerIdSet(senderIds),
    // STAFF / MODERATION — PHASE 5 — same "recomputed fresh on every
    // read" reasoning as presence above: a role change (or the one-time
    // OWNER bootstrap) must be reflected on the very next poll, never
    // cached.
    getStaffRolesByPlayerIds(senderIds),
  ]);
  return ascending.map((row) => toView(row, identityByPlayerId, onlinePlayerIds, staffRoleByPlayerId));
}

// Validates, rate-limits, inserts, then trims the table back down to the
// newest GLOBAL_CHAT_MAX_MESSAGES rows — the one place a message is ever
// created, so this is the only place that needs to enforce either rule.
// Never trusts a client-computed player identity — playerId is always the
// caller's own resolved PlayerProfile id (see global-chat.actions.ts).
//
// RACE-SAFETY — insert + cap-cleanup run inside one prisma.$transaction,
// and the cleanup's own count is read fresh inside that same transaction
// (never a count taken earlier in the request), so two players sending at
// the same instant can each only ever trim the table further toward the
// cap, never past it: the worst case under real concurrent transactions is
// a handful of extra rows deleted (both transactions independently decide
// "N over" and race to delete overlapping oldest rows), which can dip the
// count slightly under the cap but can never exceed it. That is the
// "race-safe enough for multiple users sending at the same time" bar this
// feature was explicitly scoped to — not a hardened distributed lock.
export async function sendGlobalChatMessage(playerId: string, rawMessage: string): Promise<SendGlobalChatMessageResult> {
  // STAFF / MODERATION — PHASE 4 — CHAT BAN ENFORCEMENT. Checked FIRST,
  // before the empty/length/cooldown business-rule checks below — a
  // banned player is rejected on access-control grounds regardless of
  // what they typed, same "authorization before business validation"
  // ordering this feature's own orchestration services (chat-ban.
  // service.ts) already follow. Read fresh on every single send (never
  // cached), so a ban that started or ended moments ago is reflected
  // immediately. Scoped to THIS function alone — getRecentGlobalChatMessages
  // (reading) and every private-chat function (a completely separate
  // model/service) are untouched, so neither is affected by a chat ban.
  const activeBanExpiresAt = await getActiveChatBanExpiry(playerId);
  if (activeBanExpiresAt) {
    return { ok: false, error: "chat-banned", expiresAt: activeBanExpiresAt.toISOString() };
  }

  const trimmed = rawMessage.trim();
  if (trimmed.length === 0) return { ok: false, error: "empty" };
  if (trimmed.length > GLOBAL_CHAT_MESSAGE_MAX_LENGTH) return { ok: false, error: "too-long" };

  const lastOwnMessage = await prisma.globalChatMessage.findFirst({
    where: { playerId },
    orderBy: { createdAt: "desc" },
  });
  if (lastOwnMessage && Date.now() - lastOwnMessage.createdAt.getTime() < GLOBAL_CHAT_SEND_COOLDOWN_MS) {
    return { ok: false, error: "cooldown" };
  }

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.globalChatMessage.create({ data: { playerId, message: trimmed } });

    const total = await tx.globalChatMessage.count();
    const excess = total - GLOBAL_CHAT_MAX_MESSAGES;
    if (excess > 0) {
      const oldest = await tx.globalChatMessage.findMany({ orderBy: { createdAt: "asc" }, take: excess });
      if (oldest.length > 0) {
        await tx.globalChatMessage.deleteMany({ where: { id: { in: oldest.map((message: { id: string }) => message.id) } } });
      }
    }

    return row;
  });

  const [identityByPlayerId, staffRoleByPlayerId] = await Promise.all([
    getPlayerIdentitiesByIds([playerId]),
    getStaffRolesByPlayerIds([playerId]),
  ]);
  // ONLINE PRESENCE — the sender is, by definition, online right now (this
  // very call is a live server round trip from their own client) — no need
  // for a second getOnlinePlayerIdSet lookup just to confirm what's already
  // certain.
  return { ok: true, message: toView(created, identityByPlayerId, new Set([playerId]), staffRoleByPlayerId) };
}
