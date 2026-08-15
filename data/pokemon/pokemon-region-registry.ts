import { GENERATION_1_POKEMON_DATA } from "./generation-1-pokemon-data";
import { GENERATION_2_POKEMON_DATA } from "./generation-2-pokemon-data";
import { GENERATION_3_POKEMON_DATA } from "./generation-3-pokemon-data";
import { GENERATION_4_POKEMON_DATA } from "./generation-4-pokemon-data";
import { GENERATION_5_POKEMON_DATA } from "./generation-5-pokemon-data";
import { GENERATION_6_POKEMON_DATA } from "./generation-6-pokemon-data";
import { GENERATION_7_POKEMON_DATA } from "./generation-7-pokemon-data";
import { GENERATION_8_POKEMON_DATA } from "./generation-8-pokemon-data";
import { GENERATION_9_POKEMON_DATA } from "./generation-9-pokemon-data";
import type { PokemonSpecies } from "@/shared/types/pokemon";
import type { RegionId } from "@/shared/types/region";

// EGGS PHASE 4 — the one place "which region does this species belong to"
// is ever answered, for anything that needs REAL regional ownership (never
// zone/encounter data, which is a separate, per-region *subset* concept —
// see data/zones/*.ts). This project has no per-species RegionId field;
// regional ownership is represented purely by which
// generation-N-pokemon-data.ts array a species is physically written into
// — see generation-4-pokemon-data.ts's own header comment, which explains
// why this is deliberately NOT a dexNumber-range formula: regional Forms
// (Paldean Wooper, Alolan Vulpix, Galarian Ponyta, Hisuian Growlithe, the
// Paldean Tauros breeds, ...) keep their BASE species' National Dex number
// while genuinely belonging to a different region, and the 7 Hisuian
// evolution-only species (#899-905) are explicitly Sinnoh-owned despite
// falling outside Sinnoh's own #387-493 dex span. A dexNumber-range check
// would misclassify every one of these; reusing the exact array each one
// is already correctly hand-placed in does not.
export const POKEMON_BY_REGION: Record<RegionId, readonly PokemonSpecies[]> = {
  kanto: GENERATION_1_POKEMON_DATA,
  johto: GENERATION_2_POKEMON_DATA,
  hoenn: GENERATION_3_POKEMON_DATA,
  sinnoh: GENERATION_4_POKEMON_DATA,
  unova: GENERATION_5_POKEMON_DATA,
  kalos: GENERATION_6_POKEMON_DATA,
  alola: GENERATION_7_POKEMON_DATA,
  galar: GENERATION_8_POKEMON_DATA,
  paldea: GENERATION_9_POKEMON_DATA,
};

// `?? []` rather than a direct index: every real RegionId has a populated
// entry above, but a caller that received an unnormalized/legacy region
// string (see shared/types/region.ts's own toRegionId doc comment for why
// that's a real, expected case for data read back from a DB column) must
// never crash here — an unrecognized region safely resolves to "no species
// belong to it" rather than throwing, matching this project's established
// "invalid -> safe empty fallback" convention.
export function getSpeciesForRegion(regionId: RegionId): readonly PokemonSpecies[] {
  return POKEMON_BY_REGION[regionId] ?? [];
}
