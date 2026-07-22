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
