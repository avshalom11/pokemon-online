import type { RegionId } from "@/shared/types/region";
import type { WorldMapConfig } from "@/shared/types/map";

// One entry per RegionId — the canonical shape the Region Registry
// (features/regions/data/region-registry.ts) is built from. This is the one
// place a region's English display name, World-page presentation, and map
// availability are defined; every consumer (header, World page, Map page,
// battle's region gate) reads this instead of switching on RegionId or
// repeating a region's name/image itself.
export interface RegionDefinition {
  id: RegionId;

  // Display name everywhere a region needs an English label (the global
  // header, World page cards) — never a Hebrew label; see
  // shared/types/region-labels.ts for the separate Hebrew label map used
  // elsewhere (e.g. the public profile page).
  englishName: string;

  // World page card image — every region has one (currently the same
  // placeholder image for all 9; see the Registry's own doc comment), so
  // WorldContent/RegionCard never hardcode an image path themselves.
  cardImageSrc: string;

  // Whether the Map page should show a real map image for this region at
  // all, instead of RegionMapPlaceholder's "Coming Soon" screen. True for
  // any region with a map image, whether or not it has clickable zones yet
  // — see mapConfig below for that separate, stricter condition.
  hasMap: boolean;

  // Only ever set when hasMap is true. The plain map image shown when
  // there's no interactive zone config yet (see mapConfig) — e.g. Johto:
  // hasMap true, mapImageSrc set, mapConfig absent. Kanto also has one
  // (baked into mapConfig.imageSrc below) but never reads this field
  // directly since mapConfig already carries its own imageSrc.
  mapImageSrc?: string;

  // The full interactive zone config (clickable polygons keyed by ZoneId) —
  // presence of this is what gates whether MapContent renders a real,
  // clickable InteractiveWorldMap instead of a plain image or
  // RegionMapPlaceholder. It does NOT by itself gate battle-capability
  // (that used to be true when only Kanto/Johto ever had one — see
  // app/(game)/battle/page.tsx's region gate, which checks real zone/
  // encounter data via data/zones/zone-data.ts's getZoneData instead):
  // Hoenn is the first region with a real mapConfig but no zone/encounter
  // data yet, so its map is interactive while it still correctly can't
  // start a battle. Kanto and Johto both have one, and both already have
  // real zone data, so nothing about their own behavior changed.
  mapConfig?: WorldMapConfig;
}
