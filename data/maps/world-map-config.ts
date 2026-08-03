import type { WorldMapConfig } from "@/shared/types/map";

// Polygons manually traced against the real public/images/kanto-map.png
// (1254x1254, renamed from world-map.png when the Region Registry's
// per-region map images were introduced — the image itself is unchanged),
// then geometry-corrected: shared corners between neighboring
// zones were snapped to identical coordinates, vertices meant to lie on the
// canvas edge were pinned to it exactly, and unintended cross-zone edge
// crossings were resolved. See PROJECT_RULES.md change log / conversation
// history for the correction details. One small residual gap remains where
// grassland pulls back from a river peninsula around (830,650)-(1000,700) —
// not closed here since doing so would require inventing new boundary
// points rather than a small coordinate correction; refine with the
// /dev/map-editor tool if pixel-perfect coverage is needed there.
export const WORLD_MAP_CONFIG: WorldMapConfig = {
  imageSrc: "/images/kanto-map.png",

  viewBox: {
    width: 1254,
    height: 1254,
  },

  regions: [
    {
      zoneId: "grassland",
      points: "0,0 0,408 101,418 219,474 273,504 346,459 399,484 428,524 461,546 535,640 520,712 493,782 578,805 637,804 668,821 699,833 775,854 734,764 832,656 676,602 580,462 493,401 556,282 515,161 437,0",
    },
    {
      zoneId: "water",
      points: "437,0 479,72 537,69 582,94 573,150 537,199 545,237 556,282 582,300 562,334 551,363 531,412 522,415 580,462 631,457 672,486 674,533 676,602 770,616 832,656 847,580 784,495 818,430 811,353 881,327 924,290 840,244 777,195 766,159 788,112 858,60 901,0",
    },
    {
      zoneId: "cave",
      points: "0,499 101,418 170,502 219,474 273,504 346,459 499,627 520,712 434,804 441,840 417,884 412,961 368,1006 285,1021 219,1059 215,1100 237,1142 155,1130 81,1073 76,988 0,956",
    },
    {
      zoneId: "lava",
      points: "901,0 826,114 777,195 811,217 887,231 936,264 924,290 881,327 811,353 817,392 818,430 813,468 817,528 847,580 877,596 900,564 920,542 956,537 994,569 1008,598 1033,639 1115,644 1158,638 1254,639 1254,0",
    },
    {
      zoneId: "beach",
      points: "1254,1131 1129,1169 1099,1108 939,1057 864,1017 848,949 838,878 775,854 728,867 668,821 637,804 578,805 515,817 441,840 417,884 428,925 412,961 368,1006 285,1021 260,1050 215,1100 237,1142 237,1180 175,1187 155,1130 65,1108 58,1032 0,994 0,1254 1254,1254",
    },
    {
      zoneId: "haunted-house",
      points: "1245,639 1115,644 1033,639 958,575 877,596 911,654 833,705 777,759 788,831 838,878 848,949 939,1057 1075,1079 1099,1108 1254,1082",
    },
  ],
};
