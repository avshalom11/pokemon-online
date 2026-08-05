import type { WorldMapConfig } from "@/shared/types/map";

// Polygons manually placed by the operator via /dev/hoenn-map-editor
// against the real public/images/hoenn-map.png (1402x1122 — read directly
// from the PNG's own IHDR chunk, not guessed; coincidentally the same
// canvas size Johto's own map image uses). Supplied as percentage-space
// points and converted to these pixel coordinates the same way
// johto-map-config.ts's own polygons were: x_pixel = round((x_percent/100)
// * 1402), y_pixel = round((y_percent/100) * 1122).
//
// Geometry check performed on the original percentage-space points before
// conversion (self-intersection per polygon, pairwise edge-intersection
// across every zone pair, and a near-coincident-vertex scan for gaps at
// intended shared borders):
//   - No polygon was self-intersecting.
//   - Exactly one real cross-zone overlap was found: Water's point (86,22)
//     landed inside Beach's top-right notch (bounded by Beach's own
//     (89,18)/(91,28) corners), causing two edge crossings between Water's
//     (81,16)-(86,22)-(91,25) run and Beach's (89,18)-(81,18) top edge and
//     (91,28)-(89,18) side edge. Fixed by moving that ONE Water point from
//     (86,22) to (89,17) — nudging it up and right just enough to route
//     Water's boundary outside Beach's existing notch instead of through
//     it. Re-running the same intersection check against the corrected
//     point confirms zero remaining crossings anywhere. No other point in
//     any zone was changed.
//   - A handful of small (1-3 percentage-point) gaps remain between
//     neighboring zones at their intended shared borders (e.g.
//     grassland/beach, water/cave, cave/beach, lava/haunted-house) — the
//     same "close but not exactly touching" shape johto-map-config.ts's own
//     doc comment already documents and deliberately leaves alone, since
//     closing them would mean inventing new boundary points rather than
//     correcting an actual overlap.
//
// Coverage: all six zone ids (grassland/water/cave/lava/beach/
// haunted-house) have a real polygon here — every point below came from an
// actual click against the real image via the editor, none invented.
export const HOENN_MAP_CONFIG: WorldMapConfig = {
  imageSrc: "/images/hoenn-map.png",

  viewBox: {
    width: 1402,
    height: 1122,
  },

  regions: [
    {
      zoneId: "grassland",
      points: "701,426 813,381 925,393 1037,426 1094,494 1080,550 1066,606 1023,662 953,763 869,808 757,763 687,707 631,640 589,583",
    },
    {
      zoneId: "water",
      points: "1023,0 1108,79 1108,135 1136,180 1248,191 1276,281 1290,393 1318,438 1304,516 1304,595 1290,707 1290,785 1234,864 1108,987 911,1010 771,1021 603,1066 336,1088 70,1032 14,1043 28,1111 1402,1111 1388,0",
    },
    {
      zoneId: "cave",
      points: "491,11 589,123 645,213 715,292 757,337 869,348 1023,348 1108,314 1108,180 1066,112 1023,22 981,0",
    },
    {
      zoneId: "lava",
      points: "449,11 505,112 603,236 631,337 617,449 519,550 322,572 154,617 14,673 0,11",
    },
    {
      zoneId: "beach",
      points: "1136,202 1136,314 1080,426 1108,505 1094,628 981,741 925,808 897,931 981,976 1066,976 1206,808 1262,673 1262,550 1290,438 1276,314 1248,202",
    },
    {
      zoneId: "haunted-house",
      points: "491,561 589,640 687,741 771,819 813,853 701,954 561,1010 435,1032 280,1032 112,987 0,875 0,718 112,662",
    },
  ],
};
