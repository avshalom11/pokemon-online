import "server-only";

import { canChangeStaffRole, type StaffRoleChangeRejection } from "@/features/moderation/permissions/staff-permissions";
import { recordStaffRoleChange } from "@/features/moderation/services/moderation-progression.service";
import {
  appointStaffRole,
  getStaffRole,
  removeStaffRole,
  type AppointStaffRoleError,
  type RemoveStaffRoleError,
  type StaffMemberRecord,
} from "@/features/moderation/services/staff-role.service";
import type { StaffRole } from "@/features/moderation/types";

const APPOINTABLE_ROLES = ["DEPUTY", "SUPPORT"] as const;
type AppointableRole = (typeof APPOINTABLE_ROLES)[number];

function isAppointableRole(value: string): value is AppointableRole {
  return (APPOINTABLE_ROLES as readonly string[]).includes(value);
}

// STAFF / MODERATION — PHASE 6. The authoritative staff-management
// service — every future caller (the admin panel's own Server Actions)
// issues an appointment/removal through here, never by calling
// appointStaffRole/removeStaffRole (staff-role.service.ts, Phase 1/2)
// directly. This is the layer that adds what those low-level functions
// deliberately leave to their caller: actor authorization + hierarchy/
// self-target/OWNER-target checks (canChangeStaffRole,
// features/moderation/permissions/staff-permissions.ts) and the
// staff-action audit record (recordStaffRoleChange) — while the roster
// CAP enforcement itself stays entirely inside appointStaffRole's own
// guarded-updateMany transaction, exactly as Phase 1 built it (spec:
// "Use the existing staff-role service and its transaction-safe roster
// limits. Do not duplicate cap logic in the UI").
export type AppointStaffMemberError = "invalid-role" | StaffRoleChangeRejection | AppointStaffRoleError;
export type AppointStaffMemberResult = { ok: true; staffMember: StaffMemberRecord } | { ok: false; error: AppointStaffMemberError };

// `role` is deliberately a wide `string` at this boundary, not
// `AppointableRole` — this is exactly the point a forged/invalid role
// value (anything other than "DEPUTY"/"SUPPORT", including "OWNER" or
// nonsense) must be caught at RUNTIME, not merely relied on a TypeScript
// type a tampered client request was never type-checked against in the
// first place.
export async function appointStaffMember(params: {
  actorPlayerId: string;
  targetPlayerId: string;
  role: string;
}): Promise<AppointStaffMemberResult> {
  if (!isAppointableRole(params.role)) {
    return { ok: false, error: "invalid-role" };
  }

  const [actorRole, targetRole] = await Promise.all([getStaffRole(params.actorPlayerId), getStaffRole(params.targetPlayerId)]);

  const authorization = canChangeStaffRole({
    actorPlayerId: params.actorPlayerId,
    actorRole,
    targetPlayerId: params.targetPlayerId,
    targetRole,
    newRole: params.role,
  });
  if (!authorization.ok) return { ok: false, error: authorization.reason };

  const result = await appointStaffRole({
    targetPlayerId: params.targetPlayerId,
    role: params.role,
    appointedByPlayerId: params.actorPlayerId,
  });
  if (!result.ok) return result;

  await recordAuditBestEffort({
    targetPlayerId: params.targetPlayerId,
    actorPlayerId: params.actorPlayerId,
    actionType: "role_grant",
    role: params.role,
  });

  return result;
}

export type RemoveStaffMemberError = "not-owner" | "self-target" | RemoveStaffRoleError;
export type RemoveStaffMemberResult = { ok: true } | { ok: false; error: RemoveStaffMemberError };

// Mirrors appointStaffMember's own authorization shape (OWNER-only, no
// self-target) — target-is-OWNER protection is enforced twice in
// practice: removeStaffRole itself unconditionally refuses
// `role === "OWNER"` (its own long-standing Phase 1 backstop), and this
// function never even reaches that call for a target OWNER couldn't
// legitimately be paired with here anyway (a self-consistency check, not
// a new mechanism).
export async function removeStaffMember(params: { actorPlayerId: string; targetPlayerId: string }): Promise<RemoveStaffMemberResult> {
  const actorRole = await getStaffRole(params.actorPlayerId);
  if (actorRole !== "OWNER") return { ok: false, error: "not-owner" };
  if (params.actorPlayerId === params.targetPlayerId) return { ok: false, error: "self-target" };

  const targetRoleBeforeRemoval = await getStaffRole(params.targetPlayerId);
  if (targetRoleBeforeRemoval === null) return { ok: false, error: "not-staff" };

  const result = await removeStaffRole({ targetPlayerId: params.targetPlayerId });
  if (!result.ok) return result;

  await recordAuditBestEffort({
    targetPlayerId: params.targetPlayerId,
    actorPlayerId: params.actorPlayerId,
    actionType: "role_revoke",
    role: targetRoleBeforeRemoval,
  });

  return { ok: true };
}

// BEST-EFFORT — same posture as lib/auth/session-revocation.ts's own
// call site (site-ban.service.ts): the real state change (the
// StaffMember row itself) has already durably committed by the time this
// runs, so an audit-write failure must never surface as if the
// appointment/removal itself failed. The persisted StaffMember table
// remains the authoritative source of who currently holds which role
// regardless of whether this side effect ever completes.
async function recordAuditBestEffort(params: {
  targetPlayerId: string;
  actorPlayerId: string;
  actionType: "role_grant" | "role_revoke";
  role: StaffRole;
}): Promise<void> {
  try {
    await recordStaffRoleChange(params);
  } catch {
    // Deliberately swallowed — see this function's own doc comment.
  }
}
