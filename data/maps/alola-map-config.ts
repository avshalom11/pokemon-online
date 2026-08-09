import type { WorldMapConfig } from "@/shared/types/map";

// Polygons manually placed by the operator via /dev/alola-map-editor
// against the real public/images/alola-map.png (904x886 — read directly
// from the PNG's own IHDR chunk, not guessed). Supplied as percentage-space
// points and converted to these pixel coordinates the same way
// johto-map-config.ts's, hoenn-map-config.ts's, sinnoh-map-config.ts's,
// unova-map-config.ts's, and kalos-map-config.ts's own polygons were:
// x_pixel = round((x_percent/100) * 904), y_pixel = round((y_percent/100)
// * 886).
//
// Alola is a deliberate FIVE-zone region (same Kalos Phase 4/5 precedent) —
// there is no Beach polygon here, unlike Kanto/Johto/Hoenn/Sinnoh/Unova. The
// global ZoneId type (shared/types/zone.ts) is untouched; Alola simply never
// supplies a "beach" entry in `regions` below.
//
// Geometry check performed with scripts/validate-map-regions.mjs (the same
// script Hoenn/Sinnoh/Unova/Kalos's own polygons were checked with) against
// the converted pixel-space points below:
//   - No polygon was self-intersecting.
//   - No point was out of the 0..904 / 0..886 bounds.
//   - No near-duplicate consecutive points.
//   - Two genuine cross-zone edge crossings were found (water's edges
//     against cave's shared diagonal border edge, cave's own points 1-2:
//     (461,647)-(696,443)) and corrected — see "Approved adjustments" below.
//     Every other point is exactly the approved percentage point, converted,
//     unmoved.
//   - After the fix, re-running the script reports zero structural issues
//     (no out-of-bounds points, no near-duplicate points, no
//     self-intersection, no cross-zone edge crossings).
//
// Approved adjustments (3 single-point nudges, all on water, each the
// smallest offset found — by computing each point's signed perpendicular
// distance to cave's shared boundary line and pushing only far enough
// along that line's own normal to clear it, then re-verifying with the
// real bounded-segment intersection test, the same method
// kalos-map-config.ts's own point nudges used):
//   - water's 7th point (approved 75,52 -> converted 678,461) sat 1.8px
//     across cave's shared boundary edge, causing water's edge 5-6 to cross
//     it. Nudged to 676,459 (~2.8px).
//   - water's 8th point (approved 68,59 -> converted 615,523) sat 7.3px
//     across the same boundary — not itself flagged as a crossing in the
//     unmodified polygon (both neighboring points were also on the wrong
//     side, so neither adjacent edge crossed the boundary's own bounded
//     segment), but left uncorrected it would have made edges 6-7 and 7-8
//     cross once points 7 and 9 were brought back onto the correct side.
//     Nudged to 610,517 (~7.8px) — the same "push back across the
//     boundary" fix required by the two genuinely-flagged points on either
//     side of it.
//   - water's 9th point (approved 54,71 -> converted 488,629) sat 4.1px
//     across the boundary, causing water's edge 8-9 to cross it. Nudged to
//     485,626 (~4.2px).
//   All three points sit on the same short diagonal run of the polygon
//   (grid indices 6/7/8) bordering cave's own boundary edge; each was
//   already very close to that shared edge in the operator's approved
//   coordinates (a photographed corner where water and cave meet), so this
//   is a genuine minimal-margin fix, not a redesign — no other point in
//   water or any other zone was touched, and the polygon's overall shape
//   (11 points, same silhouette) is unchanged.
//
// Coverage: all five zone ids (grassland/water/cave/lava/haunted-house)
// have a real polygon here — every point below came from an actual click
// against the real image via the editor except the three water adjustments
// documented above, which were never invented from scratch — each is the
// original clicked point nudged the minimum distance needed to clear a
// real, validator-confirmed crossing against cave's shared boundary.
//
// Alola has NO zone encounter data yet (data/zones/alola-zone-data.ts does
// not exist) — app/(game)/battle/page.tsx's region gate checks
// getZoneData(regionId).length === 0 (not mapConfig presence), so Alola's
// map can render interactively once wired into the Region Registry while
// battles stay correctly blocked, the same "map before encounters" window
// Hoenn, Sinnoh, Unova, and Kalos already went through between their own
// map-config and encounter-table phases.
export const ALOLA_MAP_CONFIG: WorldMapConfig = {
  imageSrc: "/images/alola-map.png",

  viewBox: {
    width: 904,
    height: 886,
  },

  regions: [
    {
      zoneId: "grassland",
      points: "0,425 190,434 244,496 325,576 434,638 452,638 452,877 0,886",
    },
    {
      zoneId: "water",
      points: "226,434 316,319 425,230 488,230 597,319 669,416 676,459 610,517 485,626 425,629 289,523",
    },
    {
      zoneId: "cave",
      points: "461,886 461,647 696,443 895,434 904,886",
    },
    {
      zoneId: "lava",
      points: "452,9 452,213 307,292 208,416 9,416 0,0",
    },
    {
      zoneId: "haunted-house",
      points: "452,0 452,204 615,292 696,425 895,425 895,9",
    },
  ],
};
