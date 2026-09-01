import "server-only";

import { canModerateTarget, getStaffPermissions } from "@/features/moderation/permissions/staff-permissions";
import { getStaffRole } from "@/features/moderation/services/staff-role.service";
import type { StaffPermissions, StaffRole } from "@/features/moderation/types";

export type AuthorizeModerationActionError = "actor-not-staff" | "actor-lacks-permission" | "hierarchy-violation";

export type AuthorizeModerationActionResult =
  | { ok: true; actorRole: StaffRole }
  | { ok: false; error: AuthorizeModerationActionError };

// STAFF / MODERATION — PHASE 3. The one shared "authorize actor + validate
// hierarchy/target" step every punishment/revocation orchestration
// service (chat-ban.service.ts, site-ban.service.ts, revoke-ban.
// service.ts) runs first, before touching anything else — centralizes
// exactly the sequence Phase 3's own spec calls out for issuing a
// punishment ("authorize actor" then "validate hierarchy/target"), so no
// individual service re-implements role lookup + permission-flag checking
// + rank comparison by hand.
//
// Both actor and target roles are ALWAYS re-resolved fresh from the
// database here (via getStaffRole) — never trusted from a client or a
// stale prop, same "never trust the client, always resolve fresh" rule
// this codebase already applies to ownership/session checks elsewhere.
//
// `requiredPermission` is a key into StaffPermissions (e.g.
// "canIssueChatBans", "canIssueSiteBans", "canIssuePermanentSiteBan",
// "canRevokeBans") — reusing the SAME centralized permission matrix
// (features/moderation/permissions/staff-permissions.ts) every other
// authorization check in this feature already reads through, rather than
// a second per-action permission table.
export async function authorizeModerationAction(params: {
  actorPlayerId: string;
  targetPlayerId: string;
  requiredPermission: keyof StaffPermissions;
}): Promise<AuthorizeModerationActionResult> {
  const actorRole = await getStaffRole(params.actorPlayerId);
  if (actorRole === null) return { ok: false, error: "actor-not-staff" };

  const permissions = getStaffPermissions(actorRole);
  if (!permissions[params.requiredPermission]) return { ok: false, error: "actor-lacks-permission" };

  const targetRole = await getStaffRole(params.targetPlayerId);
  if (!canModerateTarget(actorRole, targetRole)) return { ok: false, error: "hierarchy-violation" };

  return { ok: true, actorRole };
}
