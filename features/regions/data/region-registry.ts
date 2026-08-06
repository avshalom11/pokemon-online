import { HOENN_MAP_CONFIG } from "@/data/maps/hoenn-map-config";
import { JOHTO_MAP_CONFIG } from "@/data/maps/johto-map-config";
import { SINNOH_MAP_CONFIG } from "@/data/maps/sinnoh-map-config";
import { UNOVA_MAP_CONFIG } from "@/data/maps/unova-map-config";
import { WORLD_MAP_CONFIG } from "@/data/maps/world-map-config";
import type { RegionId } from "@/shared/types/region";
import type { RegionDefinition } from "../types/region-registry.types";

export const DEFAULT_REGION_ID: RegionId = "kanto";

// Every region's World page card uses this same placeholder image for now
// (see RegionDefinition.cardImageSrc) — one shared constant rather than
// repeating the literal path in all 9 entries below, so a future
// per-region card image is a one-line change per entry, not a
// find-and-replace across the file.
const DEFAULT_CARD_IMAGE_SRC = "/images/world-map.PNG";

// The canonical Region Registry — see RegionDefinition's own doc comment.
// A Record (not a plain array) so TypeScript enforces every RegionId has an
// entry here at compile time; REGION_REGISTRY below is just this in the
// fixed display order the World page (and every other listing) should use.
const REGION_REGISTRY_BY_ID: Record<RegionId, RegionDefinition> = {
  kanto: {
    id: "kanto",
    englishName: "Kanto",
    cardImageSrc: DEFAULT_CARD_IMAGE_SRC,
    hasMap: true,
    // Kanto's own map image lives inside mapConfig.imageSrc
    // ("/images/kanto-map.png") rather than being repeated in
    // mapImageSrc — mapConfig is the one thing MapContent renders from
    // whenever it's present.
    mapConfig: WORLD_MAP_CONFIG,
  },
  johto: {
    id: "johto",
    englishName: "Johto",
    cardImageSrc: DEFAULT_CARD_IMAGE_SRC,
    hasMap: true,
    // Johto now has real, clickable zones — see data/maps/johto-map-config.ts
    // for how these polygons were placed/corrected. Same as Kanto,
    // mapConfig.imageSrc ("/images/johto-map.png") is the one source for
    // the map image; mapImageSrc is left unset since mapConfig already
    // covers it (MapContent renders from mapConfig whenever it's present).
    // Battle access (app/(game)/battle/page.tsx's region gate) follows
    // automatically from mapConfig being set. As of Phase 4, Johto has its
    // own real zone encounter tables (data/zones/johto-zone-data.ts) — the
    // same six zone ids as Kanto (grassland/cave/lava/haunted-house/water/
    // beach), but each one's own Johto-only Pokémon pool; resolved by
    // region via data/zones/zone-data.ts's getZoneData/getZone, never by
    // reusing Kanto's own table.
    mapConfig: JOHTO_MAP_CONFIG,
  },
  hoenn: {
    id: "hoenn",
    englishName: "Hoenn",
    cardImageSrc: DEFAULT_CARD_IMAGE_SRC,
    hasMap: true,
    // Hoenn now has real, clickable zones (data/maps/hoenn-map-config.ts,
    // manually placed via /dev/hoenn-map-editor against the real
    // /images/hoenn-map.png) — same as Kanto/Johto, mapConfig.imageSrc is
    // the one source for the map image; mapImageSrc is left unset since
    // mapConfig already covers it (MapContent renders from mapConfig
    // whenever it's present).
    //
    // As of Hoenn Encounter Tables Phase 4, Hoenn also has its own real
    // zone encounter tables (data/zones/hoenn-zone-data.ts) — the same six
    // zone ids as Kanto/Johto, but its own Hoenn-only Pokémon pool;
    // resolved by region via data/zones/zone-data.ts's getZoneData/getZone,
    // never by reusing Kanto's or Johto's own table. This makes Hoenn
    // battle-capable automatically: app/(game)/battle/page.tsx's region
    // gate checks getZoneData(regionId).length > 0 (not mapConfig presence
    // specifically, which is why Hoenn's map could already render
    // interactively before this phase while still correctly blocking
    // battles) — no change to that gate, or to this registry beyond
    // mapConfig already being set, was needed for Hoenn to pass it.
    mapConfig: HOENN_MAP_CONFIG,
  },
  sinnoh: {
    id: "sinnoh",
    englishName: "Sinnoh",
    cardImageSrc: DEFAULT_CARD_IMAGE_SRC,
    hasMap: true,
    // Sinnoh now has real, clickable zones (data/maps/sinnoh-map-config.ts,
    // manually placed via /dev/sinnoh-map-editor against the real
    // /images/sinnoh-map.png) — same as Kanto/Johto/Hoenn, mapConfig.
    // imageSrc is the one source for the map image; mapImageSrc is left
    // unset since mapConfig already covers it (MapContent renders from
    // mapConfig whenever it's present).
    //
    // Sinnoh has NO zone encounter data yet (data/zones/sinnoh-zone-data.ts
    // does not exist) — app/(game)/battle/page.tsx's region gate checks
    // getZoneData(regionId).length === 0 (not mapConfig presence), so
    // Sinnoh's map can render interactively here while battles stay
    // correctly blocked, exactly the same "map before encounters" window
    // Hoenn went through between its own map-config and encounter-table
    // phases. No change to that gate, or to this registry beyond mapConfig
    // being set, is needed for that to hold.
    mapConfig: SINNOH_MAP_CONFIG,
  },
  unova: {
    id: "unova",
    englishName: "Unova",
    cardImageSrc: DEFAULT_CARD_IMAGE_SRC,
    hasMap: true,
    // Unova now has real, clickable zones (data/maps/unova-map-config.ts,
    // manually placed via /dev/unova-map-editor against the real
    // /images/unova-map.png) — same as Kanto/Johto/Hoenn/Sinnoh, mapConfig.
    // imageSrc is the one source for the map image; mapImageSrc is left
    // unset since mapConfig already covers it (MapContent renders from
    // mapConfig whenever it's present).
    //
    // Unova has NO zone encounter data yet (data/zones/unova-zone-data.ts
    // does not exist) — app/(game)/battle/page.tsx's region gate checks
    // getZoneData(regionId).length === 0 (not mapConfig presence), so
    // Unova's map can render interactively here while battles stay
    // correctly blocked, exactly the same "map before encounters" window
    // Hoenn and Sinnoh already went through between their own map-config
    // and encounter-table phases. No change to that gate, or to this
    // registry beyond mapConfig being set, is needed for that to hold.
    mapConfig: UNOVA_MAP_CONFIG,
  },
  kalos: { id: "kalos", englishName: "Kalos", cardImageSrc: DEFAULT_CARD_IMAGE_SRC, hasMap: false },
  alola: { id: "alola", englishName: "Alola", cardImageSrc: DEFAULT_CARD_IMAGE_SRC, hasMap: false },
  galar: { id: "galar", englishName: "Galar", cardImageSrc: DEFAULT_CARD_IMAGE_SRC, hasMap: false },
  paldea: { id: "paldea", englishName: "Paldea", cardImageSrc: DEFAULT_CARD_IMAGE_SRC, hasMap: false },
};

export const REGION_REGISTRY: RegionDefinition[] = Object.values(REGION_REGISTRY_BY_ID);

export function getRegionDefinition(regionId: RegionId): RegionDefinition {
  return REGION_REGISTRY_BY_ID[regionId];
}

// Runtime validation gate for a region id arriving from outside the type
// system — a server action receiving a client-sent string, primarily.
// Deliberately not a separate hardcoded id list: REGION_REGISTRY_BY_ID above
// is already the exhaustive, compile-time-checked map of every valid
// RegionId, so this just checks membership in it.
export function isValidRegionId(value: string): value is RegionId {
  return Object.prototype.hasOwnProperty.call(REGION_REGISTRY_BY_ID, value);
}
