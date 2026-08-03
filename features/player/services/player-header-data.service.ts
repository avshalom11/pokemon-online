import "server-only";

import { getPlayerProgress } from "@/features/player-progression/progression-calculations";
import type { PlayerProgress } from "@/features/player-progression/progression-types";
import { getRegionDefinition } from "@/features/regions/data/region-registry";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import { toRegionId } from "@/shared/types/region";

export interface PlayerHeaderData {
  displayName: string;
  // Null only if the session somehow lacks one (never expected in
  // practice — registration always sets it) — PlayerProfileLink already
  // renders a safe non-interactive fallback for that case.
  username: string | null;
  regionLabel: string;

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
// DB round trip per request, not two. `username` is passed in rather than
// independently queried — the caller already has it from getCurrentSession()
// (better-auth's own session.user), so this never needs its own User table
// read just for that one field.
export async function getPlayerHeaderData(userId: string, username: string | null): Promise<PlayerHeaderData> {
  const profile = await getPlayerProfile(userId);

  return {
    displayName: profile.displayName,
    username,
    // The Region Registry's englishName, never REGION_LABELS[regionId]
    // (still Hebrew everywhere else, e.g. the public profile page's own
    // regionLabel in public-profile-view.service.ts) — this header display
    // is the one place asked to show the English region name ("Kanto",
    // "Johto", ...) instead. Reads the player's actual active region rather
    // than a hardcoded value, so this updates the moment
    // features/regions/actions/select-region.action.ts changes it.
    regionLabel: getRegionDefinition(toRegionId(profile.regionId)).englishName,
    progress: getPlayerProgress(profile.experience),
    coins: profile.coins,
    gold: profile.gold,
  };
}
