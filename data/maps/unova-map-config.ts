import type { WorldMapConfig } from "@/shared/types/map";

// Polygons manually placed by the operator via /dev/unova-map-editor
// against the real public/images/unova-map.png (1402x1122 — read directly
// from the PNG's own IHDR chunk, not guessed). Supplied as percentage-space
// points and converted to these pixel coordinates the same way
// johto-map-config.ts's, hoenn-map-config.ts's, and sinnoh-map-config.ts's
// own polygons were: x_pixel = round((x_percent/100) * 1402), y_pixel =
// round((y_percent/100) * 1122).
//
// Geometry check performed with scripts/validate-map-regions.mjs (the same
// script Hoenn/Sinnoh's own polygons were checked with) against the
// converted pixel-space points:
//   - No polygon was self-intersecting.
//   - Two genuine cross-zone edge crossings were found and corrected — see
//     "Approved adjustments" below. Every other point is exactly the
//     approved percentage point, converted, unmoved.
//   - After the fix, re-running the script reports zero structural issues
//     (no out-of-bounds points, no near-duplicate points, no
//     self-intersection, no cross-zone edge crossings, zero overlap
//     cells in the rasterized coverage scan).
//   - Small gaps remain between neighboring zones at their intended shared
//     borders (e.g. grassland/cave, grassland/lava, water/beach) — the same
//     "close but not exactly touching" shape johto-map-config.ts's,
//     hoenn-map-config.ts's, and sinnoh-map-config.ts's own doc comments
//     already document and deliberately leave alone, since none of them is
//     an actual overlap/crossing and closing them would mean inventing a
//     boundary decision rather than correcting a real problem.
//
// Approved adjustments (haunted-house only, both minimal single-point
// nudges to resolve a real, script-confirmed edge crossing — no other
// point in any zone was touched):
//   - haunted-house's first point (approved 61,58 -> converted 855,651)
//     genuinely overlapped lava's polygon (its own converted point 12,
//     757,684 -> 869,651, sat almost exactly on top of it). Nudged to
//     856,655 — the smallest shift (~4px) that clears lava's boundary,
//     found by searching outward from the original point and re-checking
//     the real edge-crossing test (not just point containment) at each
//     step.
//   - haunted-house's 23rd point (approved 72,58 -> converted 1150,707)
//     genuinely overlapped cave's polygon (fell inside cave's edge between
//     its own converted points 6 and 7, 1052,651 -> 1164,729). Nudged to
//     1145,716 — the smallest shift (~10px) that clears cave's boundary,
//     found the same way.
//
// Coverage: all six zone ids (grassland/water/cave/lava/beach/
// haunted-house) have a real polygon here — every point below came from an
// actual click against the real image via the editor except the two
// haunted-house adjustments documented above, which were never invented
// from scratch — each is the original clicked point nudged the minimum
// distance needed to clear a real, validator-confirmed overlap.
//
// Unova has no zone encounter data yet (data/zones/unova-zone-data.ts does
// not exist) — app/(game)/battle/page.tsx's region gate checks
// getZoneData(regionId).length === 0 (not mapConfig presence), so Unova's
// map can render interactively once wired into the Region Registry while
// battles stay correctly blocked, the same "map before encounters" window
// Hoenn and Sinnoh already went through between their own map-config and
// encounter-table phases.
export const UNOVA_MAP_CONFIG: WorldMapConfig = {
  imageSrc: "/images/unova-map.png",

  viewBox: {
    width: 1402,
    height: 1122,
  },

  regions: [
    {
      zoneId: "grassland",
      points: "280,180 336,247 351,292 393,337 435,381 547,325 645,292 743,269 827,325 883,348 967,281 1037,236 1108,191 981,180 925,157 939,112 883,90 827,101 785,67 715,67 603,56 336,146",
    },
    {
      zoneId: "water",
      points: "294,11 308,157 519,67 589,34 673,56 771,45 841,79 925,79 981,112 981,146 995,157 1052,146 1122,168 1136,213 1136,236 1192,224 1220,258 1276,303 1290,348 1262,370 1318,415 1332,449 1318,471 1360,505 1374,550 1318,628 1318,673 1318,707 1248,752 1220,774 1248,797 1262,853 1234,898 1164,931 1178,965 1108,1010 1037,1055 967,1055 925,1066 827,1055 785,1043 701,1066 617,1066 533,1066 519,1021 589,987 645,965 603,920 645,864 645,819 575,752 477,718 421,673 322,651 280,684 210,729 168,774 126,830 98,864 0,886 0,1111 1388,1111 1388,11",
    },
    {
      zoneId: "cave",
      points: "1037,258 1009,303 925,370 925,426 995,527 995,628 1052,651 1164,729 1290,673 1276,583 1346,539 1304,494 1262,460 1290,426 1234,381 1234,337 1248,314 1192,292 1178,247 1108,258",
    },
    {
      zoneId: "lava",
      points: "715,281 631,325 561,325 533,359 449,393 407,438 393,505 365,572 421,628 533,684 659,729 757,684 869,651 925,617 967,550 925,449 841,348",
    },
    {
      zoneId: "beach",
      points: "196,0 266,202 336,303 393,359 351,438 294,505 266,539 294,550 238,617 182,673 154,707 112,718 0,729 0,11",
    },
    {
      zoneId: "haunted-house",
      points: "856,655 757,707 701,752 687,785 715,808 701,853 701,875 687,898 715,920 687,965 659,987 687,1021 771,987 883,1021 925,987 981,1021 1066,965 1108,942 1094,898 1150,886 1220,830 1178,763 1145,716 1009,651",
    },
  ],
};
