import "server-only";

import { prisma } from "@/lib/db/prisma";

// STAFF / MODERATION — PHASE 4 — SESSION REVOCATION. A plain Prisma delete
// against Better Auth's own Session table, called by
// features/moderation/services/site-ban.service.ts right after a
// temporary or permanent site ban is successfully issued, so an
// already-logged-in target is kicked out immediately rather than only on
// their next natural session refresh.
//
// WHY A PLAIN DELETE, NOT auth.$context.internalAdapter OR THE ADMIN
// PLUGIN — two other mechanisms exist in this codebase's dependency tree,
// both deliberately avoided:
//   - auth.$context.internalAdapter (what revokeSessionsOnPasswordReset
//     in lib/auth/auth.ts uses internally) is explicitly called out
//     elsewhere in this schema as undocumented internal Better Auth
//     surface this project avoids reaching into from application code
//     (see prisma/schema.prisma's AccountDeletionRequest doc comment,
//     written for exactly this reason in a different context) — the
//     Session table itself, unlike Verification, has no such caveat: it's
//     a plain, hand-queryable Prisma model this project already treats
//     like any other table (Account, User) rather than opaque internal
//     state.
//   - Better Auth's `admin` plugin ships a real revokeUserSessions
//     endpoint, but installing it would mean the User table gaining
//     role/banned/banExpires columns — the exact "authorize by username"-
//     adjacent, CLI-regenerated-schema entanglement this feature's own
//     architecture audit (Phase 0) deliberately avoided in favor of a
//     hand-owned StaffMember/ModerationAction design. Not worth pulling in
//     just for this one call.
//
// Deliberately the ENTIRE lib/auth/ surface this file exposes to
// features/moderation/ — a narrow, single-purpose bridge (mirrors
// lib/auth/player-profile.ts's own "the one bridge" role, just for
// session lifecycle instead of profile creation), never a general-purpose
// session-management module.
//
// Best-effort by design, per this feature's own explicit split: this is
// the IMMEDIATE kick-out UX, not the authoritative guarantee — a site-
// banned user is unconditionally blocked on their very next request
// regardless of whether this call ever ran, by the fresh, always-current
// active-ban check inside getCurrentSession() (lib/auth/auth-session.ts).
// A caller whose own transaction/session-cache happens to still be "warm"
// for a few seconds is exactly the narrow gap this call closes; it is not
// what makes the ban real.
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
