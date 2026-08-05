import { HOENN_ZONE_DATA } from "./hoenn-zone-data";
import { JOHTO_ZONE_DATA } from "./johto-zone-data";
import { KANTO_ZONE_DATA } from "./kanto-zone-data";
import { SINNOH_ZONE_DATA } from "./sinnoh-zone-data";
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
// "hoenn"/"sinnoh" — see features/regions/data/region-registry.ts's own
// `hasMap`/`mapConfig` flags) resolve to an empty array rather than
// throwing, the same "unknown/not-yet-built -> safe empty result"
// precedent every other region-aware lookup in this codebase already
// follows.
const ZONE_DATA_BY_REGION: Partial<Record<RegionId, Zone[]>> = {
  kanto: KANTO_ZONE_DATA,
  johto: JOHTO_ZONE_DATA,
  hoenn: HOENN_ZONE_DATA,
  sinnoh: SINNOH_ZONE_DATA,
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
