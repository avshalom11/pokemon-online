import type { RegionId } from "@/shared/types/region";
import { REGION_GYMS } from "./gym-registry";

// GYMS & LEAGUES PHASE 1 — 27 Gym Badge definitions (3 per region x 9
// regions), one per GymDefinition (gym-registry.ts). Badges are
// progression achievements, NOT normal inventory items: non-sellable,
// non-tradeable, non-consumable, awarded exactly once per (player, region,
// gymNumber) by markGymBattleCompleted (gym-progression.service.ts) —
// never through the Inventory/Shop system. This file only defines the
// catalog of what a badge IS; PlayerGymBadge (prisma/schema.prisma) is
// what a player actually HOLDS.
//
// Artwork does not exist yet — see imageUrl's own doc comment below for the
// exact expected path convention and where to place the real files later.
export interface GymBadgeDefinition {
  // Stable id, e.g. "kanto-gym-1" — same id as the matching GymDefinition
  // (gym-registry.ts), so the two are always trivially cross-referenced.
  readonly id: string;
  readonly regionId: RegionId;
  readonly gymNumber: 1 | 2 | 3;
  readonly displayName: string;
  // Deterministic, not-yet-populated artwork path — mirrors this project's
  // existing /images/<category>/... convention (e.g. /images/eggs/common.png,
  // /images/chests/gold.png). Place the real file at this exact path once
  // artwork exists; nothing else needs to change. One subfolder per region
  // (9 folders x 3 files) rather than one flat 27-file folder, so a
  // region's own badge set stays visually grouped on disk.
  readonly imageUrl: string;
}

function buildBadgeDefinition(regionId: RegionId, gymNumber: 1 | 2 | 3): GymBadgeDefinition {
  const gym = REGION_GYMS[regionId][gymNumber - 1];
  const displayRegionName = regionId.charAt(0).toUpperCase() + regionId.slice(1);
  const displayTypeName = gym.typeSpecialization.charAt(0).toUpperCase() + gym.typeSpecialization.slice(1);

  return {
    id: gym.id,
    regionId,
    gymNumber,
    displayName: `${displayRegionName} ${displayTypeName} Badge`,
    imageUrl: `/images/gyms/badges/${regionId}/${gym.id}.png`,
  };
}

const REGION_IDS_FOR_BADGES: readonly RegionId[] = [
  "kanto",
  "johto",
  "hoenn",
  "sinnoh",
  "unova",
  "kalos",
  "alola",
  "galar",
  "paldea",
];

// All 27 Gym Badge definitions, in region -> gymNumber order.
export const GYM_BADGE_DEFINITIONS: readonly GymBadgeDefinition[] = REGION_IDS_FOR_BADGES.flatMap((regionId) => [
  buildBadgeDefinition(regionId, 1),
  buildBadgeDefinition(regionId, 2),
  buildBadgeDefinition(regionId, 3),
]);

export function getGymBadgeDefinition(regionId: RegionId, gymNumber: 1 | 2 | 3): GymBadgeDefinition {
  // Same id-derivation as buildBadgeDefinition — recomputing here (instead
  // of a `.find()` over GYM_BADGE_DEFINITIONS) keeps this a cheap, direct
  // lookup with no risk of the catalog array and this helper ever
  // disagreeing about a specific badge's shape.
  return buildBadgeDefinition(regionId, gymNumber);
}
