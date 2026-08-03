import type { RegionId } from "./region";

// Same "one dedicated label map per enum-like union" convention
// pokemon-labels.ts already established for PokemonType/PokemonRarity — a
// Record keyed by the full RegionId union, so adding a region is a compile
// error here until it's given a label.
export const REGION_LABELS: Record<RegionId, string> = {
  kanto: "מחוז קנטו",
  johto: "מחוז ג'וטו",
  hoenn: "מחוז הואן",
  sinnoh: "מחוז סינו",
  unova: "מחוז יונובה",
  kalos: "מחוז קאלוס",
  alola: "מחוז אלולה",
  galar: "מחוז גאלר",
  paldea: "מחוז פלדיאה",
};
