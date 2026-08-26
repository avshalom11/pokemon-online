import { ALOLA_ZONE_DATA } from "./alola-zone-data";
import { GALAR_ZONE_DATA } from "./galar-zone-data";
import { HOENN_ZONE_DATA } from "./hoenn-zone-data";
import { JOHTO_ZONE_DATA } from "./johto-zone-data";
import { KALOS_ZONE_DATA } from "./kalos-zone-data";
import { KANTO_ZONE_DATA } from "./kanto-zone-data";
import { PALDEA_ZONE_DATA } from "./paldea-zone-data";
import { SINNOH_ZONE_DATA } from "./sinnoh-zone-data";
import { UNOVA_ZONE_DATA } from "./unova-zone-data";
import type { RegionId } from "@/shared/types/region";
import type { Zone, ZoneId } from "@/shared/types/zone";

// The canonical region -> zone-data resolver (Phase 4) — the one place a
// region's own six-zone encounter table is ever looked up. Kanto and Johto
// each keep their own file (kanto-zone-data.ts / johto-zone-data.ts); this
// module never merges them into one flat list, and nothing downstream
// (engine/encounter/pokemon-encounter-engine.ts, engine/encounter/
// legendary-test-boost.ts, features/battle-session) is allowed to read a
// zone's encounters without first saying which region it means — the same
// zoneId (e.g. "grassland") intentionally resolves to a completely
// different Pokémon pool depending on which region is passed in here.
//
// Regions with no zone data yet (every RegionId besides "kanto"/"johto"/
// "hoenn"/"sinnoh"/"unova"/"kalos"/"alola"/"galar"/"paldea" — see
// features/regions/data/region-registry.ts's own `hasMap`/`mapConfig`
// flags) resolve to an empty array rather than throwing, the same
// "unknown/not-yet-built -> safe empty result" precedent every other
// region-aware lookup in this codebase already follows.
const ZONE_DATA_BY_REGION: Partial<Record<RegionId, Zone[]>> = {
  kanto: KANTO_ZONE_DATA,
  johto: JOHTO_ZONE_DATA,
  hoenn: HOENN_ZONE_DATA,
  sinnoh: SINNOH_ZONE_DATA,
  unova: UNOVA_ZONE_DATA,
  kalos: KALOS_ZONE_DATA,
  alola: ALOLA_ZONE_DATA,
  galar: GALAR_ZONE_DATA,
  paldea: PALDEA_ZONE_DATA,
};

export function getZoneData(regionId: RegionId): Zone[] {
  return ZONE_DATA_BY_REGION[regionId] ?? [];
}

export function getZone(regionId: RegionId, zoneId: ZoneId): Zone | undefined {
  return getZoneData(regionId).find((zone) => zone.id === zoneId);
}

// Every region currently backed by real zone data — used only for
// "does this zoneId exist in ANY region" shape validation (see
// features/battle-session/services/battle-session.service.ts's own
// isValidZoneId), never for resolving an actual encounter pool.
export function getAllRegionsWithZoneData(): RegionId[] {
  return Object.keys(ZONE_DATA_BY_REGION) as RegionId[];
}

// POKÉDEX — LOCATION HINTS FOR UNSEEN POKÉMON. One (region, zone) pair a
// species can actually be encountered in.
export interface SpeciesEncounterLocation {
  regionId: RegionId;
  zoneId: ZoneId;
}

// The one place a species' possible encounter locations are ever derived —
// a plain scan of every region's own zone encounter tables (the exact same
// data startPokemonEncounter itself rolls against, engine/encounter/
// pokemon-encounter-engine.ts), never a second, hand-maintained species ->
// location table. Returns plain (regionId, zoneId) facts only — never
// Hebrew text; turning this into player-facing copy is
// features/pokedex/messages/pokedex-location-messages.ts's own job, so a
// zone/region naming change here can never silently break the wording.
// Deduped by (regionId, zoneId) pair — a species can't appear twice in the
// exact same zone's own encounter list — and in region/zone iteration
// order (deterministic run to run). Empty for a species that never appears
// in any zone's encounter table (e.g. a starter, or a form only ever
// obtained by evolving) — a caller decides how to phrase that, this
// function never invents a location.
export function getSpeciesEncounterLocations(pokemonId: string): SpeciesEncounterLocation[] {
  const locations: SpeciesEncounterLocation[] = [];

  for (const regionId of getAllRegionsWithZoneData()) {
    for (const zone of getZoneData(regionId)) {
      const appearsHere = zone.encounters.some((encounter) => encounter.pokemonId === pokemonId);
      if (appearsHere) {
        locations.push({ regionId, zoneId: zone.id });
      }
    }
  }

  return locations;
}
