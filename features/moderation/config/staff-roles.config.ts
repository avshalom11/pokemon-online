import type { StaffRole } from "@/features/moderation/types";

// Ordered lowest-authority-first is NOT required here — STAFF_ROLE_RANK
// below is what every hierarchy comparison actually uses; this array only
// needs to enumerate the closed set for isStaffRole's own validation.
export const STAFF_ROLES: readonly StaffRole[] = ["OWNER", "DEPUTY", "SUPPORT"];

export function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(value);
}

// The single source every hierarchy/self-escalation check in this feature
// is built on (features/moderation/permissions/staff-permissions.ts's
// canModerateTarget). A plain player (no StaffMember row — see
// prisma/schema.prisma's own doc comment) is always rank 0 — lower than
// every real staff role — which is what makes "OWNER may moderate DEPUTY/
// SUPPORT/PLAYER, DEPUTY may moderate SUPPORT/PLAYER only, SUPPORT may
// moderate PLAYER only, OWNER is never a valid target" fall out of one
// generic `actorRank > targetRank` comparison rather than three separate
// hand-written role-pair rules that could drift out of sync with each
// other as roles are added later.
export const STAFF_ROLE_RANK: Record<StaffRole, number> = {
  OWNER: 3,
  DEPUTY: 2,
  SUPPORT: 1,
};

// A non-staff player's rank for the exact same comparison above — never a
// key in STAFF_ROLE_RANK itself (there is no StaffRole value for
// "player").
export const PLAYER_RANK = 0;

// Final staff limits (PHASE 0/1 spec) — OWNER is deliberately absent: it
// is not appointed through the same capped-appointment mechanism at all
// (see features/moderation/services/staff-role.service.ts's own doc
// comment on why OWNER assignment is a separate one-time bootstrap, never
// a regular appointStaffRole call), so it has no cap to enforce here.
export const STAFF_LIMITS: Record<Exclude<StaffRole, "OWNER">, number> = {
  DEPUTY: 1,
  SUPPORT: 3,
};
