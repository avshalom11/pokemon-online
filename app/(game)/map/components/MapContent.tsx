"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { InteractiveWorldMap } from "./InteractiveWorldMap";
import { WORLD_MAP_CONFIG } from "@/data/maps/world-map-config";
import { ZONE_DATA } from "@/data/zones/zone-data";
import type { ZoneId } from "@/shared/types/zone";

interface MapContentProps {
  // Optional one-off message forwarded from a redirect (see
  // app/battle/page.tsx's "party-needs-healing" redirect when the whole
  // party has fainted). Plain conditional banner, not a toast library —
  // dismissible, never re-triggers itself.
  notice?: string;
}

const NOTICE_MESSAGES: Record<string, string> = {
  "party-needs-healing": "כל הפוקימונים בצוות שלך התעלפו — הם זקוקים להחלמה לפני קרב נוסף.",
};

// Moved verbatim from app/map/page.tsx when that page became a server
// component (session check + redirect) — this component's own internals
// and behavior are unchanged. The only tweak is extra top padding so the
// existing back button clears the newly-added fixed GameHeader above it.
export function MapContent({ notice }: MapContentProps) {
  const router = useRouter();
  const [dismissedNotice, setDismissedNotice] = useState(false);
  const noticeMessage = notice && !dismissedNotice ? NOTICE_MESSAGES[notice] : undefined;

  // replace (not push): entering a battle shouldn't leave the pre-battle Map
  // state as its own back-target — Battle is an ephemeral encounter, not a
  // page a player would expect Back to return them into. Pairs with
  // BattleContent's run-away handler, which also replaces rather than
  // pushes, so leaving a battle always lands Back on whatever was open
  // before Map (e.g. Home), never back into the finished battle.
  function handleZoneSelect(zoneId: ZoneId) {
    router.replace(`/battle?zone=${zoneId}`);
  }

  // Warms the Battle route the instant a player hovers a zone — by the time
  // they actually click, the route is often already prefetched, so
  // handleZoneSelect's navigation above resolves as fast as a same-layout
  // client transition rather than a cold server round trip.
  function handleZoneHover(zoneId: ZoneId) {
    router.prefetch(`/battle?zone=${zoneId}`);
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

      {noticeMessage ? (
        <div
          style={{
            marginTop: "16px",
            width: "100%",
            maxWidth: "600px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "rgba(248, 113, 113, 0.15)",
            border: "1px solid rgba(248, 113, 113, 0.4)",
            fontFamily: "Arial",
            fontSize: "14px",
          }}
        >
          <span>{noticeMessage}</span>
          <button
            type="button"
            onClick={() => setDismissedNotice(true)}
            aria-label="סגור הודעה"
            style={{
              cursor: "pointer",
              backgroundColor: "transparent",
              border: "none",
              color: "white",
              fontSize: "16px",
            }}
          >
            ✕
          </button>
        </div>
      ) : null}

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
          onZoneHover={handleZoneHover}
          getZoneLabel={getZoneLabel}
        />
      </div>
    </main>
  );
}
