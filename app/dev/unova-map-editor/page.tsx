import { notFound } from "next/navigation";

import { UnovaMapEditor } from "./components/UnovaMapEditor";

// Dev-only, same guard as app/dev/sinnoh-map-editor/page.tsx (and, before
// that, app/dev/hoenn-map-editor/page.tsx, app/dev/johto-map-editor/page.tsx,
// and app/dev/map-editor/page.tsx for Kanto) — returns a plain 404 in
// production rather than gating via middleware, since this route is never
// linked from real game navigation (no Home card, nothing under
// app/(game)) and isn't worth a second protection layer.
export default function UnovaMapEditorPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <UnovaMapEditor />;
}
