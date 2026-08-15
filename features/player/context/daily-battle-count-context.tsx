"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface DailyBattleCountContextValue {
  count: number;
  // Pushes a fresh, server-authoritative count immediately — no navigation,
  // no full refresh. The one call site is BattleContent, applying
  // executeBattleActionAction's own response the instant a wild-defeat
  // promotes the next encounter (see AdvancedEncounter's dailyBattleCount,
  // battle-session.service.ts) — the exact same request that already
  // incremented it server-side, never a second round trip. Only ever
  // accepted if it's equal-or-greater than what's already shown, the same
  // monotonic guard applyProgress (player-progression-context.tsx) uses, so
  // an out-of-order response from a fast kill streak can never move the
  // displayed count backwards.
  applyDailyBattleCount: (next: number) => void;
}

const DailyBattleCountContext = createContext<DailyBattleCountContextValue | null>(null);

interface DailyBattleCountProviderProps {
  initial: number;
  children: ReactNode;
}

// The single client-side source of truth for the global header's daily
// battle count (components/layout/GameHeader.tsx) — lives in
// app/(game)/layout.tsx, above both the header and {children}, so it
// survives client-side navigation between pages inside this layout (battle
// -> map, in particular) instead of being re-created. Seeded from `initial`
// (app/(game)/layout.tsx's own getPlayerHeaderData call, which reads the
// exact same getTodayBattleCount the Home page already uses) and re-seeded
// whenever that prop changes on a real navigation/full refresh — the same
// "adjust state during render" idiom PlayerProgressionProvider already uses
// for its own initial-prop resync.
export function DailyBattleCountProvider({ initial, children }: DailyBattleCountProviderProps) {
  const [count, setCount] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setCount(initial);
  }

  function applyDailyBattleCount(next: number) {
    setCount((current) => (next >= current ? next : current));
  }

  return (
    <DailyBattleCountContext.Provider value={{ count, applyDailyBattleCount }}>
      {children}
    </DailyBattleCountContext.Provider>
  );
}

export function useDailyBattleCount(): DailyBattleCountContextValue {
  const context = useContext(DailyBattleCountContext);
  if (!context) {
    throw new Error("useDailyBattleCount must be used within a DailyBattleCountProvider");
  }
  return context;
}
