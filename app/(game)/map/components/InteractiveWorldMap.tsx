"use client";

import { useState } from "react";

import type { WorldMapConfig } from "@/shared/types/map";
import type { ZoneId } from "@/shared/types/zone";

interface InteractiveWorldMapProps {
  config: WorldMapConfig;
  onZoneSelect: (zoneId: ZoneId) => void;
  getZoneLabel?: (zoneId: ZoneId) => string;
}

export function InteractiveWorldMap({
  config,
  onZoneSelect,
  getZoneLabel,
}: InteractiveWorldMapProps) {
  const [hoveredZoneId, setHoveredZoneId] = useState<ZoneId | null>(null);

  const { imageSrc, viewBox, regions } = config;

  return (
    <div style={{ width: "100%", maxWidth: "560px", margin: "0 auto" }}>
      <svg
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        role="img"
        aria-label="World map"
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <image
          href={imageSrc}
          x={0}
          y={0}
          width={viewBox.width}
          height={viewBox.height}
          preserveAspectRatio="xMidYMid meet"
        />

        {regions.map((region, index) => {
          const isHovered = hoveredZoneId === region.zoneId;

          return (
            <polygon
              key={`${region.zoneId}-${index}`}
              points={region.points}
              onMouseEnter={() => setHoveredZoneId(region.zoneId)}
              onMouseLeave={() => setHoveredZoneId(null)}
              onClick={() => onZoneSelect(region.zoneId)}
              style={{
                cursor: "pointer",
                fill: isHovered
                  ? "rgba(255, 255, 255, 0.25)"
                  : "rgba(255, 255, 255, 0)",
                stroke: isHovered ? "rgba(255, 255, 255, 0.85)" : "none",
                strokeWidth: 3,
                transition: "fill 0.15s ease, stroke 0.15s ease",
              }}
            >
              {getZoneLabel ? <title>{getZoneLabel(region.zoneId)}</title> : null}
            </polygon>
          );
        })}
      </svg>

      {hoveredZoneId && getZoneLabel ? (
        <p
          style={{
            textAlign: "center",
            marginTop: "12px",
            fontWeight: "bold",
          }}
        >
          {getZoneLabel(hoveredZoneId)}
        </p>
      ) : null}
    </div>
  );
}
