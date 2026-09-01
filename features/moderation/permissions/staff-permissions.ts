import { PLAYER_RANK, STAFF_ROLE_RANK } from "@/features/moderation/config/staff-roles.config";
import type { PlayerStaffRole, StaffPermissions, StaffRole } from "@/features/moderation/types";

// STAFF / MODERATION — PHASE 1. The ONE centralized permission matrix —
// every future moderation Server Action/service/UI surface calls
// getStaffPermissions(role) rather than scattering `role === "OWNER"`
// checks throughout the codebase (explicit project requirement). `role`
// is null for a plain player (no StaffMember row — "row existence is the
// fact", see prisma/schema.prisma's own doc comment) and gets every
// permission denied, same as any unrecognized/future role value would.
const NO_PERMISSIONS: StaffPermissions = {
  canDeleteChatMessages: false,
  canIssueChatBans: false,
  canChooseChatBanDuration: false,
  canIssueSiteBans: false,
  canChooseSiteBanDuration: false,
  canIssuePermanentSiteBan: false,
  canRevokeBans: false,
  canManageStaffRoles: false,
  canViewModerationHistory: false,
};

const SUPPORT_PERMISSIONS: StaffPermissions = {
  ...NO_PERMISSIONS,
  canDeleteChatMessages: true,
  canIssueChatBans: true,
};

const DEPUTY_PERMISSIONS: StaffPermissions = {
  ...SUPPORT_PERMISSIONS,
  canIssueSiteBans: true,
};

const OWNER_PERMISSIONS: StaffPermissions = {
  canDeleteChatMessages: true,
  canIssueChatBans: true,
  canChooseChatBanDuration: true,
  canIssueSiteBans: true,
  canChooseSiteBanDuration: true,
  canIssuePermanentSiteBan: true,
  canRevokeBans: true,
  canManageStaffRoles: true,
  canViewModerationHistory: true,
};

const PERMISSIONS_BY_ROLE: Record<StaffRole, StaffPermissions> = {
  OWNER: OWNER_PERMISSIONS,
  DEPUTY: DEPUTY_PERMISSIONS,
  SUPPORT: SUPPORT_PERMISSIONS,
};

// `role` is whatever features/moderation/services/staff-role.service.ts's
// getStaffRole(playerId) (returns null for a plain player) or
// getPlayerStaffRole(playerId) (STAFF / MODERATION PHASE 2 — returns the
// literal "PLAYER" instead) returned for the CALLER — always re-resolved
// fresh from the database by that service, never trusted from a client or
// a stale prop (same "never trust the client, always resolve fresh" rule
// this codebase already applies to ownership/session checks elsewhere).
// Accepts both null and "PLAYER" as equivalent "no staff role" inputs so
// either lookup function's return value can be passed straight through
// without an extra adapter at the call site.
export function getStaffPermissions(role: PlayerStaffRole | null): StaffPermissions {
  if (role === null || role === "PLAYER") return NO_PERMISSIONS;
  return PERMISSIONS_BY_ROLE[role];
}

function rankOf(role: StaffRole | null): number {
  return role === null ? PLAYER_RANK : STAFF_ROLE_RANK[role];
}

// TARGET HIERARCHY — whether `actorRole` may take a moderation action
// (delete a message, issue a ban) against a player currently holding
// `targetRole`. A single generic rank comparison rather than three
// hand-written role-pair rules — see staff-roles.config.ts's
// STAFF_ROLE_RANK doc comment for why this one comparison already
// satisfies every rule in the spec, INCLUDING "OWNER must never be a
// valid moderation target" (no role outranks OWNER's rank 3) and "nobody
// may moderate their own rank" (SUPPORT can't moderate SUPPORT, DEPUTY
// can't moderate DEPUTY) for free, with no extra branches.
//
// Both `actorRole` and `targetRole` must always be resolved fresh from
// the database by the caller (getStaffRole) — this function only ever
// compares two already-resolved roles, it never looks anything up
// itself.
export function canModerateTarget(actorRole: StaffRole, targetRole: StaffRole | null): boolean {
  return rankOf(actorRole) > rankOf(targetRole);
}

export type StaffRoleChangeRejection = "not-owner" | "self-target" | "target-is-owner" | "cannot-grant-owner";

// STAFF ROLE MANAGEMENT — the separate, stricter rule set for
// appointing/removing DEPUTY/SUPPORT (distinct from canModerateTarget
// above, which governs ordinary moderation actions like bans/message
// deletion, not staff-role changes). Per spec:
//   - only OWNER may ever appoint/remove staff roles;
//   - nobody may change their own staff role (no self-promotion, no
//     self-demotion, even by OWNER on themselves);
//   - OWNER may never be a target of a role change (protects the OWNER
//     account from accidental/malicious removal — enforced here as a
//     blanket rule with no exception, not merely "OWNER can't demote
//     OWNER");
//   - this path can never grant the OWNER role itself — OWNER assignment
//     is a separate, one-time, explicitly-reviewed bootstrap (see
//     staff-role.service.ts's own doc comment), never a regular
//     appointment newRole can request.
// Returns the specific rejection reason (never a bare boolean) so a
// future Server Action can surface a precise error rather than a generic
// "not allowed".
export function canChangeStaffRole(params: {
  actorPlayerId: string;
  actorRole: StaffRole | null;
  targetPlayerId: string;
  targetRole: StaffRole | null;
  newRole: Exclude<StaffRole, "OWNER">;
}): { ok: true } | { ok: false; reason: StaffRoleChangeRejection } {
  if (params.actorRole !== "OWNER") return { ok: false, reason: "not-owner" };
  if (params.actorPlayerId === params.targetPlayerId) return { ok: false, reason: "self-target" };
  if (params.targetRole === "OWNER") return { ok: false, reason: "target-is-owner" };
  // TypeScript's Exclude<StaffRole, "OWNER"> on newRole already makes
  // "cannot-grant-owner" unreachable from a type-checked caller, but the
  // runtime check stays here too — every other moderation service in
  // this feature validates its own inputs at runtime rather than trusting
  // the type system alone, since these functions may eventually be
  // reached from a Server Action boundary where the type only describes
  // what SHOULD have been passed, not what a request body actually
  // contains.
  if ((params.newRole as string) === "OWNER") return { ok: false, reason: "cannot-grant-owner" };
  return { ok: true };
}
