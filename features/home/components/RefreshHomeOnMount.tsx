"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Forces one fresh server refetch of this route the instant Home mounts.
// Needed specifically because browser back/forward navigation (e.g. Map's
// own back button, used to return here after a battle) reuses Next's
// client Router Cache regardless of the `staleTimes.dynamic` default —
// that setting only governs forward Link/router.push navigations, not
// back/forward — so without this, a player could defeat a wild Pokémon
// then return to Home and still see the daily battle counter
// (features/home/components/DailyBattleCounter.tsx) from before that
// victory. router.refresh() is the one thing that invalidates a stale
// back/forward cache entry for the current route.
export function RefreshHomeOnMount() {
  const router = useRouter();

  useEffect(() => {
    router.refresh();
  }, [router]);

  return null;
}
