import { notFound } from "next/navigation";

import { MapHitAreaEditor } from "./components/MapHitAreaEditor";
import { WORLD_MAP_CONFIG } from "@/data/maps/world-map-config";

export default function MapEditorPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <MapHitAreaEditor config={WORLD_MAP_CONFIG} />;
}
