"use client";

import { useEffect, useRef, useState } from "react";

import { getOnlineCountAction } from "@/features/presence/actions/presence.actions";
import { PRESENCE_READ_POLL_INTERVAL_MS } from "@/features/presence/config/presence.config";
import { usePageVisible } from "@/lib/hooks/use-page-visible";

interface OnlinePlayerCountStatProps {
  initialCount: number;
}

// HOME STATISTICS — ONLINE PLAYERS. One grid tile inside StatisticsPanel,
// styled to match its sibling stat tiles exactly. This is a RELOCATION of
// the same live count the old standalone OnlinePlayersCounter card used to
// show (now removed — see StatisticsPanel's own doc comment), never a
// second definition of "online" or a second poll loop: the source of truth
// stays getOnlinePlayerCount (features/presence/services/presence.service.ts)
// via the same getOnlineCountAction/PRESENCE_READ_POLL_INTERVAL_MS every
// other presence-derived read on Home already used. Seeded from
// home-data.service.ts's own server-rendered read for the first paint, same
// "server seeds first paint, client poll keeps it live" pattern this
// project's other live numbers (Global Chat, Friends Bar) already follow.
export function OnlinePlayerCountStat({ initialCount }: OnlinePlayerCountStatProps) {
  const [count, setCount] = useState(initialCount);
  const isPageVisible = usePageVisible();
  // SITE RENDER PERFORMANCE — set while the tab is hidden so the effect
  // below fires exactly one immediate refresh the moment it becomes visible
  // again, without also firing one on the ordinary first mount (which never
  // fetched immediately — `initialCount` already seeds it).
  const wasHiddenRef = useRef(false);

  useEffect(() => {
    if (!isPageVisible) {
      wasHiddenRef.current = true;
      return;
    }

    let cancelled = false;

    async function tick() {
      try {
        const fresh = await getOnlineCountAction();
        if (!cancelled) setCount(fresh);
      } catch {
        // A transient poll failure just tries again next tick — never
        // surfaced to the user as an error, same convention the old
        // OnlinePlayersCounter poll loop already established.
      }
    }

    if (wasHiddenRef.current) {
      wasHiddenRef.current = false;
      tick();
    }

    const interval = setInterval(tick, PRESENCE_READ_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isPageVisible]);

  return (
    <div className="rounded-lg bg-slate-950/40 p-2.5 text-center">
      <dd className="text-lg font-bold text-slate-100">{count}</dd>
      <dt className="text-[11px] text-slate-500">מחוברים עכשיו</dt>
    </div>
  );
}
