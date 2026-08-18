import "server-only";

import type { PokemonType } from "@/shared/types/pokemon";
import { toRegionId, type RegionId } from "@/shared/types/region";
import { MIN_GYM_PLAYER_LEVEL } from "../config/gym-access-rules.config";
import { getGymBadgeDefinition } from "../data/gym-badges";
import { getGymRewardDefinition, getRegionalChampionRewardDefinition, type GymRewardDefinition, type RegionalChampionRewardDefinition } from "../data/gym-reward-registry";
import { REGION_GYM_SEQUENCE, getPreviousRegionInGymSequence } from "../data/region-gym-sequence";
import { getRegionDefinition } from "@/features/regions/data/region-registry";
import { getRegionalMedalDefinition } from "../data/regional-medals";
import { getGymDefinition } from "../data/gym-registry";
import type { GymBattleSlotId } from "../types/gym.types";
import { getPlayerLevel } from "@/features/player-progression/progression-service";
import { prisma } from "@/lib/db/prisma";
import { getRegionGymProgress, isRegionGymSequenceUnlocked } from "./gym-progression.service";
import { getNpcBattleSession, type StartNpcBattleTarget } from "./gym-battle-session.service";
import type { NpcBattleSession } from "@/lib/generated/prisma/client";

// GYMS & LEAGUES PHASE 4 — the ONE server-side assembler for the /gyms
// page (section 5/7/8/9 of this Phase's spec). Composes Phase 1's own
// progress reads (getRegionGymProgress), the new Level-10/region-sequence
// gates (section 1/2), and the reward registry (gym-reward-registry.ts —
// the SAME table gym-reward.service.ts actually grants from, never a
// second copy) into one read-only view model. Never mutates anything;
// never starts/resolves a battle itself.

export interface GymBattleView {
  readonly battleSlot: GymBattleSlotId;
  readonly unlocked: boolean;
  readonly completed: boolean;
}

export interface RegionGymView {
  readonly gymId: string;
  readonly gymNumber: 1 | 2 | 3;
  readonly typeSpecialization: string;
  // GYMS & LEAGUES PHASE 9 (section 6) — the raw elemental type, so the UI
  // can reuse the project's own existing type-label/type-styling system
  // (shared/types/pokemon-labels.ts) rather than parsing it back out of
  // typeSpecialization's own display-name string above.
  readonly pokemonType: PokemonType;
  readonly unlocked: boolean;
  readonly badgeEarned: boolean;
  readonly badgeImageUrl: string;
  readonly battles: readonly GymBattleView[];
  // Only meaningful for the Leader battle — Easy/Medium have no numeric
  // reward (section 12), so this is always the SAME reward regardless of
  // which battle within the gym the UI is showing a preview for.
  readonly leaderRewardPreview: GymRewardDefinition;
  // GYMS & LEAGUES PHASE 9 (section 9) — true only for the ONE battle slot
  // (across the player's entire Gym journey — NpcBattleSession is globally
  // unique per player, gym-battle-session.service.ts) that the player's own
  // live NpcBattleSession, if any, actually targets. Lets the UI show
  // "המשך קרב" instead of "התחל קרב" for that exact slot, purely a read of
  // already-persisted state — never a new unlock/start rule.
  readonly hasActiveSession: readonly [boolean, boolean, boolean];
}

export interface RegionalChampionView {
  readonly championId: string;
  readonly unlocked: boolean;
  readonly defeated: boolean;
  readonly medalEarned: boolean;
  readonly medalImageUrl: string;
  readonly rewardPreview: RegionalChampionRewardDefinition;
  readonly hasActiveSession: boolean;
}

// GYMS & LEAGUES PHASE 9 (section 4/8) — one consolidated, presentation-only
// status per region, mechanically combined from the exact same booleans the
// page already rendered separately (lockReason/regionUnlocked, every Gym's
// own badgeEarned, the Regional Champion's own defeated flag) — never a new
// unlock rule, purely a read-only summary label for the region header.
export type RegionStatus = "locked-level" | "locked-previous-region" | "available" | "in-progress" | "completed";

function computeRegionStatus(lockReason: RegionGymLockReason, allBadgesEarned: boolean, championDefeated: boolean, anyBattleCompleted: boolean): RegionStatus {
  if (lockReason !== null) return lockReason;
  if (allBadgesEarned && championDefeated) return "completed";
  if (anyBattleCompleted) return "in-progress";
  return "available";
}

// One of the reasons a whole REGION's Gym progression can be locked —
// deliberately the same status strings startNpcBattle itself returns
// (StartNpcBattleResult), so the UI's lock-reason text and the server's own
// validation status can never drift out of sync into disagreeing meanings.
export type RegionGymLockReason = "locked-level" | "locked-previous-region" | null;

export interface RegionGymOverviewView {
  readonly regionId: RegionId;
  readonly englishName: string;
  readonly lockReason: RegionGymLockReason;
  // Only meaningful when lockReason === "locked-previous-region" — the
  // region whose Regional Champion must be defeated first. Threaded
  // through so the UI can build the exact "יש להשלים את מנהל מחוז X כדי
  // לפתוח את מכוני Y" message (gym-labels.ts's regionGymLockMessageHe)
  // without re-deriving the previous region itself.
  readonly previousRegionId: RegionId | null;
  readonly regionUnlocked: boolean;
  readonly regionStatus: RegionStatus;
  readonly gyms: readonly [RegionGymView, RegionGymView, RegionGymView];
  readonly regionalChampion: RegionalChampionView;
}

// GYMS & LEAGUES PHASE 9 (section 9) — which single battle slot (if any) the
// player's own live NpcBattleSession currently targets, read once per
// journey build and reused for every region rather than one query per Gym.
// Purely a read of Phase 3's existing session primitive — never starts,
// resumes, or otherwise mutates anything.
function activeSessionMatches(target: StartNpcBattleTarget, regionId: RegionId, gymNumber?: 1 | 2 | 3, battleSlot?: GymBattleSlotId): boolean {
  if (target.regionId !== regionId) return false;
  if (battleSlot !== undefined) {
    return target.source === "gym" && target.gymNumber === gymNumber && target.battleSlot === battleSlot;
  }
  return target.source === "regional-champion";
}

async function buildRegionOverview(
  playerId: string,
  playerLevel: number,
  regionId: RegionId,
  activeTarget: StartNpcBattleTarget | null
): Promise<RegionGymOverviewView> {
  const levelUnlocked = playerLevel >= MIN_GYM_PLAYER_LEVEL;
  const sequenceUnlocked = await isRegionGymSequenceUnlocked(playerId, regionId);

  const lockReason: RegionGymLockReason = !levelUnlocked ? "locked-level" : !sequenceUnlocked ? "locked-previous-region" : null;

  const progress = await getRegionGymProgress(playerId, regionId);

  const gyms = progress.gyms.map((gymProgress) => {
    const definition = getGymRewardDefinition(regionId, gymProgress.gymNumber);
    const badge = getGymBadgeDefinition(regionId, gymProgress.gymNumber);
    const pokemonType = getGymDefinition(regionId, gymProgress.gymNumber).typeSpecialization;
    return {
      gymId: definition.gymId,
      gymNumber: gymProgress.gymNumber,
      typeSpecialization: badge.displayName,
      pokemonType,
      // A region-level lock (level/sequence) overrides the within-region
      // Gym-order unlock the UI would otherwise show — a player below
      // Level 10, or in a region whose previous champion isn't defeated
      // yet, must never see Gym 1 itself as "available".
      unlocked: lockReason === null && gymProgress.unlocked,
      badgeEarned: gymProgress.badgeEarned,
      badgeImageUrl: badge.imageUrl,
      battles: gymProgress.battles.map((battle) => ({
        battleSlot: battle.battleSlot,
        unlocked: lockReason === null && battle.unlocked,
        completed: battle.completed,
      })),
      leaderRewardPreview: definition,
      hasActiveSession: gymProgress.battles.map((battle) =>
        activeTarget !== null && activeSessionMatches(activeTarget, regionId, gymProgress.gymNumber, battle.battleSlot)
      ) as unknown as readonly [boolean, boolean, boolean],
    } satisfies RegionGymView;
  }) as unknown as [RegionGymView, RegionGymView, RegionGymView];

  const medal = getRegionalMedalDefinition(regionId);
  const allBadgesEarned = gyms.every((gym) => gym.badgeEarned);

  return {
    regionId,
    englishName: getRegionDefinition(regionId).englishName,
    lockReason,
    previousRegionId: getPreviousRegionInGymSequence(regionId),
    regionUnlocked: lockReason === null,
    regionStatus: computeRegionStatus(
      lockReason,
      allBadgesEarned,
      progress.regionalChampionDefeated,
      gyms.some((gym) => gym.badgeEarned)
    ),
    gyms,
    regionalChampion: {
      championId: `${regionId}-champion`,
      unlocked: lockReason === null && progress.regionalChampionUnlocked,
      defeated: progress.regionalChampionDefeated,
      medalEarned: progress.regionalMedalEarned,
      medalImageUrl: medal.imageUrl,
      rewardPreview: getRegionalChampionRewardDefinition(regionId),
      hasActiveSession: activeTarget !== null && activeSessionMatches(activeTarget, regionId),
    },
  };
}

// Shared by getPlayerGymJourney and getPlayerCurrentRegionGymOverview so
// there is exactly one place an NpcBattleSession row is turned into a
// StartNpcBattleTarget.
function resolveActiveTarget(activeSession: NpcBattleSession | null): StartNpcBattleTarget | null {
  if (!activeSession) return null;
  return activeSession.battleSource === "gym"
    ? { source: "gym", regionId: activeSession.regionId as RegionId, gymNumber: activeSession.gymNumber as 1 | 2 | 3, battleSlot: activeSession.battleSlot as GymBattleSlotId }
    : { source: "regional-champion", regionId: activeSession.regionId as RegionId };
}

// The full 9-region Gym journey, always in REGION_GYM_SEQUENCE order (never
// hidden/filtered — this Phase's own spec, section 7, requires future
// regions be shown locked rather than omitted so the player can see the
// whole progression path). Still used as the general-purpose "every
// region's Gym data" read; the /gyms page itself now reads
// getPlayerCurrentRegionGymOverview below instead (region-scoped UI).
export async function getPlayerGymJourney(playerId: string): Promise<RegionGymOverviewView[]> {
  const [playerLevel, activeSession] = await Promise.all([getPlayerLevel(playerId), getNpcBattleSession(playerId)]);
  const activeTarget = resolveActiveTarget(activeSession);

  return Promise.all(REGION_GYM_SEQUENCE.map((regionId) => buildRegionOverview(playerId, playerLevel, regionId, activeTarget)));
}

// GYMS — REGION-SCOPED UI. The /gyms page's own data source (section 1 of
// this task's spec): only the player's CURRENT active region's Gym data,
// never the whole 9-region journey. "Current region" is always
// PlayerProfile.regionId — the same authoritative, server-side field
// World/Map already treat as the player's current region — read fresh here,
// never trusted from a client-supplied value. Delegates to the exact same
// buildRegionOverview every unlock/lock-reason rule already goes through
// (getPlayerGymJourney's own per-region builder, unmodified) — a region a
// player is currently "in" but hasn't unlocked yet (e.g. sequentially ahead
// of their own progress) still renders, correctly locked, exactly like
// every other not-yet-reached region already does in the full journey; this
// only changes how many of those 9 possible results get returned, never
// the unlock rule itself.
export async function getPlayerCurrentRegionGymOverview(playerId: string): Promise<RegionGymOverviewView> {
  const [profile, playerLevel, activeSession] = await Promise.all([
    prisma.playerProfile.findUniqueOrThrow({ where: { id: playerId }, select: { regionId: true } }),
    getPlayerLevel(playerId),
    getNpcBattleSession(playerId),
  ]);

  const regionId = toRegionId(profile.regionId);
  const activeTarget = resolveActiveTarget(activeSession);

  return buildRegionOverview(playerId, playerLevel, regionId, activeTarget);
}
