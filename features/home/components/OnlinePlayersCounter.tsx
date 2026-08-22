"use client";

import { useEffect, useState } from "react";

import { getOnlineCountAction } from "@/features/presence/actions/presence.actions";
import { PRESENCE_READ_POLL_INTERVAL_MS } from "@/features/presence/config/presence.config";

interface OnlinePlayersCounterProps {
  initialCount: number;
}

// ONLINE PRESENCE — HOME ONLINE COUNT. Same compact-card look as
// DailyBattleCounter.tsx, seeded from home-data.service.ts's own
// server-rendered read for the first paint (so the number is correct even
// before this component's own poll has ticked once), then kept live with a
// lightweight client poll — the ONE new poll loop this feature adds (Global
// Chat and the Friends Bar need none: their own existing polls already
// recompute presence on every tick). Never triggers router.refresh() or any
// other full-page reload — only this one number updates.
export function OnlinePlayersCounter({ initialCount }: OnlinePlayersCounterProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const fresh = await getOnlineCountAction();
        if (!cancelled) setCount(fresh);
      } catch {
        // A transient poll failure just tries again next tick — never
        // surfaced to the user as an error, same convention useGlobalChat's
        // own poll loop already establishes.
      }
    }

    const interval = setInterval(tick, PRESENCE_READ_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-fit rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1.5 text-sm font-semibold text-slate-200">
      {`משתמשים מחוברים כרגע: ${count}`}
    </div>
  );
}
