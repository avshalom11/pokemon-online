"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

function getSnapshot(): boolean {
  return document.visibilityState === "visible";
}

// Server-rendered/pre-hydration snapshot — every "use client" caller here
// only ever runs its poll inside a useEffect anyway, so this value is never
// actually read before hydration; `true` just avoids a needless
// hydration-mismatch warning.
function getServerSnapshot(): boolean {
  return true;
}

// SITE RENDER PERFORMANCE — the one shared "is this tab actually visible
// right now" signal every lightweight poll loop (Friends data, the
// private-message popup watcher, Global/private chat, the Home online-count
// tile) gates itself on, so a backgrounded/minimized tab stops firing
// requests (and the state updates/rerenders that follow them) nobody is
// there to see. Deliberately NOT used by PresenceHeartbeat — a backgrounded
// tab must still count as online, a distinct concern from wasted UI-poll
// traffic (see that component's own doc comment).
export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
