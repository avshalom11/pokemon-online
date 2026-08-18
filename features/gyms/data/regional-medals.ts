import type { RegionId } from "@/shared/types/region";

// GYMS & LEAGUES PHASE 1 — 9 Regional Medal definitions, one per region.
// Same "progression achievement, not an inventory item" rules as Gym
// Badges (gym-badges.ts): non-sellable, non-tradeable, non-consumable,
// awarded exactly once by markRegionalChampionDefeated
// (gym-progression.service.ts) after that region's Regional Champion is
// defeated. This file only defines the catalog; PlayerRegionalMedal
// (prisma/schema.prisma) is what a player actually holds.
export interface RegionalMedalDefinition {
  // Stable id, e.g. "kanto-medal".
  readonly id: string;
  readonly regionId: RegionId;
  readonly displayName: string;
  // Deterministic, not-yet-populated artwork path — same /images/<category>/
  // convention as gym-badges.ts's own imageUrl. Flat (one file per region,
  // no per-region subfolder) since there is exactly one Medal per region —
  // unlike Badges' 3-per-region grouping, nesting would add a directory
  // with a single file in it for no benefit.
  readonly imageUrl: string;
}

function buildMedalDefinition(regionId: RegionId): RegionalMedalDefinition {
  const displayRegionName = regionId.charAt(0).toUpperCase() + regionId.slice(1);
  const id = `${regionId}-medal`;

  return {
    id,
    regionId,
    displayName: `${displayRegionName} Regional Medal`,
    imageUrl: `/images/gyms/medals/${id}.png`,
  };
}

const REGION_IDS_FOR_MEDALS: readonly RegionId[] = [
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

// All 9 Regional Medal definitions.
export const REGIONAL_MEDAL_DEFINITIONS: readonly RegionalMedalDefinition[] =
  REGION_IDS_FOR_MEDALS.map(buildMedalDefinition);

export function getRegionalMedalDefinition(regionId: RegionId): RegionalMedalDefinition {
  return buildMedalDefinition(regionId);
}
