import { notFound } from "next/navigation";

import { JohtoMapEditor } from "./components/JohtoMapEditor";

// Dev-only, same guard as app/dev/map-editor/page.tsx (the Kanto hit-area
// editor this tool is modeled on) — returns a plain 404 in production
// rather than gating via middleware, since this route is never linked from
// real game navigation (no Home card, nothing under app/(game)) and isn't
// worth a second protection layer.
export default function JohtoMapEditorPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <JohtoMapEditor />;
}
