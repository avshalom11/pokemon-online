import { notFound } from "next/navigation";

import { HoennMapEditor } from "./components/HoennMapEditor";

// Dev-only, same guard as app/dev/johto-map-editor/page.tsx (and, before
// that, app/dev/map-editor/page.tsx for Kanto) — returns a plain 404 in
// production rather than gating via middleware, since this route is never
// linked from real game navigation (no Home card, nothing under
// app/(game)) and isn't worth a second protection layer.
export default function HoennMapEditorPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <HoennMapEditor />;
}
