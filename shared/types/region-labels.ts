import type { RegionId } from "./region";

// Same "one dedicated label map per enum-like union" convention
// pokemon-labels.ts already established for PokemonType/PokemonRarity — a
// Record keyed by the full RegionId union, so adding a region is a compile
// error here until it's given a label.
export const REGION_LABELS: Record<RegionId, string> = {
  kanto: "מחוז קנטו",
};
