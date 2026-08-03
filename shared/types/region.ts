// Every player belongs to a region — a real, expandable union rather than a
// hardcoded string, so a new region is a type change here plus a label
// added to region-labels.ts and a definition added to the Region Registry
// (features/regions/data/region-registry.ts), never a UI string
// search-and-replace. Only "kanto" has a real map/zones so far — see the
// Registry's own `hasMap` flag for that.
export type RegionId =
  | "kanto"
  | "johto"
  | "hoenn"
  | "sinnoh"
  | "unova"
  | "kalos"
  | "alola"
  | "galar"
  | "paldea";

const ALL_REGION_IDS: readonly RegionId[] = [
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

// Defensive normalization for a value read back from PlayerProfile.regionId
// (a plain string column, not a Prisma enum — see that field's own doc
// comment in prisma/schema.prisma) — an unexpected/legacy value falls back
// to "kanto" rather than crashing a page render.
export function toRegionId(value: string): RegionId {
  return (ALL_REGION_IDS as readonly string[]).includes(value) ? (value as RegionId) : "kanto";
}
