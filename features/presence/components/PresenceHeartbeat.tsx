"use client";

import { useEffect } from "react";

import { sendHeartbeatAction } from "@/features/presence/actions/presence.actions";
import { PRESENCE_HEARTBEAT_INTERVAL_MS } from "@/features/presence/config/presence.config";

// ONLINE PRESENCE — the ONE place a heartbeat is ever sent client-side.
// Mounted once by app/(game)/layout.tsx (same "watcher mounted once at the
// layout level, survives every client-side navigation because the layout
// itself never remounts" pattern FriendshipSyncWatcher/
// PrivateMessagePopupWatcher already establish) — a player's presence is a
// property of "the authenticated game layout is mounted," not of any one
// page, so this must never be remounted per route.
//
// setInterval only, on a fixed PRESENCE_HEARTBEAT_INTERVAL_MS cadence —
// deliberately NOT on every render, click, or navigation (this feature's
// own explicit "do not update on every render/click" requirement). One
// immediate send on mount so a fresh page load doesn't wait a full
// interval before counting as online, then one send per tick after that.
export function PresenceHeartbeat() {
  useEffect(() => {
    sendHeartbeatAction();

    const interval = setInterval(() => {
      sendHeartbeatAction();
    }, PRESENCE_HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
    // Intentionally empty deps — sendHeartbeatAction is a stable Server
    // Action reference and never closes over anything that can go stale,
    // same convention every other interval-driven poll/watcher in this
    // codebase already follows (see friends-data-context.tsx's own poll
    // effect).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
