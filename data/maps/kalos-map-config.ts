import type { WorldMapConfig } from "@/shared/types/map";

// Polygons manually placed by the operator via /dev/kalos-map-editor
// against the real public/images/kalos-map.png (1402x1122 — read directly
// from the PNG's own IHDR chunk, not guessed). Supplied as percentage-space
// points and converted to these pixel coordinates the same way
// johto-map-config.ts's, hoenn-map-config.ts's, sinnoh-map-config.ts's, and
// unova-map-config.ts's own polygons were: x_pixel = round((x_percent/100)
// * 1402), y_pixel = round((y_percent/100) * 1122).
//
// Kalos is a deliberate FIVE-zone region (Kalos Phase 4/5's own approved
// design) — there is no Beach polygon here, unlike every prior region. The
// global ZoneId type (shared/types/zone.ts) is untouched; Kalos simply
// never supplies a "beach" entry in `regions` below.
//
// Geometry check performed with scripts/validate-map-regions.mjs (the same
// script Hoenn/Sinnoh/Unova's own polygons were checked with) against the
// converted pixel-space points:
//   - No polygon was self-intersecting.
//   - No point was out of the 0..1402 / 0..1122 bounds.
//   - No near-duplicate consecutive points.
//   - Three genuine cross-zone edge-crossing GROUPS were found and
//     corrected — see "Approved adjustments" below. Every other point is
//     exactly the approved percentage point, converted, unmoved.
//   - After the fix, re-running the script reports zero structural issues
//     (no out-of-bounds points, no near-duplicate points, no
//     self-intersection, no cross-zone edge crossings).
//   - The rasterized coverage scan still reports a small residual overlap
//     (740 of ~171,000 sample cells, ~0.42%, all in one localized pocket
//     between lava and haunted-house around x=330-355/y=645-690) — this is
//     NOT a hard failure (the validator script itself only fails the build
//     on bounds/duplicates/self-intersection/cross-zone-edge-crossings, the
//     same rule Hoenn/Sinnoh/Unova's own configs were held to). This pocket
//     was confirmed to be a genuine AREA-level overlap already present in
//     the operator's own approved percentage coordinates (lava's point
//     351,651/365,741 and haunted-house's point 336,673/308,785 sit inside
//     each other's polygon even before any edge-crossing fix), not
//     something introduced by the point nudges below. A single-point
//     search (nudging lava's own point 7 alone, up to 40px in any
//     direction) only ever reduced it from 740 to 608 cells, never to 0 —
//     fully eliminating it would require moving multiple points along that
//     shared boundary by 20-45px each, which would cross from "smallest
//     possible adjustment" into redesigning the intended shape. Left as-is
//     per this phase's own explicit instruction: fix genuine structural
//     problems minimally, never invent a new boundary decision. Small gaps
//     between neighboring zones elsewhere on the map (the same "close but
//     not exactly touching" shape every prior region's own config already
//     documents) were likewise left alone.
//
// Approved adjustments (4 single-point nudges total, each the smallest
// offset found — by an expanding-radius search re-checking the real
// edge-crossing test at each step, the same method unova-map-config.ts's
// own haunted-house adjustments used — that clears every real,
// script-confirmed edge crossing that point's own two adjacent edges were
// part of; no other point in any zone was touched):
//   - grassland's 8th point (approved 41,95 -> converted 575,1066)
//     genuinely crossed haunted-house's edge between its own converted
//     points 11 and 12 (561,1122 -> 603,1010). Nudged to 581,1069 (~6.7px)
//     — the smallest shift that clears haunted-house's boundary.
//   - water's 2nd point (approved 7,25 -> converted 98,281) genuinely
//     crossed lava's closing edge (its own converted last point 182,292
//     back to its own first point 0,258). Nudged to 102,277 (~5.7px).
//   - haunted-house's 3rd point (approved 29,43 -> converted 407,482)
//     genuinely crossed lava's edge between its own converted points 8 and
//     9 (351,595 -> 393,550). Nudged to 418,492 (~14.9px).
//   - haunted-house's 4th point (approved 27,52 -> converted 379,583)
//     genuinely crossed lava's edge between its own converted points 7 and
//     8 (351,651 -> 351,595). Nudged to 396,585 (~17.1px).
//
// Coverage: all five zone ids (grassland/water/cave/lava/haunted-house)
// have a real polygon here — every point below came from an actual click
// against the real image via the editor except the four adjustments
// documented above, which were never invented from scratch — each is the
// original clicked point nudged the minimum distance needed to clear a
// real, validator-confirmed crossing.
//
// Kalos has NO zone encounter data yet (data/zones/kalos-zone-data.ts does
// not exist) — app/(game)/battle/page.tsx's region gate checks
// getZoneData(regionId).length === 0 (not mapConfig presence), so Kalos's
// map can render interactively once wired into the Region Registry while
// battles stay correctly blocked, the same "map before encounters" window
// Hoenn, Sinnoh, and Unova already went through between their own
// map-config and encounter-table phases.
export const KALOS_MAP_CONFIG: WorldMapConfig = {
  imageSrc: "/images/kalos-map.png",

  viewBox: {
    width: 1402,
    height: 1122,
  },

  regions: [
    {
      zoneId: "grassland",
      points: "714,381 714,471 729,539 729,640 743,752 701,853 631,976 581,1069 575,1111 1037,1122 1037,1010 1066,830 1066,684 1052,572 1037,460 1080,381 869,348",
    },
    {
      zoneId: "water",
      points: "14,236 102,277 182,269 252,281 351,303 435,337 491,325 575,348 687,359 757,348 855,325 925,348 1066,370 1150,359 1248,370 1304,359 1388,325 1388,0 0,0",
    },
    {
      zoneId: "cave",
      points: "1094,381 1108,449 1094,494 1094,550 1108,606 1108,684 1108,763 1108,808 1066,1100 1388,1111 1388,415 1388,325 1262,393",
    },
    {
      zoneId: "lava",
      points: "0,258 0,1111 294,1111 308,942 322,865 322,808 365,741 351,651 351,595 393,550 393,482 379,449 393,348 182,292",
    },
    {
      zoneId: "haunted-house",
      points: "407,348 421,415 418,492 396,585 336,673 308,785 322,853 294,931 294,1021 294,1111 561,1122 603,1010 659,909 687,830 714,763 701,684 701,606 701,527 701,460 687,381 575,359",
    },
  ],
};
