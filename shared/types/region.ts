// Every player belongs to a region — a single value for now (everyone is
// "kanto"), but a real, expandable union rather than a hardcoded string, so
// a second region is a type change here plus a label added to
// region-labels.ts, never a UI string search-and-replace.
export type RegionId = "kanto";

const ALL_REGION_IDS: readonly RegionId[] = ["kanto"];

// Defensive normalization for a value read back from PlayerProfile.regionId
// (a plain string column, not a Prisma enum — see that field's own doc
// comment in prisma/schema.prisma) — an unexpected/legacy value falls back
// to "kanto" rather than crashing a page render.
export function toRegionId(value: string): RegionId {
  return (ALL_REGION_IDS as readonly string[]).includes(value) ? (value as RegionId) : "kanto";
}
