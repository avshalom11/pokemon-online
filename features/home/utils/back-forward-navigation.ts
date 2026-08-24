"use client";

// SITE RENDER PERFORMANCE — HOME router.refresh() GATING. A plain
// module-scoped flag, set by a `popstate` listener registered once for the
// lifetime of the tab. `popstate` only ever fires for a genuine browser
// back/forward navigation — never for a Link click, a sidebar navigation,
// or a router.push/replace — which is exactly the "Home mounted from a
// stale Router Cache entry" case RefreshHomeOnMount.tsx exists to recover
// from, and exactly the case ordinary forward navigation to Home must NOT
// pay for.
let pendingBackForwardNavigation = false;

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    pendingBackForwardNavigation = true;
  });
}

// Read-and-clear rather than a plain getter: a single popstate landing on
// Home must trigger exactly ONE refresh, never a refresh on every
// subsequent ordinary mount afterward (e.g. Home -> Map -> Home again via
// an ordinary Link, with no further back/forward in between).
export function consumePendingBackForwardNavigation(): boolean {
  if (!pendingBackForwardNavigation) return false;
  pendingBackForwardNavigation = false;
  return true;
}
