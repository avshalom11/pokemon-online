"use client";

import { useEffect, useState } from "react";

import { formatDaycareCountdown } from "@/features/daycare/daycare-format";

interface DaycareCountdownProps {
  // ISO timestamp — always the server's own authoritative
  // calculateDaycareProgress result (Section 13: "the SERVER remains
  // authoritative for earned levels"). This component only ever formats a
  // known future instant into readable text; it never decides ON ITS OWN
  // that a level was earned, and never calls anything when the countdown
  // reaches zero — the next real page load/background poll
  // (DAYCARE_VIEW_POLL_INTERVAL_MS) is what picks up the newly-earned
  // level from the server.
  nextLevelDueAtIso: string;
}

// SECTION 13 — TIME UNTIL NEXT LEVEL. Display-only: ticks its own local
// "now" once a minute purely to keep the rendered text fresh between
// background polls, never to grant or assume progress itself.
export function DaycareCountdown({ nextLevelDueAtIso }: DaycareCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const msRemaining = new Date(nextLevelDueAtIso).getTime() - now;

  return <span>{formatDaycareCountdown(msRemaining)}</span>;
}
