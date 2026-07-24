"use server";

import { getPlayerProgress } from "@/features/player-progression/progression-calculations";
import type { PlayerProgress } from "@/features/player-progression/progression-types";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// On-demand authoritative re-fetch of the player's current progression —
// deliberately separate from getPlayerHeaderData (which also reads
// displayName/coins/gold and is meant for the layout's own initial
// server-render). This is the background call BattleContent's
// handleReturnToMap fires when leaving battle (escape, capture, party
// defeat): every in-battle reward already pushes its own response straight
// into the shared header state the instant it resolves (see
// features/player/context/player-progression-context.tsx), so this is only
// a final confirm-against-the-DB pass for the rare case where the last
// reward call was still in flight at the moment the player left — never
// awaited by the exit itself, so it can never delay leaving the battle
// screen.
export async function getPlayerProgressAction(): Promise<PlayerProgress | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  const profile = await getPlayerProfile(session.user.id);
  return getPlayerProgress(profile.experience);
}
