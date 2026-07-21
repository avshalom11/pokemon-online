import type { ZoneId } from "./zone";

export interface MapRegion {
  zoneId: ZoneId;

  points: string;
}

export interface WorldMapConfig {
  imageSrc: string;

  viewBox: {
    width: number;
    height: number;
  };

  regions: MapRegion[];
}
