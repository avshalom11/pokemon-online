import "server-only";

import type { ModerationActionRecord } from "@/features/moderation/services/moderation-progression.service";
import { isStaffRole } from "@/features/moderation/config/staff-roles.config";
import type { ModerationActionType, StaffRole } from "@/features/moderation/types";
import { getPlayerIdentitiesByIds, type PlayerIdentity } from "@/lib/auth/player-profile";
import { formatChatMessageTimestamp } from "@/lib/chat/format-message-timestamp";
import { prisma } from "@/lib/db/prisma";

export type ModerationHistoryStatus = "active" | "expired" | "revoked" | "permanent-active";

// STAFF / MODERATION — PHASE 6 — the ONE OWNER-facing human-readable
// history row shape — deliberately exposes an internal id ONLY where a
// control on the page functionally needs it (the revoke button targets
// this exact ModerationAction id — same "necessary, not decorative"
// standard app/banned/page.tsx's own doc comment already establishes for
// a comparable case) — never actorPlayerId/targetPlayerId/
// revokedByPlayerId themselves, which are always resolved to display
// names here instead.
export interface ModerationHistoryEntryView {
  id: string;
  actionType: ModerationActionType;
  targetDisplayName: string;
  targetUsername: string | null;
  actorDisplayName: string;
  actorUsername: string | null;
  reason: string | null;
  createdAtLabel: string;
  durationMinutes: number | null;
  expiresAtLabel: string | null;
  revokedAtLabel: string | null;
  revokedByDisplayName: string | null;
  revocationReason: string | null;
  // Only meaningful for chat_ban/site_ban/permanent_site_ban — undefined
  // for message_delete/role_grant/role_revoke, which have no ban-status
  // concept at all.
  status: ModerationHistoryStatus | undefined;
  // Only populated for role_grant/role_revoke (the role granted, or the
  // role the target held just before removal) — read back out of
  // ModerationAction.metadata (moderation-progression.service.ts's own
  // recordStaffRoleChange), validated the same "never trust a raw stored
  // value" way every other role lookup in this feature already does.
  grantedRole: StaffRole | null;
}

const BAN_ACTION_TYPES: readonly ModerationActionType[] = ["chat_ban", "site_ban", "permanent_site_ban"];

function deriveStatus(action: ModerationActionRecord, now: Date): ModerationHistoryStatus | undefined {
  if (!BAN_ACTION_TYPES.includes(action.actionType)) return undefined;
  if (action.revokedAt) return "revoked";
  if (action.actionType === "permanent_site_ban") return "permanent-active";
  return action.expiresAt && action.expiresAt.getTime() > now.getTime() ? "active" : "expired";
}

function extractGrantedRole(action: ModerationActionRecord): StaffRole | null {
  if (action.actionType !== "role_grant" && action.actionType !== "role_revoke") return null;
  const metadata = action.metadata;
  if (metadata && typeof metadata === "object" && "role" in metadata) {
    const role = (metadata as { role: unknown }).role;
    if (typeof role === "string" && isStaffRole(role)) return role;
  }
  return null;
}

function toHistoryView(
  action: ModerationActionRecord,
  identityByPlayerId: Map<string, PlayerIdentity>,
  now: Date
): ModerationHistoryEntryView {
  const targetIdentity = identityByPlayerId.get(action.targetPlayerId);
  const actorIdentity = identityByPlayerId.get(action.actorPlayerId);
  const revokedByIdentity = action.revokedByPlayerId ? identityByPlayerId.get(action.revokedByPlayerId) : undefined;

  return {
    id: action.id,
    actionType: action.actionType,
    targetDisplayName: targetIdentity?.displayName ?? "שחקן",
    targetUsername: targetIdentity?.username ?? null,
    actorDisplayName: actorIdentity?.displayName ?? "שחקן",
    actorUsername: actorIdentity?.username ?? null,
    reason: action.reason,
    createdAtLabel: formatChatMessageTimestamp(action.createdAt),
    durationMinutes: action.durationMinutes,
    expiresAtLabel: action.expiresAt ? formatChatMessageTimestamp(action.expiresAt) : null,
    revokedAtLabel: action.revokedAt ? formatChatMessageTimestamp(action.revokedAt) : null,
    revokedByDisplayName: revokedByIdentity?.displayName ?? null,
    revocationReason: action.revocationReason,
    status: deriveStatus(action, now),
    grantedRole: extractGrantedRole(action),
  };
}

const MODERATION_HISTORY_LIMIT = 200;

// STAFF / MODERATION — PHASE 6 — MODERATION HISTORY. Unscoped (every
// player, unlike Phase 1's own getModerationHistoryForPlayer, which stays
// exactly as it was — this is a new, separate function, not a behavior
// change to that one) — authorization (OWNER-only) is the CALLER's
// responsibility, same "service trusts an already-authorized caller"
// convention every other service in this feature already follows;
// app/(game)/admin/moderation-history/page.tsx is the one place that
// calls this, only after its own server-side OWNER check passes.
export async function getAllModerationHistory(): Promise<ModerationHistoryEntryView[]> {
  const rows = await prisma.moderationAction.findMany({
    orderBy: { createdAt: "desc" },
    take: MODERATION_HISTORY_LIMIT,
  });

  const playerIds = [
    ...new Set(
      rows.flatMap((row) => [row.targetPlayerId, row.actorPlayerId, row.revokedByPlayerId].filter((id): id is string => Boolean(id)))
    ),
  ];
  const identityByPlayerId = await getPlayerIdentitiesByIds(playerIds);
  const now = new Date();

  return (rows as ModerationActionRecord[]).map((row) => toHistoryView(row, identityByPlayerId, now));
}
