"use client";

import { useState, type MouseEvent } from "react";

import { ZONE_DATA } from "@/data/zones/zone-data";
import type { MapPoint, WorldMapConfig } from "@/shared/types/map";
import type { ZoneId } from "@/shared/types/zone";

interface MapHitAreaEditorProps {
  config: WorldMapConfig;
}

type CopyStatus = "idle" | "copied" | "failed";

export function MapHitAreaEditor({ config }: MapHitAreaEditorProps) {
  const { imageSrc, viewBox, regions } = config;

  const [selectedZoneId, setSelectedZoneId] = useState<ZoneId>(
    ZONE_DATA[0]?.id ?? "grassland"
  );
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [showExistingRegions, setShowExistingRegions] = useState(true);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  function handleMapClick(event: MouseEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();

    const x = Math.round(
      ((event.clientX - rect.left) / rect.width) * viewBox.width
    );
    const y = Math.round(
      ((event.clientY - rect.top) / rect.height) * viewBox.height
    );

    setPoints((previousPoints) => [...previousPoints, { x, y }]);
  }

  function handleUndo() {
    setPoints((previousPoints) => previousPoints.slice(0, -1));
  }

  function handleClear() {
    setPoints([]);
  }

  const pointsAttribute = points
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const exportSnippet = `{\n  zoneId: "${selectedZoneId}",\n  points: "${pointsAttribute}",\n},`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(exportSnippet);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }

    setTimeout(() => setCopyStatus("idle"), 2000);
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
        <svg
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          onClick={handleMapClick}
          role="img"
          aria-label="Map hit area editor"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            cursor: "crosshair",
            border: "1px solid #334155",
          }}
        >
          <image
            href={imageSrc}
            x={0}
            y={0}
            width={viewBox.width}
            height={viewBox.height}
            preserveAspectRatio="xMidYMid meet"
          />

          {showExistingRegions
            ? regions.map((region, index) => (
                <polygon
                  key={`existing-${region.zoneId}-${index}`}
                  points={region.points}
                  style={{
                    fill: "none",
                    stroke: "rgba(255, 255, 255, 0.35)",
                    strokeWidth: 2,
                    pointerEvents: "none",
                  }}
                />
              ))
            : null}

          {points.length >= 3 ? (
            <polygon
              points={pointsAttribute}
              style={{
                fill: "rgba(34, 197, 94, 0.35)",
                stroke: "#22c55e",
                strokeWidth: 3,
                pointerEvents: "none",
              }}
            />
          ) : points.length === 2 ? (
            <polyline
              points={pointsAttribute}
              style={{
                fill: "none",
                stroke: "#22c55e",
                strokeWidth: 3,
                pointerEvents: "none",
              }}
            />
          ) : null}

          {points.map((point, index) => (
            <circle
              key={`point-${index}`}
              cx={point.x}
              cy={point.y}
              r={10}
              style={{
                fill: "#facc15",
                stroke: "#78350f",
                strokeWidth: 2,
                pointerEvents: "none",
              }}
            />
          ))}
        </svg>
      </div>

      <div
        style={{
          flex: "1 1 320px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxWidth: "420px",
        }}
      >
        <h1>Map Hit Area Editor</h1>

        <p style={{ color: "#94a3b8" }}>
          Dev-only tool. Select a zone, click the map to place polygon
          points, then copy the snippet below into world-map-config.ts.
        </p>

        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          Zone
          <select
            value={selectedZoneId}
            onChange={(event) =>
              setSelectedZoneId(event.target.value as ZoneId)
            }
            style={{ padding: "8px", fontSize: "16px" }}
          >
            {ZONE_DATA.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} ({zone.id})
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={showExistingRegions}
            onChange={(event) =>
              setShowExistingRegions(event.target.checked)
            }
          />
          Show existing regions
        </label>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={handleUndo}
            disabled={points.length === 0}
            style={{ padding: "8px 16px" }}
          >
            Undo last point
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={points.length === 0}
            style={{ padding: "8px 16px" }}
          >
            Clear polygon
          </button>
        </div>

        <p>
          {points.length} point{points.length === 1 ? "" : "s"} placed
        </p>

        <div>
          <h2 style={{ fontSize: "16px" }}>Export snippet</h2>

          <textarea
            readOnly
            value={exportSnippet}
            rows={4}
            style={{
              width: "100%",
              fontFamily: "monospace",
              padding: "8px",
              boxSizing: "border-box",
            }}
          />

          <button
            type="button"
            onClick={handleCopy}
            disabled={points.length < 3}
            style={{ marginTop: "8px", padding: "8px 16px" }}
          >
            Copy snippet
          </button>

          {copyStatus === "copied" ? (
            <span style={{ marginLeft: "8px", color: "#22c55e" }}>
              Copied!
            </span>
          ) : null}

          {copyStatus === "failed" ? (
            <span style={{ marginLeft: "8px", color: "#ef4444" }}>
              Copy failed — select the text manually
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
