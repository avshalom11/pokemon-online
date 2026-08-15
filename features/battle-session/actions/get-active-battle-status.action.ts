"use server";

import { hasActiveBattleSession } from "@/features/battle-session/services/battle-session.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// Re-checks the caller's own real FieldBattleSession existence — the one
// safe way BattleContent can find out, on unmount, whether the sidebar's
// battle-lock should actually release. Leaving /battle (a route change,
// browser Back, or any other unmount) does NOT by itself end a session —
// only escape, capture, or a full party defeat does (see
// endBattleSessionAction's own doc comment) — so unmounting can never be
// trusted on its own to mean "the battle is over." No session data is
// duplicated here: this is a thin, one-call wrapper around the exact same
// hasActiveBattleSession check app/(game)/layout.tsx already uses to seed
// the sidebar on a fresh page load.
export async function getActiveBattleStatusAction(): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) return false;

  const profile = await getPlayerProfile(session.user.id);
  return hasActiveBattleSession(profile.id);
}
