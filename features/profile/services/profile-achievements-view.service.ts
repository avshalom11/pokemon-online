import "server-only";

import { getGymBadgeDefinition } from "@/features/gyms/data/gym-badges";
import { REGION_GYM_SEQUENCE } from "@/features/gyms/data/region-gym-sequence";
import { getRegionalMedalDefinition } from "@/features/gyms/data/regional-medals";
import { getOwnedGymBadges, getOwnedRegionalMedals } from "@/features/gyms/services/gym-progression.service";
import { getLeagueDisplayNameHe } from "@/features/leagues/data/league-cycle-labels";
import { getPlayerLeagueAchievements, type LeaguePlayerAchievement } from "@/features/leagues/services/league-achievement.service";
import type { LeagueId } from "@/features/leagues/types/league.types";
import type { ProfileAchievementsView, PublicBadgeView, PublicLeagueAwardView, PublicRegionalMedalView } from "../types/profile.types";

const GYM_NUMBERS = [1, 2, 3] as const;

// LEAGUE AWARDS — the project's own fixed League order (league-1 ->
// champions-league — same order league-achievement-media.ts's own
// leagueAwardImageUrl and league-cycle-labels.ts's own CYCLE_WEEK_LABELS
// already use), so the Profile section always lists a player's League
// awards League-by-League rather than in raw achievement-earned order.
const LEAGUE_AWARD_ORDER: readonly LeagueId[] = ["league-1", "league-2", "league-3", "champions-league"];

// The established Hebrew placement wording LeaguesContent.tsx's own reward
// summary already uses (medal emoji + "מקום ראשון/שני/שלישי") — reused
// verbatim here rather than a second/duplicated placement label.
const PLACEMENT_LABEL: Record<1 | 2 | 3, string> = {
  1: "🥇 מקום ראשון",
  2: "🥈 מקום שני",
  3: "🥉 מקום שלישי",
};

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
// FETCHES the owned badges/medals/League awards, let alone returns them:
// `visibleToViewer: false` always pairs with genuinely empty arrays,
// computed BEFORE any database read. A hidden achievement count can
// therefore never leak to an unauthorized public profile view, and this is
// never just a React/CSS hiding concern. League Awards are gated by this
// EXACT SAME setting as Gym Badges/Regional Medals — there is still only
// one achievement-visibility toggle in this project, never a second one
// added for League awards specifically.
//
// ORDERING (section 11) — badges follow the approved Gym progression
// order (REGION_GYM_SEQUENCE, region -> gymNumber 1/2/3 — the exact same
// source every other Gym unlock/lock-reason/image-numbering rule already
// reuses, never a second region-order table); medals follow the same
// region order. League awards follow LEAGUE_AWARD_ORDER (league-1 ->
// champions-league) then placement (1st -> 3rd). Never alphabetical, never
// by achievement date.
export async function getProfileAchievementsView(
  playerId: string,
  options: { isOwner: boolean; showGymAchievementsOnProfile: boolean }
): Promise<ProfileAchievementsView> {
  const hiddenFromOtherUsers = !options.showGymAchievementsOnProfile;
  const visibleToViewer = options.isOwner || options.showGymAchievementsOnProfile;

  if (!visibleToViewer) {
    return { visibleToViewer: false, hiddenFromOtherUsers, badges: [], regionalMedals: [], leagueAwards: [] };
  }

  const [ownedBadges, ownedMedalRegions, leagueAchievements] = await Promise.all([
    getOwnedGymBadges(playerId),
    getOwnedRegionalMedals(playerId),
    getPlayerLeagueAchievements(playerId),
  ]);

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

  const leagueAwards = groupLeagueAwards(leagueAchievements);

  return { visibleToViewer: true, hiddenFromOtherUsers, badges, regionalMedals, leagueAwards };
}

// LEAGUE AWARDS — group the player's FULL placement history
// (getPlayerLeagueAchievements — LeagueTournamentPlacement remains the
// only source of truth, never re-derived or duplicated here) by
// (leagueId, place) so a player who earned the exact same League/placement
// across multiple tournament cycles renders ONE card with a `count`,
// never one duplicate card per win. A different placement in the SAME
// League (e.g. League I 1st place x3 AND League I 2nd place x2) always
// stays two separate groups — only an identical (leagueId, place) pair
// collapses together. `imageUrl` is read straight off the achievement
// itself (already resolved via league-achievement-media.ts's own
// leagueAwardImageUrl inside league-reward-registry.ts) — never
// recomputed here.
function groupLeagueAwards(achievements: readonly LeaguePlayerAchievement[]): PublicLeagueAwardView[] {
  const grouped = new Map<string, { leagueId: LeagueId; place: 1 | 2 | 3; imageUrl: string; count: number }>();

  for (const achievement of achievements) {
    const key = `${achievement.leagueId}:${achievement.place}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      grouped.set(key, { leagueId: achievement.leagueId, place: achievement.place, imageUrl: achievement.achievementImageUrl, count: 1 });
    }
  }

  const result: PublicLeagueAwardView[] = [];
  for (const leagueId of LEAGUE_AWARD_ORDER) {
    for (const place of [1, 2, 3] as const) {
      const entry = grouped.get(`${leagueId}:${place}`);
      if (!entry) continue;
      result.push({
        leagueId,
        place,
        leagueDisplayName: getLeagueDisplayNameHe(leagueId),
        placementLabel: PLACEMENT_LABEL[place],
        imageUrl: entry.imageUrl,
        count: entry.count,
      });
    }
  }
  return result;
}
