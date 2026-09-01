"use server";

import { getAllModerationHistory, type ModerationHistoryEntryView } from "@/features/moderation/services/moderation-history-view.service";
import { isStaffAdminRole } from "@/features/moderation/services/staff-admin-access";
import { getStaffRole } from "@/features/moderation/services/staff-role.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type ModerationHistoryActionError = "unauthenticated" | "not-owner";

// STAFF / MODERATION — PHASE 6. OWNER-only, independently of
// app/(game)/admin/moderation-history/page.tsx's own server-side check —
// same "a Server Action is a real, directly-reachable network endpoint"
// caution every other read action in this feature already applies (see
// manage-staff.actions.ts's own getStaffRosterViewAction). Used both for
// the page's own client-side refresh and after a successful revoke
// (features/moderation/actions/global-chat-moderation.actions.ts's own
// revokeBanAction, reused as-is here per this phase's "do not duplicate
// revocation logic" rule).
export async function getModerationHistoryAction(): Promise<
  { ok: true; history: ModerationHistoryEntryView[] } | { ok: false; error: ModerationHistoryActionError }
> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "unauthenticated" };

  const profile = await getPlayerProfile(session.user.id);
  const role = await getStaffRole(profile.id);
  if (!isStaffAdminRole(role)) return { ok: false, error: "not-owner" };

  return { ok: true, history: await getAllModerationHistory() };
}
