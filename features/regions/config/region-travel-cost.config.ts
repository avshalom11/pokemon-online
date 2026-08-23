import type { RegionId } from "@/shared/types/region";

// REGION TRAVEL COST — the one place these prices are ever tuned. Cost is
// determined ONLY by the destination region (never the origin, never
// whether the player has visited it before) and is charged every single
// time the player actually changes to a different region — this is NOT a
// one-time unlock; every region stays reachable from account creation
// (see region-registry.ts's own "all available from the start" note).
// Read exclusively by region.service.ts's travelToRegion — never
// duplicated into UI or action code, so a price change is always this one
// line.
export const REGION_TRAVEL_COST: Record<RegionId, number> = {
  kanto: 200,
  johto: 300,
  hoenn: 400,
  sinnoh: 500,
  unova: 600,
  kalos: 700,
  alola: 800,
  galar: 900,
  paldea: 1000,
};

export function getRegionTravelCost(regionId: RegionId): number {
  return REGION_TRAVEL_COST[regionId];
}
