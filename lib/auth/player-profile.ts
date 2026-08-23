import "server-only";

import { cache } from "react";

import { createNotification } from "@/features/notifications/services/notification-service";
import { STARTING_GOLD, STARTING_MONEY } from "@/features/currency/config/starting-balance.config";
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
//
// STARTING BALANCE — coins/gold are only ever set in the `create` branch
// below, never in `update` (which stays `{}`) — so this grant fires
// exactly once, the moment a PlayerProfile row is first created for an
// account, whether that's the common case (registration) or a later
// self-heal for an account that somehow reached a protected page with no
// profile yet. A player who already has a row is never touched by this
// function again, regardless of how many times it's called afterward.
export async function ensurePlayerProfile(userId: string, displayName: string) {
  await prisma.playerProfile.upsert({
    where: { userId },
    create: { userId, displayName, coins: STARTING_MONEY, gold: STARTING_GOLD },
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

// GYMS & LEAGUES PHASE 9 — bulk PlayerProfile.id -> displayName resolution
// (section 24). Gym/League features key everything by PlayerProfile.id
// ("playerId" throughout those features), never by the auth User.id
// getPlayerProfile above resolves — this is the one place a batch of those
// ids gets turned into safe display names for the UI (current champions,
// bracket match cards, achievement history), so no caller ever exposes a
// raw playerId or reaches into User/email itself.
export async function getPlayerProfilesByIds(playerIds: readonly string[]): Promise<Map<string, string>> {
  if (playerIds.length === 0) return new Map();
  const uniqueIds = [...new Set(playerIds)];
  const rows = await prisma.playerProfile.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, displayName: true } });
  return new Map(rows.map((row) => [row.id, row.displayName]));
}

// AUTH SECURITY — LOGIN RATE LIMITING's one bridge into game-domain data.
// lib/auth/ otherwise stays independent of features/ entirely (see
// PROJECT_RULES.md's own rule on lib/auth/'s scope) — this file is already
// the documented exception ("the one bridge is lib/auth/player-profile.ts"),
// so the security-lockout notification lives here rather than adding a
// second cross-boundary import into lib/auth/actions.ts itself, and rather
// than building a whole second notification subsystem just for this one
// call site (reuses features/notifications' existing createNotification).
//
// Called from loginAction (lib/auth/actions.ts) the ONE time a given
// (identifier, IP) pair's failed-attempt count newly crosses the lockout
// threshold — see login-lockout.ts's recordFailedLoginAttempt doc comment
// for why that's naturally exactly once per lock window. Resolves the
// REAL account only to decide whether anyone should be notified at all
// (an identifier with no matching account, or no PlayerProfile yet,
// notifies nobody) — this resolution never feeds back into the rate-limit
// decision or the response already sent to the client, so it can't turn
// into an account-existence oracle. Wrapped in one try/catch: a
// notification failure must never surface to (or block) the login flow.
// Deliberately never includes the requester's IP or any other security
// detail in the notification text — only the fact that a lockout happened.
export async function notifySecurityLoginLockout(identifierKey: string, isEmail: boolean): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: isEmail ? { email: identifierKey } : { username: identifierKey },
      select: { id: true },
    });
    if (!user) return;

    const profile = await prisma.playerProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (!profile) return;

    await prisma.$transaction((tx) =>
      createNotification(
        tx,
        profile.id,
        "SECURITY_LOGIN_LOCKOUT",
        "זוהו מספר ניסיונות התחברות כושלים לחשבון שלך."
      )
    );
  } catch {
    // Deliberately swallowed — see this function's own doc comment.
  }
}

export interface PlayerIdentity {
  displayName: string;
  // null only for the (never expected in practice) case where the
  // relation somehow doesn't resolve to a username — every real
  // registered player has one. Callers must treat this as "no safe link
  // target", never fall back to any other identifier.
  username: string | null;
}

// CLICKABLE USERNAMES — bulk PlayerProfile.id -> {displayName, username}
// resolution, for every UI surface that shows another player's name and
// needs to link it to their public profile (/profile/[username] — the
// route is keyed by username, not PlayerProfile.id). A superset of
// getPlayerProfilesByIds above (same bulk-by-id shape, same callers'
// existing pattern) — kept as a SEPARATE function rather than changing
// that one's return shape, since dozens of existing call sites (Global
// Chat, Leagues, Gyms, ...) only ever need displayName and would have to
// be touched for no reason if its signature changed.
export async function getPlayerIdentitiesByIds(playerIds: readonly string[]): Promise<Map<string, PlayerIdentity>> {
  if (playerIds.length === 0) return new Map();
  const uniqueIds = [...new Set(playerIds)];
  const rows = await prisma.playerProfile.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, displayName: true, user: { select: { username: true } } },
  });
  return new Map(rows.map((row) => [row.id, { displayName: row.displayName, username: row.user?.username ?? null }]));
}
