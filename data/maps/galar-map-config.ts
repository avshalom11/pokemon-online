import type { WorldMapConfig } from "@/shared/types/map";

// Polygons manually placed by the operator via /dev/galar-map-editor
// against the real public/images/galar-map.png (1402x1122 — verified
// directly from the PNG's own IHDR chunk in Galar Phase 4, not guessed) and
// approved for production use. Supplied as percentage-space points and
// converted to these pixel coordinates the same way johto-map-config.ts's,
// hoenn-map-config.ts's, sinnoh-map-config.ts's, unova-map-config.ts's,
// kalos-map-config.ts's, and alola-map-config.ts's own polygons were:
// x_pixel = round((x_percent/100) * 1402), y_pixel = round((y_percent/100)
// * 1122).
//
// Galar is a deliberate FIVE-zone region (same Kalos/Alola precedent) —
// there is no Beach polygon here, unlike Kanto/Johto/Hoenn/Sinnoh/Unova. The
// global ZoneId type (shared/types/zone.ts) is untouched; Galar simply never
// supplies a "beach" entry in `regions` below.
//
// Geometry check performed with scripts/validate-map-regions.mjs (the same
// script Hoenn/Sinnoh/Unova/Kalos/Alola's own polygons were checked with)
// against the converted pixel-space points below:
//   - No polygon was self-intersecting.
//   - No point was out of the 0..1402 / 0..1122 bounds.
//   - No near-duplicate consecutive points.
//   - One genuine cross-zone edge-crossing pair was found (lava's point 12,
//     converted (883,640), sat only ~3.2-3.6px across the shared
//     lava/haunted-house boundary corner at haunted-house's point 4
//     (883,628) — its own two adjacent edges, 11-12 and 12-13, each crossed
//     one of haunted-house's own boundary edges, 4-5 and 3-4) and corrected
//     — see "Approved adjustment" below. Every other point is exactly the
//     approved percentage point, converted, unmoved.
//   - After the fix, re-running the script reports zero structural issues
//     (no out-of-bounds points, no near-duplicate points, no
//     self-intersection, no cross-zone edge crossings).
//
// Approved adjustment (1 single-point nudge, the smallest offset found — by
// searching increasing integer-pixel radii around the offending point for
// the nearest position that clears both real bounded-segment intersections,
// the same "smallest offset that clears the real crossing test" method
// alola-map-config.ts's own three point nudges used):
//   - lava's 13th point (approved 63,57 -> converted 883,640) sat inside
//     haunted-house's shared boundary corner, causing lava's edges 11-12
//     and 12-13 to cross haunted-house's edges 4-5 and 3-4. Nudged to
//     880,637 (~4.24px) — pulled back into lava's own territory, away from
//     the haunted-house boundary corner. No other point in lava or any
//     other zone was touched, and the polygon's overall shape (17 points,
//     same silhouette) is unchanged.
//
// Coverage: all five zone ids (grassland/water/cave/lava/haunted-house)
// have a real polygon here — every point below came from an actual click
// against the real image via the editor except the one lava adjustment
// documented above, which was never invented from scratch — it is the
// original clicked point nudged the minimum distance needed to clear a
// real, validator-confirmed crossing against haunted-house's shared
// boundary.
//
// Galar has NO zone encounter data yet (data/zones/galar-zone-data.ts does
// not exist) — app/(game)/battle/page.tsx's region gate checks
// getZoneData(regionId).length === 0 (not mapConfig presence), so Galar's
// map can render interactively once wired into the Region Registry while
// battles stay correctly blocked, the same "map before encounters" window
// Hoenn, Sinnoh, and (briefly) Kalos/Alola already went through between
// their own map-config and encounter-table phases (Galar Phase 6).
export const GALAR_MAP_CONFIG: WorldMapConfig = {
  imageSrc: "/images/galar-map.png",

  viewBox: {
    width: 1402,
    height: 1122,
  },

  regions: [
    {
      zoneId: "grassland",
      points: "645,303 491,415 421,505 393,595 407,662 491,718 505,797 421,987 393,1032 154,999 140,931 84,886 56,774 42,684 42,583 70,471 168,348 365,258 505,292",
    },
    {
      zoneId: "water",
      points: "729,1100 855,1100 925,1043 1023,1010 1122,965 1206,920 1276,808 1318,718 1332,640 1304,550 1234,460 1164,393 1052,359 967,325 897,325 841,303 729,314 645,292 575,281 505,281 435,247 351,247 280,269 224,303 154,337 84,415 56,494 14,572 28,628 28,707 42,763 28,819 70,931 126,987 196,1021 421,1055 407,1122 0,1111 14,11 771,11 1262,22 1388,0 1388,1122 589,1122 477,1111 421,1088",
    },
    {
      zoneId: "cave",
      points: "449,1010 477,886 519,808 561,741 589,763 631,707 687,763 757,729 799,763 813,741 981,853 1052,965 925,1032 799,1077 533,1077",
    },
    {
      zoneId: "lava",
      points: "631,314 547,381 491,449 435,527 435,628 491,696 547,729 603,741 631,696 701,729 757,707 785,729 880,637 897,539 925,426 897,348 743,325",
    },
    {
      zoneId: "haunted-house",
      points: "911,359 939,426 925,482 911,527 883,628 855,718 911,774 1023,875 1094,920 1164,909 1262,774 1304,673 1290,583 1248,505 1164,426 1052,381",
    },
  ],
};
