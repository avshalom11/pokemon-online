// STAFF / MODERATION — PHASE 1. Plain shared shapes — deliberately no
// "server-only" import here (unlike the services/ modules), same
// "server-only service, plain shared types" split features/chat/types.ts
// and features/notifications/types.ts already establish, so a future
// Client Component can import these directly.

// No PLAYER value here on purpose — "row existence is the fact" (see
// prisma/schema.prisma's StaffMember doc comment): a player with no
// StaffMember row simply resolves to `null` wherever a StaffRole is
// looked up, never a literal "PLAYER" role value that would need its own
// branch everywhere.
export type StaffRole = "OWNER" | "DEPUTY" | "SUPPORT";

// STAFF / MODERATION — PHASE 2. The exhaustive-switch-friendly counterpart
// to StaffRole above, for callers that want a literal "PLAYER" value
// instead of null (see staff-role.service.ts's getPlayerStaffRole) —
// getStaffRole's own `null` remains the primary/original API (Phase 1),
// this is purely an additive convenience, never a replacement.
export type PlayerStaffRole = StaffRole | "PLAYER";

// The closed set of actions ModerationAction.actionType is validated
// against (prisma/schema.prisma). "unban"/revocation is deliberately NOT
// its own actionType — it's represented as revokedAt/revokedByPlayerId/
// revocationReason fields set on the ORIGINAL punishment row (see that
// model's own doc comment for why), so there is nothing to add here for
// it.
export type ModerationActionType =
  | "chat_ban"
  | "site_ban"
  | "permanent_site_ban"
  | "message_delete"
  | "role_grant"
  | "role_revoke";

// Centralized permission matrix result — see
// features/moderation/permissions/staff-permissions.ts's getStaffPermissions,
// the one place any of these booleans is ever computed. Every future
// moderation Server Action/UI surface reads this shape rather than
// re-deriving `role === "OWNER"` (or similar) inline.
export interface StaffPermissions {
  canDeleteChatMessages: boolean;
  canIssueChatBans: boolean;
  // True only for OWNER — DEPUTY/SUPPORT always get the progressive
  // duration computed for them (see chat-ban-progression.config.ts) and
  // never see a picker.
  canChooseChatBanDuration: boolean;
  canIssueSiteBans: boolean;
  canChooseSiteBanDuration: boolean;
  canIssuePermanentSiteBan: boolean;
  canRevokeBans: boolean;
  canManageStaffRoles: boolean;
  canViewModerationHistory: boolean;
}
