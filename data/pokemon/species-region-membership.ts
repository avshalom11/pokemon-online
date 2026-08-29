import { getAllRegionsWithZoneData, getZoneData } from "@/data/zones/zone-data";
import { POKEMON_BY_REGION } from "./pokemon-region-registry";
import type { PokemonSpecies } from "@/shared/types/pokemon";
import type { RegionId } from "@/shared/types/region";

// POKÉDEX / MY POKÉMON — REGION FILTER. This project has no per-species
// region field; "which region does a species belong to" is answered by
// TWO existing, independent canonical sources, never a new/duplicated
// species -> region table:
//   1. its HOME region — whichever generation-N-pokemon-data.ts array it's
//      physically placed in (pokemon-region-registry.ts's own
//      POKEMON_BY_REGION) — deliberately NOT a dexNumber/generation formula
//      (see that file's own doc comment: regional Forms and the Hisuian
//      evolution-only species would be misclassified by one).
//   2. every region whose OWN real zone encounter tables also place it as
//      a wild encounter (data/zones/zone-data.ts — the exact same data
//      getSpeciesEncounterLocations already derives its own per-species
//      answer from, reused here rather than re-scanned per call since the
//      UI filters below call this once per species per render, far more
//      often than that function's own original caller).
// A species' real region membership is the UNION of both — never just one
// or the other — so a region filter correctly matches a species that's
// "at home" in one region but also genuinely encounterable in another,
// without ever inventing a species -> region relationship the game's own
// data doesn't already establish.

// speciesId -> its home region — built once at module load, same
// "reverse index over an existing canonical table" precedent
// engine/encounter-rarity's SPECIES_RARITY_BY_ID and engine/encounter's
// SPRITE_SOURCE_BY_SPECIES_ID already establish elsewhere in this project.
const HOME_REGION_BY_SPECIES_ID: Map<string, RegionId> = new Map(
  (Object.entries(POKEMON_BY_REGION) as Array<[RegionId, readonly PokemonSpecies[]]>).flatMap(([regionId, species]) =>
    species.map((currentSpecies) => [currentSpecies.id, regionId] as const)
  )
);

// speciesId -> every region whose own zone data places it as a wild
// encounter — built once by scanning every region's real zone tables, the
// same data engine/encounter/pokemon-encounter-engine.ts itself rolls
// against; never a hardcoded/second encounter list.
const ENCOUNTER_REGIONS_BY_SPECIES_ID: Map<string, Set<RegionId>> = new Map();
for (const regionId of getAllRegionsWithZoneData()) {
  for (const zone of getZoneData(regionId)) {
    for (const encounter of zone.encounters) {
      const existing = ENCOUNTER_REGIONS_BY_SPECIES_ID.get(encounter.pokemonId);
      if (existing) {
        existing.add(regionId);
      } else {
        ENCOUNTER_REGIONS_BY_SPECIES_ID.set(encounter.pokemonId, new Set([regionId]));
      }
    }
  }
}

// The pure merge step, deliberately decoupled from the data lookups above
// so it's directly unit-testable with synthetic inputs (see this file's
// own test) independent of whether any real species currently spans more
// than one region in the live data.
export function mergeSpeciesRegions(homeRegion: RegionId | undefined, encounterRegions: Iterable<RegionId>): RegionId[] {
  const regions = new Set<RegionId>(encounterRegions);
  if (homeRegion) regions.add(homeRegion);
  return Array.from(regions);
}

// Every region a species genuinely belongs to, per the two sources above —
// always at least one entry for a real, known species (its home region);
// empty only for an unrecognized speciesId, never a fabricated guess.
export function getSpeciesRegionIds(speciesId: string): RegionId[] {
  return mergeSpeciesRegions(HOME_REGION_BY_SPECIES_ID.get(speciesId), ENCOUNTER_REGIONS_BY_SPECIES_ID.get(speciesId) ?? []);
}

// The one predicate both the Pokédex and My Pokémon region filters use —
// true whenever `regionId` is ANY one of this species' valid regions
// (never restricted to just its home region), so a species genuinely
// placed in more than one region's zone data is never missed by either
// filter.
export function speciesBelongsToRegion(speciesId: string, regionId: RegionId): boolean {
  return getSpeciesRegionIds(speciesId).includes(regionId);
}
