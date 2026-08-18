import "server-only";

import { getGymBadgeDefinition } from "@/features/gyms/data/gym-badges";
import { REGION_GYM_SEQUENCE } from "@/features/gyms/data/region-gym-sequence";
import { getRegionalMedalDefinition } from "@/features/gyms/data/regional-medals";
import { getOwnedGymBadges, getOwnedRegionalMedals } from "@/features/gyms/services/gym-progression.service";
import type { ProfileAchievementsView, PublicBadgeView, PublicRegionalMedalView } from "../types/profile.types";

const GYM_NUMBERS = [1, 2, 3] as const;

// PROFILE ACHIEVEMENTS — the "הישגים" section's own data assembly.
// Deliberately takes `isOwner`/`showGymAchievementsOnProfile` as ALREADY-
// RESOLVED parameters rather than re-deriving them itself (e.g. by
// re-querying PlayerProfile) — the one caller, getPublicProfileView, has
// already coalesced the setting to a safe default and computed ownership
// exactly once; this function's only job is turning "is this viewer
// allowed to see achievements" + a playerId into the actual view, so it
// stays a small, independently testable unit with a single responsibility.
//
// SERVER-SIDE PRIVACY (section 9 of this feature's spec) — when the
// viewer is NOT allowed to see achievements, this function never even
// FETCHES the owned badges/medals, let alone returns them: `visibleToViewer:
// false` always pairs with genuinely empty arrays, computed BEFORE any
// database read. A hidden achievement count can therefore never leak to
// an unauthorized public profile view, and this is never just a
// React/CSS hiding concern.
//
// ORDERING (section 11) — badges follow the approved Gym progression
// order (REGION_GYM_SEQUENCE, region -> gymNumber 1/2/3 — the exact same
// source every other Gym unlock/lock-reason/image-numbering rule already
// reuses, never a second region-order table); medals follow the same
// region order. Never alphabetical.
export async function getProfileAchievementsView(
  playerId: string,
  options: { isOwner: boolean; showGymAchievementsOnProfile: boolean }
): Promise<ProfileAchievementsView> {
  const hiddenFromOtherUsers = !options.showGymAchievementsOnProfile;
  const visibleToViewer = options.isOwner || options.showGymAchievementsOnProfile;

  if (!visibleToViewer) {
    return { visibleToViewer: false, hiddenFromOtherUsers, badges: [], regionalMedals: [] };
  }

  const [ownedBadges, ownedMedalRegions] = await Promise.all([getOwnedGymBadges(playerId), getOwnedRegionalMedals(playerId)]);

  const badges: PublicBadgeView[] = [];
  for (const regionId of REGION_GYM_SEQUENCE) {
    for (const gymNumber of GYM_NUMBERS) {
      const owned = ownedBadges.some((badge) => badge.regionId === regionId && badge.gymNumber === gymNumber);
      if (!owned) continue;
      const definition = getGymBadgeDefinition(regionId, gymNumber);
      badges.push({ regionId, gymNumber, displayName: definition.displayName, imageUrl: definition.imageUrl });
    }
  }

  const ownedMedalRegionSet = new Set(ownedMedalRegions);
  const regionalMedals: PublicRegionalMedalView[] = REGION_GYM_SEQUENCE.filter((regionId) => ownedMedalRegionSet.has(regionId)).map(
    (regionId) => {
      const definition = getRegionalMedalDefinition(regionId);
      return { regionId, displayName: definition.displayName, imageUrl: definition.imageUrl };
    }
  );

  return { visibleToViewer: true, hiddenFromOtherUsers, badges, regionalMedals };
}
