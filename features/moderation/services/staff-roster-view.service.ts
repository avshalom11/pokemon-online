import "server-only";

import { STAFF_LIMITS } from "@/features/moderation/config/staff-roles.config";
import { getStaffMembersByRole, type StaffMemberRecord } from "@/features/moderation/services/staff-role.service";
import { getPlayerIdentitiesByIds, type PlayerIdentity } from "@/lib/auth/player-profile";

export interface StaffRosterMemberView {
  playerId: string;
  displayName: string;
  username: string | null;
  appointedAt: string; // ISO
}

export interface StaffRosterView {
  owner: StaffRosterMemberView | null;
  deputy: StaffRosterMemberView | null;
  support: StaffRosterMemberView[];
  deputySlotsAvailable: number;
  supportSlotsAvailable: number;
}

function toView(member: StaffMemberRecord, identityByPlayerId: Map<string, PlayerIdentity>): StaffRosterMemberView {
  const identity = identityByPlayerId.get(member.playerId);
  return {
    playerId: member.playerId,
    displayName: identity?.displayName ?? "שחקן",
    username: identity?.username ?? null,
    appointedAt: member.appointedAt.toISOString(),
  };
}

// STAFF / MODERATION — PHASE 6 — the one read model app/(game)/admin/
// staff/page.tsx renders from. Reuses Phase 2's getStaffMembersByRole
// (staff-role.service.ts) directly — the CANONICAL StaffMember data, per
// this phase's own explicit instruction — never a second, independently
// -maintained "who is staff" query. `deputySlotsAvailable`/
// `supportSlotsAvailable` are derived from the SAME STAFF_LIMITS constant
// appointStaffRole's own roster-cap guard enforces (staff-roles.config.ts)
// — purely informational display here; the real cap is still only ever
// enforced by that guarded transaction, never recomputed or duplicated in
// this view or in the UI that reads it.
export async function getStaffRosterView(): Promise<StaffRosterView> {
  const [owners, deputies, supports] = await Promise.all([
    getStaffMembersByRole("OWNER"),
    getStaffMembersByRole("DEPUTY"),
    getStaffMembersByRole("SUPPORT"),
  ]);

  const allPlayerIds = [...owners, ...deputies, ...supports].map((member) => member.playerId);
  const identityByPlayerId = await getPlayerIdentitiesByIds(allPlayerIds);

  return {
    owner: owners[0] ? toView(owners[0], identityByPlayerId) : null,
    deputy: deputies[0] ? toView(deputies[0], identityByPlayerId) : null,
    support: supports.map((member) => toView(member, identityByPlayerId)),
    deputySlotsAvailable: Math.max(0, STAFF_LIMITS.DEPUTY - deputies.length),
    supportSlotsAvailable: Math.max(0, STAFF_LIMITS.SUPPORT - supports.length),
  };
}
