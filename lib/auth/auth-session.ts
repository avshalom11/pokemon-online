import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import { ensurePlayerProfile } from "@/lib/auth/player-profile";

// The one real (secure, server-side) session check every protected page
// should use. Cached per-request via React's cache() so multiple call sites
// in the same render pass don't each hit the database separately.
//
// Also self-heals a missing PlayerProfile on every call — see
// lib/auth/player-profile.ts for why the registration-time hook alone isn't
// a strong enough guarantee.
export const getCurrentSession = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    const user = session.user as {
      id: string;
      name: string;
      username?: string | null;
      displayUsername?: string | null;
    };
    const displayName = user.displayUsername ?? user.username ?? user.name ?? "שחקן";
    await ensurePlayerProfile(user.id, displayName);
  }

  return session;
});

// FIELD BATTLE PERFORMANCE — a lighter session check for hot, repeat-call
// paths where the caller is guaranteed to have already passed through a
// full getCurrentSession() very recently in the SAME browser session — see
// battle-action.action.ts's own call site (the only caller today) for why
// that guarantee holds there: reaching the battle screen at all requires
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
export const getCurrentSessionFast = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});
