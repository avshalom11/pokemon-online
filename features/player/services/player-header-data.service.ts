import "server-only";

import { getPlayerProgress } from "@/features/player-progression/progression-calculations";
import type { PlayerProgress } from "@/features/player-progression/progression-types";
import { formatTrainerId } from "@/features/home/services/trainer-id";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export interface PlayerHeaderData {
  displayName: string;
  trainerId: string;

  // The header's level/XP display never reads this directly after the
  // initial server render — it's only the seed value for
  // features/player/context/player-progression-context.tsx, which is what
  // GameHeader actually consumes (and what battle updates live, without a
  // refresh). Kept as the exact PlayerProgress shape, not a reshaped
  // level/xp/remainingXp trio, so there is exactly one progression shape to
  // pass around between the server render and the client context.
  progress: PlayerProgress;

  coins: number;
  gold: number;
}

// The single authoritative data source for the global game header
// (components/layout/GameHeader.tsx), fetched once by app/(game)/layout.tsx.
// getPlayerProfile is cache()-wrapped (lib/auth/player-profile.ts), so this
// sharing the profile row with each page's own view-data service costs one
// DB round trip per request, not two.
export async function getPlayerHeaderData(userId: string): Promise<PlayerHeaderData> {
  const profile = await getPlayerProfile(userId);

  return {
    displayName: profile.displayName,
    trainerId: formatTrainerId(profile.id),
    progress: getPlayerProgress(profile.experience),
    coins: profile.coins,
    gold: profile.gold,
  };
}
