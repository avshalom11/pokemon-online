"use client";

import { useCallback, useState } from "react";

import { useTutorial } from "@/features/tutorial/context/tutorial-context";
import type { WorldMapConfig } from "@/shared/types/map";
import type { ZoneId } from "@/shared/types/zone";

// GAME TUTORIAL — PHASE 1. The one zone this stage's own registry entry
// spotlights (tutorial-stages.config.ts's "map" stage) — a plain constant,
// never a prop threaded through from the registry itself, since this
// component has no other reason to know about the Tutorial at all.
const GRASSLAND_TUTORIAL_TARGET_ID = "zone-grassland";

interface InteractiveWorldMapProps {
  config: WorldMapConfig;
  onZoneSelect: (zoneId: ZoneId) => void;
  getZoneLabel?: (zoneId: ZoneId) => string;
  // Fired on hover, before any click — lets a caller prefetch the zone's
  // destination route (see MapContent's router.prefetch) so it's already
  // warm by the time the player actually clicks. Optional/no-op by default
  // so this component stays usable without navigation concerns too.
  onZoneHover?: (zoneId: ZoneId) => void;
}

export function InteractiveWorldMap({
  config,
  onZoneSelect,
  getZoneLabel,
  onZoneHover,
}: InteractiveWorldMapProps) {
  const [hoveredZoneId, setHoveredZoneId] = useState<ZoneId | null>(null);
  // GAME TUTORIAL — PHASE 1. Zone polygons are rendered from a dynamic
  // .map() below, so this calls registerTarget/unregisterTarget directly
  // (plain functions from context, safe to call anywhere) rather than the
  // useTutorialTarget hook — that hook itself must never be called
  // conditionally/per-iteration (Rules of Hooks), which a variable-length
  // regions list would violate.
  const { registerTarget, unregisterTarget } = useTutorial();

  // MAP CRASH FIX. Must be a STABLE function identity across renders —
  // registerTarget/unregisterTarget are themselves stable (empty-dep
  // useCallback, see tutorial-context.tsx), so this stays stable too. This
  // matters because this component re-renders on every registryVersion
  // bump ANYWHERE in the app (useTutorial()'s own context value includes
  // it) — an inline ref callback recreated on every render gets a new
  // identity each time, and React detaches+reattaches any ref whose
  // callback identity changed, even when the underlying DOM node didn't.
  // Detaching called unregisterTarget, which bumped registryVersion, which
  // re-rendered this component, which created a new inline callback again
  // — an infinite register/unregister loop that crashed the real /map page
  // ("Maximum update depth exceeded", React's runaway-setState guard) the
  // instant the Grassland polygon mounted. A stable callback ref is only
  // ever invoked on a genuine mount/unmount of the DOM node, never on a
  // same-node re-render.
  const registerGrasslandRef = useCallback(
    (node: SVGPolygonElement | null) => {
      if (node) registerTarget(GRASSLAND_TUTORIAL_TARGET_ID, node);
      else unregisterTarget(GRASSLAND_TUTORIAL_TARGET_ID);
    },
    [registerTarget, unregisterTarget]
  );

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
              ref={region.zoneId === "grassland" ? registerGrasslandRef : undefined}
              points={region.points}
              onMouseEnter={() => {
                setHoveredZoneId(region.zoneId);
                onZoneHover?.(region.zoneId);
              }}
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
