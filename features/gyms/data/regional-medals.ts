import type { RegionId } from "@/shared/types/region";
import { getRegionalMedalImageUrl } from "./gym-badge-images";

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
  // GYM BADGES / MEDALS — SIMPLE NUMERIC IMAGE ARCHITECTURE (later task) —
  // deterministically derived via getRegionalMedalImageUrl
  // (gym-badge-images.ts, the one source of truth for this path), never
  // computed/hardcoded a second time here.
  readonly imageUrl: string;
}

function buildMedalDefinition(regionId: RegionId): RegionalMedalDefinition {
  const displayRegionName = regionId.charAt(0).toUpperCase() + regionId.slice(1);
  const id = `${regionId}-medal`;

  return {
    id,
    regionId,
    displayName: `${displayRegionName} Regional Medal`,
    imageUrl: getRegionalMedalImageUrl(regionId),
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
