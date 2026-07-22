"use client";

import { useRouter } from "next/navigation";

import { InteractiveWorldMap } from "./InteractiveWorldMap";
import { WORLD_MAP_CONFIG } from "@/data/maps/world-map-config";
import { ZONE_DATA } from "@/data/zones/zone-data";
import type { ZoneId } from "@/shared/types/zone";

// Moved verbatim from app/map/page.tsx when that page became a server
// component (session check + redirect) — this component's own internals
// and behavior are unchanged. The only tweak is extra top padding so the
// existing back button clears the newly-added fixed GameHeader above it.
export function MapContent() {
  const router = useRouter();

  function handleZoneSelect(zoneId: ZoneId) {
    router.push(`/battle?zone=${zoneId}`);
  }

  // "/" is only the current start page — it will become the real Home page
  // later, so this fallback stays correct without changes once that happens.
  function handleBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
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
        paddingTop: "calc(var(--app-header-height) + 40px)",
        fontFamily: "Arial",
      }}
    >
      <button
        type="button"
        onClick={handleBack}
        style={{
          alignSelf: "flex-start",
          padding: "10px 20px",
          cursor: "pointer",
          backgroundColor: "transparent",
          border: "1px solid white",
          borderRadius: "6px",
          color: "white",
          fontFamily: "Arial",
          fontSize: "16px",
        }}
      >
        ⬅ חזור
      </button>

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
