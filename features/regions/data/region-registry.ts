import { JOHTO_MAP_CONFIG } from "@/data/maps/johto-map-config";
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
  hoenn: { id: "hoenn", englishName: "Hoenn", cardImageSrc: DEFAULT_CARD_IMAGE_SRC, hasMap: false },
  sinnoh: { id: "sinnoh", englishName: "Sinnoh", cardImageSrc: DEFAULT_CARD_IMAGE_SRC, hasMap: false },
  unova: { id: "unova", englishName: "Unova", cardImageSrc: DEFAULT_CARD_IMAGE_SRC, hasMap: false },
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
