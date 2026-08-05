import { notFound } from "next/navigation";

import { SinnohMapEditor } from "./components/SinnohMapEditor";

// Dev-only, same guard as app/dev/hoenn-map-editor/page.tsx (and, before
// that, app/dev/johto-map-editor/page.tsx and app/dev/map-editor/page.tsx
// for Kanto) — returns a plain 404 in production rather than gating via
// middleware, since this route is never linked from real game navigation
// (no Home card, nothing under app/(game)) and isn't worth a second
// protection layer.
export default function SinnohMapEditorPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <SinnohMapEditor />;
}
