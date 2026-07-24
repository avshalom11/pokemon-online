"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type { PlayerProgress } from "@/features/player-progression/progression-types";

interface PlayerProgressionContextValue {
  progress: PlayerProgress;
  // Pushes a fresh, server-authoritative snapshot immediately — no
  // navigation, no full refresh. Two call sites use this: BattleContent
  // applies a reward action's own response the instant it resolves (see
  // progressFromLevelUpResult), and the same battle screen's exit path
  // (escape/capture/party-defeat) does one final background re-fetch via
  // getPlayerProgressAction as a confirm-against-the-DB pass. A fast kill
  // streak can have two reward calls in flight at once (the next encounter
  // never waits on the previous one's XP grant — see battle-timing.ts), so
  // an out-of-order response is possible; only ever accepted if it
  // represents equal-or-greater total XP than what's already shown, so a
  // stale response can never move the displayed XP backwards.
  applyProgress: (next: PlayerProgress) => void;
}

const PlayerProgressionContext = createContext<PlayerProgressionContextValue | null>(null);

interface PlayerProgressionProviderProps {
  initial: PlayerProgress;
  children: ReactNode;
}

// The single client-side source of truth for the global header's level/XP
// display (components/layout/GameHeader.tsx) — lives in app/(game)/layout.tsx,
// above both the header and {children}, so it survives client-side
// navigation between pages inside this layout (battle -> map, in
// particular) instead of being re-created, and any page can push it a fresh
// value without waiting for the layout to re-render server-side. Seeded
// from `initial` (app/(game)/layout.tsx's own getPlayerHeaderData call) and
// re-seeded whenever that prop changes on a real navigation/full refresh —
// the same "adjust state during render" idiom NotificationBell already
// uses for its own initial-prop-resync, not a useEffect.
export function PlayerProgressionProvider({ initial, children }: PlayerProgressionProviderProps) {
  const [progress, setProgress] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setProgress(initial);
  }

  function applyProgress(next: PlayerProgress) {
    setProgress((current) => (next.totalXp >= current.totalXp ? next : current));
  }

  return (
    <PlayerProgressionContext.Provider value={{ progress, applyProgress }}>
      {children}
    </PlayerProgressionContext.Provider>
  );
}

export function usePlayerProgression(): PlayerProgressionContextValue {
  const context = useContext(PlayerProgressionContext);
  if (!context) {
    throw new Error("usePlayerProgression must be used within a PlayerProgressionProvider");
  }
  return context;
}
