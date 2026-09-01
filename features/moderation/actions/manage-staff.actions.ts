"use server";

import { appointStaffMember, removeStaffMember, type AppointStaffMemberResult, type RemoveStaffMemberResult } from "@/features/moderation/services/manage-staff.service";
import { isStaffAdminRole } from "@/features/moderation/services/staff-admin-access";
import { resolveUsernameToPlayerId } from "@/features/moderation/services/resolve-username-target.service";
import { getStaffRole } from "@/features/moderation/services/staff-role.service";
import { getStaffRosterView, type StaffRosterView } from "@/features/moderation/services/staff-roster-view.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// STAFF / MODERATION — PHASE 6. Same shape every Server Action in this
// feature already follows: resolve the real session server-side, resolve
// the acting player's own trusted identity from it, then delegate
// everything else to a service. The client only ever supplies a
// USERNAME (exactly what features/player-search's own results already
// carry — see resolveUsernameToPlayerId's own doc comment for why a raw
// playerId is never part of this request at all) and, for appointment,
// the requested role string — manage-staff.service.ts's own
// appointStaffMember re-validates that role at runtime regardless of
// whatever this file's own parameter type claims, so a forged value
// (e.g. "OWNER") is rejected there, not merely by this type.
async function resolveActorPlayerId(): Promise<string | null> {
  const session = await getCurrentSession();
  if (!session) return null;
  const profile = await getPlayerProfile(session.user.id);
  return profile.id;
}

export type ManageStaffActionError = "unauthenticated" | "target-not-found";

export async function appointStaffMemberAction(params: {
  targetUsername: string;
  role: string;
}): Promise<AppointStaffMemberResult | { ok: false; error: ManageStaffActionError }> {
  const actorPlayerId = await resolveActorPlayerId();
  if (!actorPlayerId) return { ok: false, error: "unauthenticated" };

  const targetPlayerId = await resolveUsernameToPlayerId(params.targetUsername);
  if (!targetPlayerId) return { ok: false, error: "target-not-found" };

  return appointStaffMember({ actorPlayerId, targetPlayerId, role: params.role });
}

export async function removeStaffMemberAction(params: {
  targetUsername: string;
}): Promise<RemoveStaffMemberResult | { ok: false; error: ManageStaffActionError }> {
  const actorPlayerId = await resolveActorPlayerId();
  if (!actorPlayerId) return { ok: false, error: "unauthenticated" };

  const targetPlayerId = await resolveUsernameToPlayerId(params.targetUsername);
  if (!targetPlayerId) return { ok: false, error: "target-not-found" };

  return removeStaffMember({ actorPlayerId, targetPlayerId });
}

// STAFF / MODERATION — PHASE 6 — the panel's own "refresh after a
// successful appoint/remove" round trip (spec: "After success, update the
// panel immediately"). OWNER-gated here too, independently of the page's
// own server-side check — a Server Action is a real network endpoint
// reachable directly, same caution this codebase already applies
// elsewhere (e.g. features/chat/actions/global-chat.actions.ts's own doc
// comment on why its actions re-check even though the UI that normally
// calls them is itself already gated).
export async function getStaffRosterViewAction(): Promise<
  { ok: true; roster: StaffRosterView } | { ok: false; error: ManageStaffActionError | "not-owner" }
> {
  const actorPlayerId = await resolveActorPlayerId();
  if (!actorPlayerId) return { ok: false, error: "unauthenticated" };

  const role = await getStaffRole(actorPlayerId);
  if (!isStaffAdminRole(role)) return { ok: false, error: "not-owner" };

  return { ok: true, roster: await getStaffRosterView() };
}
