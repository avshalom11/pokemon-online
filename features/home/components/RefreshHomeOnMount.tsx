"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { consumePendingBackForwardNavigation } from "@/features/home/utils/back-forward-navigation";

// Forces one fresh server refetch of this route, but ONLY when Home mounts
// as the result of a genuine browser back/forward navigation (e.g. Map's
// own back button, used to return here after a battle) — that's the one
// case that reuses Next's client Router Cache regardless of the
// `staleTimes.dynamic` default (that setting only governs forward
// Link/router.push navigations, not back/forward), so without this a
// player could defeat a wild Pokémon then return to Home and still see the
// daily battle counter (features/home/components/DailyBattleCounter.tsx)
// from before that victory. router.refresh() is the one thing that
// invalidates a stale back/forward cache entry for the current route.
//
// SITE RENDER PERFORMANCE — ordinary forward navigation to Home (a sidebar
// link, "back to Home" buttons elsewhere that use router.push, etc.) must
// NOT pay for a full GameLayout server re-render (all 7 of its parallel
// fetches, plus Home's own) on every single visit — only a real
// back/forward restoration needs that. consumePendingBackForwardNavigation
// (features/home/utils/back-forward-navigation.ts) is what tells the two
// apart: it only ever returns true right after a real `popstate` event,
// which browsers fire exclusively for back/forward, never for a Link click
// or router.push.
export function RefreshHomeOnMount() {
  const router = useRouter();

  useEffect(() => {
    if (consumePendingBackForwardNavigation()) {
      router.refresh();
    }
  }, [router]);

  return null;
}
