import type { WorldMapConfig } from "@/shared/types/map";

// Polygons authored against the real public/images/world-map.png (1254x1254).
// grassland is split into two regions (top-left forest + lower-left grass
// strip) since the mountain/cave range visually separates them on the image.
export const WORLD_MAP_CONFIG: WorldMapConfig = {
  imageSrc: "/images/world-map.png",

  viewBox: {
    width: 1254,
    height: 1254,
  },

  regions: [
    {
      zoneId: "grassland",
      points: "0,0 500,0 600,300 480,430 0,430",
    },
    {
      zoneId: "water",
      points: "500,0 860,0 900,250 800,420 850,560 700,700 600,560 650,420 600,300",
    },
    {
      zoneId: "lava",
      points: "860,0 1254,0 1254,600 950,650 850,560 900,250",
    },
    {
      zoneId: "cave",
      points: "0,430 480,430 500,650 350,780 0,780",
    },
    {
      zoneId: "haunted-house",
      points: "700,700 700,1254 1254,1254 1254,600 950,650 850,560",
    },
    {
      zoneId: "grassland",
      points: "0,780 350,780 500,650 600,560 700,700 550,900 300,1000 0,1254",
    },
    {
      zoneId: "beach",
      points: "300,1000 550,900 700,700 700,1254 0,1254",
    },
  ],
};
