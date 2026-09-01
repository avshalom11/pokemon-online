import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { resolveSiteBanRedirectPath } from "@/features/moderation/services/site-access.service";
import { auth } from "@/lib/auth/auth";
import { ensurePlayerProfile } from "@/lib/auth/player-profile";
import { prisma } from "@/lib/db/prisma";

// The one real (secure, server-side) session check every protected page
// should use. Cached per-request via React's cache() so multiple call sites
// in the same render pass don't each hit the database separately.
//
// Also self-heals a missing PlayerProfile — see lib/auth/player-profile.ts
// for why the registration-time hook alone isn't a strong enough guarantee.
// AUTH SESSION PERFORMANCE — this used to call ensurePlayerProfile's upsert
// unconditionally on every single request (a real DB WRITE — WAL + lock +
// a new MVCC tuple version — even though `update: {}` never actually
// changes anything for the 99.99% of requests where the profile already
// exists). Now it's a plain, minimal-column read first; the upsert only
// ever runs on the genuinely-missing path (the hook having failed, or a
// request landing between signup and the hook's post-commit write). Never
// shares getPlayerProfile's own cache()'d call for this check — reusing a
// function whose signature is findUniqueOrThrow would let a single missing-
// profile request memoize a REJECTED result for the rest of that same
// request, so any later getPlayerProfile(userId) call in that request would
// replay the stale rejection even after ensurePlayerProfile just created
// the row a moment earlier. This own dedicated query never touches that
// cache entry, so no caller anywhere can observe stale identity/player data.
export const getCurrentSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    const user = session.user as {
      id: string;
      name: string;
      username?: string | null;
      displayUsername?: string | null;
    };

    const existingProfile = await prisma.playerProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    const profileId = existingProfile
      ? existingProfile.id
      : (await ensurePlayerProfile(user.id, user.displayUsername ?? user.username ?? user.name ?? "שחקן")).id;

    // STAFF / MODERATION — PHASE 4 — SITE BAN ENFORCEMENT. The one
    // universal chokepoint: every protected page (via app/(game)/layout.tsx,
    // which calls this function first) and every authenticated Server
    // Action across the whole codebase (each already calls this function
    // itself at its own entry — the established "session validation, then
    // delegate to a service" convention, e.g. features/chat/actions/
    // global-chat.actions.ts) is protected by this one check, with zero
    // per-call-site wiring — exactly what makes it impossible to bypass
    // merely by calling a Server Action directly instead of navigating a
    // page.
    //
    // resolveSiteBanRedirectPath (features/moderation/services/
    // site-access.service.ts) does the actual DB lookup (never trusting
    // anything cached — a fresh query every call, regardless of Better
    // Auth's own 5-minute cookie cache for the session itself) and is the
    // unit-tested piece; redirect() itself is a three-line, obviously-
    // correct call, reviewed by inspection (see lib/auth/
    // stale-session-redirect-loop.test.ts's own doc comment for why: it
    // pulls in next/navigation + next/headers, neither importable under
    // this project's plain node:test runner).
    //
    // NO RECURSION: resolveSiteBanRedirectPath -> isSiteBanned/
    // isPermanentlySiteBanned (features/moderation/services/active-ban.
    // service.ts) touch nothing but `prisma` directly — no call back into
    // getCurrentSession, getPlayerProfile, or any other lib/auth/ export,
    // so this can never loop back on itself. app/banned/page.tsx (the
    // redirect target) deliberately never calls this function either — it
    // resolves its own session via a raw `auth.api.getSession()` call, so
    // a banned user visiting /banned can never be redirected back to
    // /banned by this check.
    //
    // A staff member (OWNER/DEPUTY/SUPPORT) authenticates through this
    // exact same path, completely unmodified — this check only ever
    // fires for a player who actually has an active site ban, which
    // hierarchy already makes impossible for OWNER and requires an
    // explicit OWNER action for DEPUTY/SUPPORT; there is no staff-specific
    // branch here to keep in sync.
    const redirectPath = await resolveSiteBanRedirectPath(profileId);
    if (redirectPath) {
      redirect(redirectPath);
    }
  }

  return session;
});

// FIELD BATTLE PERFORMANCE — a lighter session check for hot, repeat-call
// paths where the caller is guaranteed to have already passed through a
// full getCurrentSession() very recently in the SAME browser session — see
// battle-action.action.ts's own call site (one of several today — see
// STAFF / MODERATION — PHASE 7 note below for the full list) for why that
// guarantee holds there: reaching the battle screen at all requires
// app/(game)/layout.tsx and app/(game)/battle/page.tsx to have both already
// called the full getCurrentSession() (and therefore already self-healed
// any missing PlayerProfile) moments earlier, before a single attack click
// is even possible. Every subsequent attack click is its own separate
// Server Action request, so the unconditional per-request self-heal check
// was otherwise re-paying that same already-satisfied guarantee on every
// single turn of a battle that can run for many consecutive attacks.
//
// Never use this as the first/only session check reachable from a fresh
// page load or any entry point that doesn't already sit behind a page that
// calls the real getCurrentSession() — doing so would drop the missing-
// profile self-heal guarantee for that path. Session/auth validation itself
// (auth.api.getSession) is completely unchanged; only the profile
// existence check is skipped.
//
// STAFF / MODERATION — PHASE 7 — SECURITY REVIEW FINDING, FIXED. This
// function is reached by real mutations, not just reads: field-battle
// attacks (features/battle/actions/battle-action.action.ts), Gym/Regional
// battle turns/switches/item-use (features/gyms/actions/gym-battle.
// actions.ts), and League PvP turns/switches (features/leagues/actions/
// league-battle.actions.ts). Before this fix, NONE of them ever re-checked
// site-ban status: the missing-profile self-heal being safe to skip (the
// guarantee this function's own doc comment describes) does NOT imply the
// site-ban check is also safe to skip — a player who gets banned WHILE
// already mid-battle could otherwise keep submitting real attacks/turns
// through this exact path for as long as their client-side session
// resolves as valid (up to Better Auth's own 5-minute session cookie-cache
// window — lib/auth/auth.ts's session.cookieCache — even after
// site-ban.service.ts's own session revocation already deleted their
// underlying Session row). That is a real, if narrow, ban-enforcement
// bypass; the fix below closes it.
//
// The fix deliberately does NOT restore the missing-profile self-heal
// (still correctly skipped — that guarantee still holds) and does NOT call
// the full getCurrentSession(): it adds ONLY the one further check that
// must never be skipped anywhere reachable — the SAME always-fresh,
// never-cached resolveSiteBanRedirectPath query the real getCurrentSession
// already uses (features/moderation/services/site-access.service.ts) —
// gated behind one cheap, indexed PlayerProfile.userId lookup (skipped
// entirely, with no ban check at all, only in the "no profile" case this
// function's own self-heal guarantee already treats as never-expected-in-
// practice). Two small extra queries per hot-path call, not the full
// self-heal/write path this function exists to avoid.
export const getCurrentSessionFast = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    const profile = await prisma.playerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (profile) {
      const redirectPath = await resolveSiteBanRedirectPath(profile.id);
      if (redirectPath) {
        redirect(redirectPath);
      }
    }
  }

  return session;
});
