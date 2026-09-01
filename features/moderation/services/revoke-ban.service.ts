import "server-only";

import { normalizeModerationReason } from "@/features/moderation/config/moderation-reason.config";
import { authorizeModerationAction, type AuthorizeModerationActionError } from "@/features/moderation/services/authorize-moderation-action";
import { revokeModerationAction, type ModerationActionRecord } from "@/features/moderation/services/moderation-progression.service";
import type { ModerationActionType } from "@/features/moderation/types";
import { prisma } from "@/lib/db/prisma";

// The three actionTypes revoke-ban.service.ts will ever act on — a
// "message_delete"/"role_grant"/"role_revoke" row has no active/inactive
// concept and is never a valid revocation target (see "not-a-ban" below).
const BAN_ACTION_TYPES: readonly ModerationActionType[] = ["chat_ban", "site_ban", "permanent_site_ban"];

export type RevokeBanError =
  | "invalid-reason"
  | "not-found"
  | "not-a-ban"
  | "already-revoked"
  | "already-expired"
  | AuthorizeModerationActionError;

export type RevokeBanResult = { ok: true; action: ModerationActionRecord } | { ok: false; error: RevokeBanError };

// STAFF / MODERATION — PHASE 3. The authoritative revocation service —
// works uniformly across all three ban types (chat_ban, site_ban,
// permanent_site_ban), reusing prisma/schema.prisma's own ModerationAction
// revocation fields (revokedAt/revokedByPlayerId/revocationReason) via
// moderation-progression.service.ts's revokeModerationAction, never a
// second revocation mechanism.
//
// Order of checks, deliberately: reason -> row exists -> row is a ban ->
// not already revoked -> not already expired -> actor is authorized to
// moderate the ORIGINAL TARGET (the banned player, not the staff member
// who issued the ban) -> perform the guarded write. Validity checks run
// BEFORE authorization so an unauthorized caller learns nothing about
// whether a given action id even exists/is revocable that a real
// authorization check wouldn't already have to reveal anyway (every
// branch below returns a distinct, equally cheap-to-produce error, so
// this ordering costs nothing in practice — unlike, say, an account-
// enumeration concern, there is no secrecy property being protected
// either way).
//
// canRevokeBans is currently true ONLY for OWNER (features/moderation/
// permissions/staff-permissions.ts) — Phase 0's own spec left DEPUTY
// revocation as a "may allow later" open question, never decided. This
// service does not hardcode "OWNER only": it reads canRevokeBans through
// the same centralized permission matrix every other authorization check
// in this feature uses, so widening that later (should DEPUTY revocation
// ever be approved) requires exactly one change, in staff-permissions.ts,
// never here.
//
// PROGRESSION IS NEVER TOUCHED — revokeModerationAction (the function
// this delegates to) only ever mutates revokedAt/revokedByPlayerId/
// revocationReason on the existing row; PlayerModerationCounters is
// simply never referenced by it, which is what makes "revocation must not
// decrement/reset progression" true by construction rather than by a
// runtime check.
export async function revokeBan(params: {
  actorPlayerId: string;
  actionId: string;
  reason: string;
}): Promise<RevokeBanResult> {
  const reason = normalizeModerationReason(params.reason);
  if (reason === null) return { ok: false, error: "invalid-reason" };

  const action = await prisma.moderationAction.findUnique({ where: { id: params.actionId } });
  if (!action) return { ok: false, error: "not-found" };

  if (!BAN_ACTION_TYPES.includes(action.actionType as ModerationActionType)) {
    return { ok: false, error: "not-a-ban" };
  }
  if (action.revokedAt !== null) return { ok: false, error: "already-revoked" };
  // Permanent bans have no expiresAt at all (never self-expire) — this
  // check is a no-op for them and only ever rejects an already-lapsed
  // temporary chat/site ban, which has nothing left to revoke.
  if (action.expiresAt !== null && action.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: "already-expired" };
  }

  const authorization = await authorizeModerationAction({
    actorPlayerId: params.actorPlayerId,
    targetPlayerId: action.targetPlayerId,
    requiredPermission: "canRevokeBans",
  });
  if (!authorization.ok) return { ok: false, error: authorization.error };

  const revoked = await revokeModerationAction({
    actionId: params.actionId,
    revokedByPlayerId: params.actorPlayerId,
    revocationReason: reason,
  });
  if (!revoked.ok) return { ok: false, error: "already-revoked" };

  return { ok: true, action: revoked.action };
}
