"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";

import type { MapPoint } from "@/shared/types/map";
import type { ZoneId } from "@/shared/types/zone";

// Paldea has no real Zone[] data yet (data/zones/zone-data.ts's own
// getZoneData("paldea") resolves to an empty array until a future phase adds
// data/zones/paldea-zone-data.ts) — so, same as every prior region's editor
// before its own zone data existed, this editor can't read zone display
// names from real data. Unlike Galar/Alola/Kalos (deliberate FIVE-zone
// regions with no Beach), Paldea is a SIX-zone region per this phase's own
// approved design (Paldea Phase 4 spec) — Beach IS used here. This is a
// fixed, explicit, Paldea-only list, never derived from shared/types/
// zone.ts's own ALL_ZONE_IDS (which already has all six ids for every
// region) — the global ZoneId union itself is not touched by this file.
const PALDEA_ZONE_IDS: readonly ZoneId[] = ["grassland", "water", "cave", "lava", "haunted-house", "beach"];

const EDITOR_ZONES: { id: ZoneId; name: string }[] = PALDEA_ZONE_IDS.map((id) => ({
  id,
  name: id
    .split("-")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" "),
}));

const PALDEA_IMAGE_SRC = "/images/paldea-map.png";
const STORAGE_KEY = "paldea-map-editor:points-v1";

// Points are kept in percentage space (0-100 on each axis) rather than raw
// pixels — the click handler below always divides by the rendered
// element's own bounding rect, so a point is captured identically
// regardless of how large the editor happens to be displayed, and survives
// a page reload (localStorage) without needing to know the real image's
// pixel size up front. The real pixel config (viewBox + "x,y x,y ..."
// strings) is only ever derived from this at export time, via
// toPixelPoints below, using the actual image's naturalWidth/naturalHeight
// once it's loaded (1402×1122 — read directly from paldea-map.png's own
// IHDR chunk, not guessed).
type PointsByZone = Partial<Record<ZoneId, MapPoint[]>>;

type CopyTarget = "zone" | "config";
type CopyStatus = { target: CopyTarget; result: "copied" | "failed" } | null;

function loadStoredPoints(): PointsByZone {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as PointsByZone) : {};
  } catch {
    return {};
  }
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

// Converts this zone's percentage-space points into the actual pixel
// coordinates the exported config should contain — the exact same "x,y x,y
// ..." string shape data/maps/world-map-config.ts, data/maps/johto-map-
// config.ts, data/maps/hoenn-map-config.ts, data/maps/sinnoh-map-config.ts,
// data/maps/unova-map-config.ts, data/maps/kalos-map-config.ts,
// data/maps/alola-map-config.ts, and data/maps/galar-map-config.ts already
// use. Falls back to a 100x100 pixel space (i.e. the percentages
// themselves) whenever the real Paldea image hasn't loaded yet, so the tool
// stays usable — and still produces a structurally valid WorldMapConfig —
// even if /images/paldea-map.png were ever temporarily unavailable.
function toPixelPoints(percentPoints: MapPoint[], imageSize: { width: number; height: number }): MapPoint[] {
  return percentPoints.map((point) => ({
    x: Math.round((point.x / 100) * imageSize.width),
    y: Math.round((point.y / 100) * imageSize.height),
  }));
}

function formatPointsAttribute(points: MapPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

// Dev-only manual polygon editor for the Paldea map — adapted directly from
// app/dev/galar-map-editor/components/GalarMapEditor.tsx (itself modeled on
// AlolaMapEditor.tsx, KalosMapEditor.tsx, UnovaMapEditor.tsx,
// SinnohMapEditor.tsx, HoennMapEditor.tsx, JohtoMapEditor.tsx, and, before
// that, MapHitAreaEditor.tsx for Kanto), reusing the exact same
// click-to-polygon-point architecture and WorldMapConfig output shape
// rather than inventing a new interaction system. The only structural
// difference from Galar/Alola/Kalos (five-zone regions with no Beach) is
// that PALDEA_ZONE_IDS includes "beach" as a sixth zone, plus
// PALDEA_IMAGE_SRC, STORAGE_KEY, and the Paldea-specific labels/paths below
// — everything else (coordinate capture, localStorage persistence, export
// shape) is identical. Deliberately does not touch WORLD_MAP_CONFIG,
// JOHTO_MAP_CONFIG, HOENN_MAP_CONFIG, SINNOH_MAP_CONFIG, UNOVA_MAP_CONFIG,
// KALOS_MAP_CONFIG, ALOLA_MAP_CONFIG, GALAR_MAP_CONFIG, the Region Registry,
// data/zones/paldea-zone-data.ts, or any Paldea battle-capability — this
// only ever produces text for a human to review and manually paste into a
// new data/maps/paldea-map-config.ts in a future phase (Paldea Phase 5),
// and no coordinate in this file is ever invented — every point comes from
// an actual click the operator made against the real image.
export function PaldeaMapEditor() {
  const [selectedZoneId, setSelectedZoneId] = useState<ZoneId>(EDITOR_ZONES[0]?.id ?? "grassland");
  const [pointsByZone, setPointsByZone] = useState<PointsByZone>({});
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Hydrate from localStorage once on mount — after mount (not during
  // useState's initializer) so this component renders identically on
  // server and first client paint, then picks up any saved progress right
  // after, avoiding a hydration mismatch.
  useEffect(() => {
    setPointsByZone(loadStoredPoints());
    setHasHydrated(true);
  }, []);

  // Persists every change so refreshing the editor doesn't erase progress —
  // skipped until the initial hydration above has run, so this never
  // overwrites a saved session with the empty initial state.
  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pointsByZone));
  }, [pointsByZone, hasHydrated]);

  const currentPoints = pointsByZone[selectedZoneId] ?? [];
  const pointsAttribute = currentPoints.map((point) => `${point.x},${point.y}`).join(" ");

  // The real image's own pixel dimensions once loaded; a 100x100 fallback
  // (i.e. exported points equal the raw percentages) whenever it hasn't —
  // see toPixelPoints's own doc comment.
  const effectiveImageSize = imageSize ?? { width: 100, height: 100 };

  function handleMapClick(event: MouseEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();

    const percentX = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const percentY = clampPercent(((event.clientY - rect.top) / rect.height) * 100);

    setPointsByZone((previous) => ({
      ...previous,
      [selectedZoneId]: [...(previous[selectedZoneId] ?? []), { x: percentX, y: percentY }],
    }));
  }

  function handleUndo() {
    setPointsByZone((previous) => ({
      ...previous,
      [selectedZoneId]: (previous[selectedZoneId] ?? []).slice(0, -1),
    }));
  }

  function handleClearCurrent() {
    setPointsByZone((previous) => ({ ...previous, [selectedZoneId]: [] }));
  }

  function handleClearAll() {
    setPointsByZone({});
  }

  function handleRemovePoint(index: number) {
    setPointsByZone((previous) => ({
      ...previous,
      [selectedZoneId]: (previous[selectedZoneId] ?? []).filter((_, pointIndex) => pointIndex !== index),
    }));
  }

  async function copyText(text: string, target: CopyTarget) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus({ target, result: "copied" });
    } catch {
      setCopyStatus({ target, result: "failed" });
    }
    setTimeout(() => setCopyStatus(null), 2000);
  }

  function handleCopyCurrentZone() {
    const pixelPoints = toPixelPoints(currentPoints, effectiveImageSize);
    const snippet = `{\n  zoneId: "${selectedZoneId}",\n  points: "${formatPointsAttribute(pixelPoints)}",\n},`;
    void copyText(snippet, "zone");
  }

  const fullConfigSnippet = useMemo(() => {
    const regionEntries = EDITOR_ZONES.map((zone) => {
      const zonePoints = pointsByZone[zone.id] ?? [];
      if (zonePoints.length < 3) return null;

      const pixelPoints = toPixelPoints(zonePoints, effectiveImageSize);
      return `    { zoneId: "${zone.id}", points: "${formatPointsAttribute(pixelPoints)}" },`;
    }).filter((entry): entry is string => entry !== null);

    return [
      'import type { WorldMapConfig } from "@/shared/types/map";',
      "",
      "export const PALDEA_MAP_CONFIG: WorldMapConfig = {",
      `  imageSrc: "${PALDEA_IMAGE_SRC}",`,
      `  viewBox: { width: ${effectiveImageSize.width}, height: ${effectiveImageSize.height} },`,
      "  regions: [",
      ...regionEntries,
      "  ],",
      "};",
      "",
    ].join("\n");
  }, [pointsByZone, effectiveImageSize]);

  const zonesWithEnoughPoints = EDITOR_ZONES.filter((zone) => (pointsByZone[zone.id]?.length ?? 0) >= 3).length;

  function handleCopyFullConfig() {
    void copyText(fullConfigSnippet, "config");
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "24px",
        padding: "24px",
        fontFamily: "Arial",
        color: "white",
        backgroundColor: "#0f172a",
        minHeight: "100vh",
      }}
    >
      <div style={{ flex: "0 0 auto", width: "min(560px, 90vw)" }}>
        {/* Plain HTML <img>, invisible — its only job is reading the real
            image's naturalWidth/naturalHeight so exported points can be
            true pixel coordinates instead of a 0-100 fallback. Rendering
            the actual map is the SVG <image> below, which uses a fixed
            0-100 viewBox (see the component's own doc comment) so every
            click maps to a percentage regardless of display size. */}
        <img
          src={PALDEA_IMAGE_SRC}
          alt=""
          aria-hidden="true"
          style={{ display: "none" }}
          onLoad={(event) => {
            const target = event.currentTarget;
            setImageSize({ width: target.naturalWidth, height: target.naturalHeight });
            setImageLoadFailed(false);
          }}
          onError={() => setImageLoadFailed(true)}
        />

        <svg
          viewBox="0 0 100 100"
          onClick={handleMapClick}
          role="img"
          aria-label="Paldea map editor"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            cursor: "crosshair",
            border: "1px solid #334155",
            backgroundColor: "#1e293b",
          }}
        >
          <image href={PALDEA_IMAGE_SRC} x={0} y={0} width={100} height={100} preserveAspectRatio="none" />

          {currentPoints.length >= 3 ? (
            <polygon
              points={pointsAttribute}
              style={{
                fill: "rgba(34, 197, 94, 0.35)",
                stroke: "#22c55e",
                strokeWidth: 0.4,
                pointerEvents: "none",
              }}
            />
          ) : currentPoints.length === 2 ? (
            <polyline
              points={pointsAttribute}
              style={{
                fill: "none",
                stroke: "#22c55e",
                strokeWidth: 0.4,
                pointerEvents: "none",
              }}
            />
          ) : null}

          {currentPoints.map((point, index) => (
            <g key={`point-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r={1.3}
                style={{ fill: "#facc15", stroke: "#78350f", strokeWidth: 0.3, pointerEvents: "none" }}
              />
              <text
                x={point.x + 1.8}
                y={point.y - 1.8}
                fontSize={3.2}
                fill="white"
                stroke="#0f172a"
                strokeWidth={0.3}
                paintOrder="stroke"
                style={{ pointerEvents: "none" }}
              >
                {index + 1}
              </text>
            </g>
          ))}
        </svg>

        {imageLoadFailed ? (
          <p style={{ color: "#f87171", marginTop: "8px" }}>
            {PALDEA_IMAGE_SRC} wasn&apos;t found — add the file to public/images to see it here. You can still
            place points against the placeholder background; export will use a 100x100 fallback viewBox until
            the real image is present.
          </p>
        ) : null}
      </div>

      <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: "16px", maxWidth: "480px" }}>
        <h1>Paldea Map Editor</h1>

        <p style={{ color: "#94a3b8" }}>
          Dev-only tool. Select a zone, click the map to place polygon points, then copy either this zone&apos;s
          snippet or the full config below. Nothing here is saved to the database or wired into the game — paste
          the result into data/maps/paldea-map-config.ts yourself when you&apos;re ready (Paldea Phase 5). Paldea
          stays without a mapConfig in the Region Registry (and therefore not battle-capable) until you do that
          manually. Paldea is a six-zone region — Beach IS included here, unlike Galar/Alola/Kalos.
        </p>

        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          Zone
          <select
            value={selectedZoneId}
            onChange={(event) => setSelectedZoneId(event.target.value as ZoneId)}
            style={{ padding: "8px", fontSize: "16px" }}
          >
            {EDITOR_ZONES.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} ({zone.id}) — {pointsByZone[zone.id]?.length ?? 0} pt
                {(pointsByZone[zone.id]?.length ?? 0) === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" onClick={handleUndo} disabled={currentPoints.length === 0} style={{ padding: "8px 16px" }}>
            Undo last point
          </button>

          <button
            type="button"
            onClick={handleClearCurrent}
            disabled={currentPoints.length === 0}
            style={{ padding: "8px 16px" }}
          >
            Clear current polygon
          </button>

          <button type="button" onClick={handleClearAll} style={{ padding: "8px 16px" }}>
            Clear all polygons
          </button>
        </div>

        {currentPoints.length > 0 ? (
          <div>
            <h2 style={{ fontSize: "16px" }}>Points ({currentPoints.length})</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
              {currentPoints.map((point, index) => (
                <li
                  key={`point-row-${index}`}
                  style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "monospace", fontSize: "13px" }}
                >
                  <span>
                    #{index + 1}: {point.x.toFixed(1)}%, {point.y.toFixed(1)}%
                  </span>
                  <button type="button" onClick={() => handleRemovePoint(index)} style={{ padding: "2px 8px" }}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>0 points placed for this zone.</p>
        )}

        <p style={{ color: "#94a3b8", fontSize: "13px" }}>
          {imageSize
            ? `Image size: ${imageSize.width}×${imageSize.height}px — exported points use these real pixel coordinates.`
            : "Image size not detected yet — exported points currently fall back to a 0-100 scale."}
        </p>

        <div>
          <h2 style={{ fontSize: "16px" }}>This zone&apos;s snippet</h2>
          <textarea
            readOnly
            value={`{\n  zoneId: "${selectedZoneId}",\n  points: "${formatPointsAttribute(toPixelPoints(currentPoints, effectiveImageSize))}",\n},`}
            rows={4}
            style={{ width: "100%", fontFamily: "monospace", padding: "8px", boxSizing: "border-box" }}
          />
          <button
            type="button"
            onClick={handleCopyCurrentZone}
            disabled={currentPoints.length < 3}
            style={{ marginTop: "8px", padding: "8px 16px" }}
          >
            Copy current polygon
          </button>
          {copyStatus?.target === "zone" ? (
            <span style={{ marginLeft: "8px", color: copyStatus.result === "copied" ? "#22c55e" : "#ef4444" }}>
              {copyStatus.result === "copied" ? "Copied!" : "Copy failed — select the text manually"}
            </span>
          ) : null}
        </div>

        <div>
          <h2 style={{ fontSize: "16px" }}>
            Full Paldea config ({zonesWithEnoughPoints}/{EDITOR_ZONES.length} zones ready)
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "13px" }}>
            Only zones with 3+ points are included — a zone with fewer points is skipped until you finish it.
          </p>
          <textarea
            readOnly
            value={fullConfigSnippet}
            rows={12}
            style={{ width: "100%", fontFamily: "monospace", padding: "8px", boxSizing: "border-box" }}
          />
          <button type="button" onClick={handleCopyFullConfig} style={{ marginTop: "8px", padding: "8px 16px" }}>
            Copy full Paldea map config
          </button>
          {copyStatus?.target === "config" ? (
            <span style={{ marginLeft: "8px", color: copyStatus.result === "copied" ? "#22c55e" : "#ef4444" }}>
              {copyStatus.result === "copied" ? "Copied!" : "Copy failed — select the text manually"}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
