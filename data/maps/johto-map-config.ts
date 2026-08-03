import type { WorldMapConfig } from "@/shared/types/map";

// Polygons manually placed via /dev/johto-map-editor against the real
// public/images/johto-map.png (1402x1122) — the editor captures points as
// percentages and converts them to this file's pixel coordinates using the
// image's own natural size, exactly the way world-map-config.ts's Kanto
// polygons are pixel coordinates against its own 1254x1254 image.
//
// Geometry-corrected the same way Kanto's own polygons were (see that
// file's own doc comment): the cave/lava and lava/haunted-house/water
// corners were snapped to the exact same point (they were within ~1
// percentage point of each other, clearly meant to be one shared corner),
// and the two touching the image's right edge were pinned to x=1402
// exactly. water and beach originally shared a border traced twice with
// enough drift between the two traces to actually cross (verified via
// edge-intersection + point-in-polygon checks, not eyeballed) — that
// shared edge was replaced with one path (the midpoint between the two
// original traces) used by both polygons, which removes the crossing
// without reshaping either zone. No other zone pair overlaps or crosses;
// a few small gaps remain between other neighbors (e.g. grassland/cave,
// grassland/beach) the same way Kanto's own file documents one river-side
// gap it deliberately left alone — closing them would mean inventing new
// boundary points rather than a small coordinate correction.
export const JOHTO_MAP_CONFIG: WorldMapConfig = {
  imageSrc: "/images/johto-map.png",

  viewBox: {
    width: 1402,
    height: 1122,
  },

  regions: [
    {
      zoneId: "grassland",
      points: "533,11 463,146 491,247 491,314 603,393 715,482 813,494 911,561 855,628 813,707 771,797 673,774 589,729 519,729 379,684 308,617 266,539 196,460 112,449 14,449 0,258 0,0",
    },
    {
      zoneId: "cave",
      points: "561,0 561,123 575,236 645,314 729,325 799,325 883,292 925,157 981,79 1066,0",
    },
    {
      zoneId: "lava",
      points: "1066,0 1052,79 995,146 925,224 939,325 1023,404 1094,449 1206,482 1262,516 1402,516 1402,0",
    },
    {
      zoneId: "haunted-house",
      points: "1402,516 1290,527 1220,516 1150,482 1037,471 967,516 1009,561 1009,595 953,651 897,707 911,808 953,898 1066,942 1206,954 1332,942 1402,942",
    },
    {
      zoneId: "water",
      points: "1402,942 1262,1010 1150,987 1066,999 967,999 841,898 729,875 701,942 631,987 491,987 365,965 224,886 98,785 14,718 14,1100 1388,1122",
    },
    {
      zoneId: "beach",
      points: "0,494 154,527 266,640 351,696 435,741 505,763 603,785 729,875 701,942 631,987 491,987 365,965 224,886 98,785 14,718",
    },
  ],
};
