"use client";

import { useRouter } from "next/navigation";

import { InteractiveWorldMap } from "./components/InteractiveWorldMap";
import { WORLD_MAP_CONFIG } from "@/data/maps/world-map-config";
import { ZONE_DATA } from "@/data/zones/zone-data";
import type { ZoneId } from "@/shared/types/zone";

export default function MapPage() {
  const router = useRouter();

  function handleZoneSelect(zoneId: ZoneId) {
    router.push(`/battle?zone=${zoneId}`);
  }

  function getZoneLabel(zoneId: ZoneId) {
    const zone = ZONE_DATA.find(
      (currentZone) => currentZone.id === zoneId
    );

    return zone?.name ?? zoneId;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#14532d",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px",
        fontFamily: "Arial",
      }}
    >
      <h1>מפת העולם</h1>

      <p>בחר אזור כדי להתחיל קרב</p>

      <div
        style={{
          marginTop: "40px",
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <InteractiveWorldMap
          config={WORLD_MAP_CONFIG}
          onZoneSelect={handleZoneSelect}
          getZoneLabel={getZoneLabel}
        />
      </div>
    </main>
  );
}