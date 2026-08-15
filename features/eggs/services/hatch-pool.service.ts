import { getSpeciesForRegion } from "@/data/pokemon/pokemon-region-registry";
import type { PokemonSpecies, PokemonRarity } from "@/shared/types/pokemon";
import type { RegionId } from "@/shared/types/region";

// EGGS PHASE 4 — the hatch candidate pool for one (region, REAL rarity)
// pair. Deliberately built from the region registry (data/pokemon/
// pokemon-region-registry.ts — the same generation-array-is-region-
// ownership source of truth every other region-aware feature should use)
// filtered by each species' own real PokemonSpecies.rarity — never zone
// data, never encounterWeight, never effective/encounter rarity
// (engine/encounter-rarity), and never the player's current region. The
// egg's own stored regionId (set once at drop time — features/eggs/
// services/egg-drop.service.ts) is the only region this ever reads.
export function getHatchPool(regionId: RegionId, rarity: PokemonRarity): readonly PokemonSpecies[] {
  return getSpeciesForRegion(regionId).filter((species) => species.rarity === rarity);
}

// A uniform index roll over the pool — every matching species has exactly
// equal selection probability, never weighted by anything (in particular,
// never encounterWeight, which this function never even reads). Returns
// null when the pool is empty rather than falling back to another region
// or rarity tier — an empty region+rarity combination is a hard failure
// the caller must handle explicitly (features/eggs/services/hatch.service.ts),
// never a silent substitution.
export function rollHatchSpecies(
  regionId: RegionId,
  rarity: PokemonRarity,
  random: () => number = Math.random
): PokemonSpecies | null {
  const pool = getHatchPool(regionId, rarity);
  if (pool.length === 0) return null;

  const index = Math.floor(random() * pool.length);
  return pool[index];
}
