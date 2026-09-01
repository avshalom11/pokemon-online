import { canModerateTarget, getStaffPermissions } from "@/features/moderation/permissions/staff-permissions";
import type { StaffRole } from "@/features/moderation/types";

// STAFF / MODERATION — PROFILE SITE-BAN ENTRY POINT. The profile-page
// counterpart to chat-moderation-menu.ts's getAvailableChatModerationActions
// — same rule ("a single generic rule reusing getStaffPermissions/
// canModerateTarget directly, never a hand-written per-role action list"),
// scoped down to only the two action kinds a public profile can ever
// trigger (no delete_message/chat_ban here — those only ever make sense
// against a specific chat message). Reusing canModerateTarget here is what
// makes "never show these controls when viewing OWNER's profile" and
// "never show them on the viewer's own rank" true for free, with no
// OWNER-specific or self-target branch to keep in sync — the caller
// (ProfileContent.tsx) separately never even renders this component at all
// for `view.isOwner`, since a viewer's own profile is a stronger, simpler
// exclusion than hierarchy alone would produce.
//
// Deliberately no "server-only" import — pure role-in, role-out logic with
// zero DB access, safe to import from a Client Component directly, same
// precedent chat-moderation-menu.ts already establishes. This is never
// itself an authorization decision: every Server Action it can lead to
// (features/moderation/actions/profile-moderation.actions.ts) re-derives
// its own authorization from the database independently via
// authorizeModerationAction.
export type ProfileModerationActionKind = "temporary_site_ban" | "permanent_site_ban";

export function getAvailableProfileModerationActions(
  viewerRole: StaffRole | null,
  targetRole: StaffRole | null
): ProfileModerationActionKind[] {
  if (viewerRole === null) return [];
  if (!canModerateTarget(viewerRole, targetRole)) return [];

  const permissions = getStaffPermissions(viewerRole);
  const actions: ProfileModerationActionKind[] = [];
  if (permissions.canIssueSiteBans) actions.push("temporary_site_ban");
  if (permissions.canIssuePermanentSiteBan) actions.push("permanent_site_ban");
  return actions;
}
