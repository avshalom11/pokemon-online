import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/db/prisma";

// Idempotent by design: safe to call every time a session is read, not just
// once at registration.
//
// Why this exists instead of relying solely on the databaseHooks.user.create
// .after hook in auth.ts: verified against the installed better-auth source
// (node_modules/better-auth/dist/db/with-hooks.mjs and
// node_modules/@better-auth/core/src/context/transaction.ts) that
// create.after hooks run via queueAfterTransactionHook, which only fires
// *after* the transaction that created the user has already committed — it
// is not part of that transaction. If the hook's write fails for any reason,
// the user row still exists with no profile, and there is no rollback.
//
// This upsert is the safe alternative: the hook still creates the profile
// immediately in the common case, but getCurrentSession() (auth-session.ts)
// also calls this on every protected-page load, so a missed profile
// self-heals on the user's very next request instead of leaving them stuck.
export async function ensurePlayerProfile(userId: string, displayName: string) {
  await prisma.playerProfile.upsert({
    where: { userId },
    create: { userId, displayName },
    update: {},
  });
}

// Plain read, used by call sites (onboarding redirect resolution, etc.) that
// only need the current row and should not implicitly create one — creation
// is ensurePlayerProfile's job alone, called once per request from
// getCurrentSession().
//
// cache()-wrapped (same pattern as getCurrentSession above it in
// auth-session.ts) so the several call sites that all fetch the same
// player's profile within one request — the (game) layout's header data and
// each page's own view-data service — collapse into a single DB round trip
// instead of one per caller.
export const getPlayerProfile = cache(async (userId: string) => {
  return prisma.playerProfile.findUniqueOrThrow({ where: { userId } });
});
