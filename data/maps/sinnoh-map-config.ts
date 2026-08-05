import type { WorldMapConfig } from "@/shared/types/map";

// Polygons manually placed by the operator via /dev/sinnoh-map-editor
// against the real public/images/sinnoh-map.png (1403x1121 — read directly
// from the PNG's own IHDR chunk, not guessed). Supplied as percentage-space
// points and converted to these pixel coordinates the same way
// johto-map-config.ts's and hoenn-map-config.ts's own polygons were:
// x_pixel = round((x_percent/100) * 1403), y_pixel = round((y_percent/100)
// * 1121).
//
// Geometry check performed on the original percentage-space points before
// conversion, and re-run on the rounded pixel-space points after
// (self-intersection per polygon via proper segment-crossing tests, pairwise
// edge-intersection across every zone pair, and a point-in-polygon
// containment scan for one zone's vertex ending up inside another's area):
//   - No polygon was self-intersecting, in either space.
//   - No pair of zones had a real edge crossing or vertex containment, in
//     either space. Zero coordinate changes were required — every point
//     below is exactly the approved percentage point, converted.
//   - A handful of small (1-2.5 percentage-point) gaps remain between
//     neighboring zones at their intended shared borders (grassland/cave
//     near (45,66)/(43,65), grassland/beach near the northern ridge,
//     water/beach along their long shared edge, cave/haunted-house near
//     (19,61)/(17,60)) — the same "close but not exactly touching" shape
//     johto-map-config.ts's and hoenn-map-config.ts's own doc comments
//     already document and deliberately leave alone, since none of them is
//     an actual overlap/crossing and closing them would mean inventing a
//     boundary decision rather than correcting a real problem.
//
// Coverage: all six zone ids (grassland/water/cave/lava/beach/
// haunted-house) have a real polygon here — every point below came from an
// actual click against the real image via the editor, none invented.
export const SINNOH_MAP_CONFIG: WorldMapConfig = {
  imageSrc: "/images/sinnoh-map.png",

  viewBox: {
    width: 1403,
    height: 1121,
  },

  regions: [
    {
      zoneId: "grassland",
      points: "631,11 617,112 673,213 645,314 575,392 533,448 561,561 603,650 631,740 631,841 673,897 786,830 687,717 744,617 800,504 800,415 856,314 772,213 814,157 744,112 716,11",
    },
    {
      zoneId: "water",
      points: "940,0 996,112 1038,202 1066,280 1080,381 1066,471 1052,594 996,796 968,942 842,1054 856,1110 1389,1110 1389,11",
    },
    {
      zoneId: "cave",
      points: "14,740 112,717 196,729 267,684 337,706 393,673 505,673 603,729 547,818 533,897 519,986 421,1031 309,1076 126,1110 0,1110",
    },
    {
      zoneId: "lava",
      points: "0,0 435,11 547,135 589,202 589,291 491,392 435,415 295,381 182,370 84,381 0,437",
    },
    {
      zoneId: "beach",
      points: "744,11 772,101 842,157 814,213 856,269 912,325 856,404 842,460 856,493 856,549 800,605 758,684 730,729 800,796 800,874 702,942 589,998 533,1043 603,1099 814,1020 898,942 982,773 1024,628 1052,426 1066,291 1038,213 856,67 856,11",
    },
    {
      zoneId: "haunted-house",
      points: "14,482 126,426 224,392 365,415 435,482 477,538 435,605 337,650 239,673 154,684 84,684 14,695",
    },
  ],
};
