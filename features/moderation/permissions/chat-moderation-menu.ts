import { canModerateTarget, getStaffPermissions } from "@/features/moderation/permissions/staff-permissions";
import type { StaffRole } from "@/features/moderation/types";

// STAFF / MODERATION — PHASE 5 — CHAT ⋮ MENU. The one shared "what
// moderation actions are available for THIS message" decision — used
// BOTH by the client (features/chat/components/GlobalChatWindow.tsx,
// deciding whether to render the ⋮ button and which items it contains)
// AND, implicitly, by the server (every Server Action this menu calls
// re-derives its own authorization independently via
// authorizeModerationAction — this function is never itself the
// authorization; it only decides what the UI SHOWS, per this feature's
// own "server authorization remains authoritative" rule). Deliberately no
// "server-only" import — pure role-in, role-out logic with zero DB
// access, safe to import from a Client Component directly, same
// precedent features/moderation/types.ts and staff-roles.config.ts
// already establish for this feature's other client-safe modules.
//
// A single generic rule — never a hand-written per-role action list that
// could drift out of sync with the real permission matrix — reusing
// getStaffPermissions (features/moderation/permissions/staff-
// permissions.ts) directly is what automatically produces exactly the
// spec'd sets:
//   SUPPORT -> [delete_message, chat_ban]
//   DEPUTY  -> [delete_message, chat_ban, temporary_site_ban]
//   OWNER   -> [delete_message, chat_ban, temporary_site_ban, permanent_site_ban]
// A future permission-matrix change (e.g. granting DEPUTY revocation)
// only ever needs to change staff-permissions.ts — never this file.
export type ChatModerationActionKind = "delete_message" | "chat_ban" | "temporary_site_ban" | "permanent_site_ban";

// `viewerRole` — the CURRENT VIEWER's own resolved role (null for a plain
// player). `targetRole` — the message SENDER's own resolved role (null
// for a plain player). Returns an empty array whenever canModerateTarget
// rejects the pair — which is exactly what makes "never show moderation
// controls on the OWNER's messages" true for free: no role outranks
// OWNER's rank, so canModerateTarget(anything, "OWNER") is always false,
// with no OWNER-specific branch to keep in sync here.
export function getAvailableChatModerationActions(
  viewerRole: StaffRole | null,
  targetRole: StaffRole | null
): ChatModerationActionKind[] {
  if (viewerRole === null) return [];
  if (!canModerateTarget(viewerRole, targetRole)) return [];

  const permissions = getStaffPermissions(viewerRole);
  const actions: ChatModerationActionKind[] = [];
  if (permissions.canDeleteChatMessages) actions.push("delete_message");
  if (permissions.canIssueChatBans) actions.push("chat_ban");
  if (permissions.canIssueSiteBans) actions.push("temporary_site_ban");
  if (permissions.canIssuePermanentSiteBan) actions.push("permanent_site_ban");
  return actions;
}
