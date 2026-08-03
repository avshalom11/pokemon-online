interface RegionMapImageProps {
  englishName: string;
  mapImageSrc: string;
}

// Shown by MapContent for a region with a map image but no interactive zone
// config yet (RegionDefinition.hasMap true, mapConfig absent — Johto today).
// Deliberately a plain, non-interactive <img>: no polygons, no click/hover
// handlers, no ZoneId anywhere in this component, so there is no way for
// this to ever start a battle or accidentally reuse another region's zone
// overlays. Once a region gets its own mapConfig, MapContent renders
// InteractiveWorldMap instead of this — nothing here needs to change for
// that to happen.
export function RegionMapImage({ englishName, mapImageSrc }: RegionMapImageProps) {
  return (
    <div style={{ width: "100%", maxWidth: "560px", margin: "0 auto", textAlign: "center" }}>
      <img
        src={mapImageSrc}
        alt={`${englishName} map`}
        style={{ width: "100%", height: "auto", display: "block", borderRadius: "8px" }}
      />
    </div>
  );
}
