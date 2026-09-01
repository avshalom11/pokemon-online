import "server-only";

import { isStaffRole, STAFF_LIMITS } from "@/features/moderation/config/staff-roles.config";
import type { PlayerStaffRole, StaffRole } from "@/features/moderation/types";
import { prisma } from "@/lib/db/prisma";

// The one fixed id StaffRosterCounter's singleton row always uses (see
// prisma/schema.prisma's own doc comment on that model).
const STAFF_ROSTER_COUNTER_ID = "global";

// Lazily creates the singleton counter row the first time it's needed —
// same "ensure-on-access, harmless no-op after the first call" idiom
// lib/auth/player-profile.ts's ensurePlayerProfile already establishes.
// Must always be called INSIDE the same transaction as the guarded
// updateMany below, never on its own — a separate transaction here would
// reopen exactly the COUNT-then-INSERT race this mechanism exists to
// close.
async function ensureStaffRosterCounter(tx: Pick<typeof prisma, "staffRosterCounter">): Promise<void> {
  await tx.staffRosterCounter.upsert({
    where: { id: STAFF_ROSTER_COUNTER_ID },
    create: { id: STAFF_ROSTER_COUNTER_ID },
    update: {},
  });
}

// Looked up fresh from the database on every call (never cached/trusted
// from a client) — the one function every hierarchy/permission check in
// this feature is meant to be built on (see
// features/moderation/permissions/staff-permissions.ts's
// canModerateTarget/getStaffPermissions, both of which take an
// already-resolved StaffRole rather than a playerId, specifically so they
// stay pure and don't each re-implement this lookup).
export async function getStaffRole(playerId: string): Promise<StaffRole | null> {
  const row = await prisma.staffMember.findUnique({
    where: { playerId },
    select: { role: true },
  });
  if (!row) return null;
  // STAFF / MODERATION — PHASE 2 — never trust a raw DB string, same
  // "validated at the app layer" rule every no-Prisma-enum column in this
  // codebase already follows (see prisma/schema.prisma's own doc comments
  // on StaffMember.role and every other status-ish column). In correct
  // operation this can never actually fire — appointStaffRole and the
  // one-time OWNER bootstrap are the only writers, and both only ever
  // write a real StaffRole — but a corrupted/hand-edited row must fail
  // loudly here rather than silently granting whatever permissions
  // getStaffPermissions happens to resolve for an unrecognized value.
  if (!isStaffRole(row.role)) {
    throw new Error(`getStaffRole: player ${playerId} has an invalid persisted role "${row.role}"`);
  }
  return row.role;
}

// STAFF / MODERATION — PHASE 2 — the exhaustive-switch-friendly wrapper
// around getStaffRole above: returns the literal "PLAYER" instead of
// null for a player with no StaffMember row, for callers that want to
// switch/compare over the full OWNER | DEPUTY | SUPPORT | PLAYER set
// without a separate null check. getStaffRole itself remains the
// canonical lookup (and the one getStaffPermissions/canModerateTarget are
// built against) — this is purely an additive convenience.
export async function getPlayerStaffRole(playerId: string): Promise<PlayerStaffRole> {
  return (await getStaffRole(playerId)) ?? "PLAYER";
}

// STAFF / MODERATION — PHASE 5 — bulk playerId -> StaffRole resolution,
// for a UI surface that needs to show a moderation affordance next to
// MANY players at once (Global Chat's own per-message ⋮ menu —
// features/chat/services/global-chat.service.ts's own toView) without one
// getStaffRole round trip per row. Absent players simply don't appear in
// the returned Map (same "no key = not staff" convention getStaffRole's
// own `null` return already establishes for a single lookup) — never a
// placeholder null value stored for every non-staff id, which would make
// this scale with total message count instead of actual staff count.
export async function getStaffRolesByPlayerIds(playerIds: readonly string[]): Promise<Map<string, StaffRole>> {
  if (playerIds.length === 0) return new Map();
  const uniqueIds = [...new Set(playerIds)];
  const rows = await prisma.staffMember.findMany({
    where: { playerId: { in: uniqueIds } },
    select: { playerId: true, role: true },
  });
  const result = new Map<string, StaffRole>();
  for (const row of rows) {
    if (isStaffRole(row.role)) result.set(row.playerId, row.role);
  }
  return result;
}

export interface StaffMemberRecord {
  id: string;
  playerId: string;
  role: StaffRole;
  appointedByPlayerId: string | null;
  appointedAt: Date;
}

export type AppointStaffRoleError = "already-staff" | "role-cap-reached" | "cannot-appoint-owner";
export type AppointStaffRoleResult = { ok: true; staffMember: StaffMemberRecord } | { ok: false; error: AppointStaffRoleError };

// STAFF CAP CONCURRENCY — the transaction-safe mechanism the max-1-DEPUTY/
// max-3-SUPPORT caps rely on. Deliberately NOT "COUNT StaffMember rows of
// this role, then INSERT if under the cap" (two concurrent OWNER requests
// could both read the same pre-insert count and both pass) — instead, a
// single guarded conditional `updateMany` against StaffRosterCounter
// (`WHERE id = "global" AND <role>Count < <cap>`, incrementing atomically
// in the same statement) is the actual gate: Postgres only ever lets ONE
// of two concurrent transactions targeting the same row's same column
// past that WHERE clause, so `guarded.count` can only ever be 1 for the
// winner and 0 for the loser — exactly the same CAS idiom this codebase's
// AccountDeletionRequest.consumedAt/LeagueTournament.rewardsGrantedAt
// already establish. The StaffMember row is only ever created AFTER that
// guard succeeds, in the same transaction.
//
// This is intentionally the ONLY place that creates a StaffMember row for
// DEPUTY/SUPPORT — OWNER is never appointed through this function (its
// role parameter is typed to exclude "OWNER" entirely, AND — STAFF /
// MODERATION PHASE 2 — enforced again at RUNTIME below, not just by the
// type: a caller reaching this function from a boundary where the type
// system doesn't protect, e.g. an unvalidated request body cast past the
// TS type, must still be rejected. This is what makes "a second OWNER can
// never be created through the normal staff appointment flow" a real,
// unconditional guarantee rather than a compile-time-only one). OWNER
// assignment is a deliberately separate, one-time, explicitly-reviewed
// bootstrap (a raw prisma.staffMember.create call, performed once outside
// this service entirely — see this project's own Phase 2 bootstrap),
// specifically so there is never a code path — this one included — that
// could accidentally grant a second OWNER or treat OWNER as just another
// cap-limited role. Authorization (only OWNER may call this for
// DEPUTY/SUPPORT) is otherwise the CALLER's responsibility, exactly like
// every other service in this codebase that trusts an already-resolved,
// already-authorized identity from its Server Action layer (e.g.
// global-chat.service.ts's sendGlobalChatMessage trusting the playerId
// its action wrapper already resolved from a real session) — this
// function does not itself re-check staff-permissions.ts's own
// canChangeStaffRole hierarchy/self-target rules.
export async function appointStaffRole(params: {
  targetPlayerId: string;
  role: Exclude<StaffRole, "OWNER">;
  appointedByPlayerId: string;
}): Promise<AppointStaffRoleResult> {
  // Runtime guard — see this function's own doc comment above for why
  // this must not rely on the `Exclude<StaffRole, "OWNER">` type alone.
  if ((params.role as string) === "OWNER") {
    return { ok: false, error: "cannot-appoint-owner" };
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.staffMember.findUnique({ where: { playerId: params.targetPlayerId } });
    if (existing) return { ok: false, error: "already-staff" };

    await ensureStaffRosterCounter(tx);

    const counterField = params.role === "DEPUTY" ? "deputyCount" : "supportCount";
    const cap = STAFF_LIMITS[params.role];
    const guarded = await tx.staffRosterCounter.updateMany({
      where: { id: STAFF_ROSTER_COUNTER_ID, [counterField]: { lt: cap } },
      data: { [counterField]: { increment: 1 } },
    });
    if (guarded.count === 0) return { ok: false, error: "role-cap-reached" };

    const staffMember = await tx.staffMember.create({
      data: { playerId: params.targetPlayerId, role: params.role, appointedByPlayerId: params.appointedByPlayerId },
    });
    return { ok: true, staffMember: staffMember as StaffMemberRecord };
  });
}

export type RemoveStaffRoleError = "not-staff" | "cannot-remove-owner";
export type RemoveStaffRoleResult = { ok: true } | { ok: false; error: RemoveStaffRoleError };

// The mirror of appointStaffRole above — decrements the SAME
// StaffRosterCounter field, in the same transaction as the StaffMember
// delete, so the two never drift apart. Unlike appointment, removal needs
// no CAS guard on the counter itself (decrementing can never violate a
// cap the way incrementing can), only the existence/role checks below.
// OWNER can never be removed through this function — a defense-in-depth
// backstop behind staff-permissions.ts's own canChangeStaffRole
// "target-is-owner" rejection, since this service — like appointStaffRole
// above — does not itself re-run that caller-side authorization check.
export async function removeStaffRole(params: { targetPlayerId: string }): Promise<RemoveStaffRoleResult> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.staffMember.findUnique({ where: { playerId: params.targetPlayerId } });
    if (!existing) return { ok: false, error: "not-staff" };
    if (existing.role === "OWNER") return { ok: false, error: "cannot-remove-owner" };

    await ensureStaffRosterCounter(tx);
    const counterField = existing.role === "DEPUTY" ? "deputyCount" : "supportCount";
    await tx.staffRosterCounter.updateMany({
      where: { id: STAFF_ROSTER_COUNTER_ID },
      data: { [counterField]: { decrement: 1 } },
    });

    await tx.staffMember.delete({ where: { playerId: params.targetPlayerId } });
    return { ok: true };
  });
}

// Read-only helper for a future staff-list UI — never used by the cap
// guard itself (which reads StaffRosterCounter, not this), kept purely as
// a convenience for "who currently holds this role".
export async function getStaffMembersByRole(role: StaffRole): Promise<StaffMemberRecord[]> {
  const rows = await prisma.staffMember.findMany({ where: { role } });
  return rows as StaffMemberRecord[];
}
