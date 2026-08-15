"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface ActiveBattleContextValue {
  isActiveBattle: boolean;
  // Pushed live by BattleContent itself (features/battle/components/
  // BattleContent.tsx) — true the instant it mounts, false the instant it
  // unmounts (a plain useEffect + cleanup), since BattleContent only ever
  // mounts when app/(game)/battle/page.tsx has already server-validated a
  // real FieldBattleSession for this exact request, and it only ever
  // unmounts by navigating away from /battle — which is precisely when
  // there is no longer an active battle screen to protect. Never a second
  // tracked copy of session data, purely a UI-gating flag.
  setActiveBattle: (value: boolean) => void;
}

const ActiveBattleContext = createContext<ActiveBattleContextValue | null>(null);

interface ActiveBattleProviderProps {
  // Seeded from hasActiveBattleSession (battle-session.service.ts) via
  // app/(game)/layout.tsx — correct for a hard refresh or a direct
  // navigation landing straight on /battle. Client-side navigation between
  // pages under this same layout doesn't re-run that server check (the
  // layout segment isn't re-fetched), so BattleContent's own mount/unmount
  // is what keeps this correct the rest of the time — same split
  // PlayerProgressionProvider/DailyBattleCountProvider already established.
  initial: boolean;
  children: ReactNode;
}

export function ActiveBattleProvider({ initial, children }: ActiveBattleProviderProps) {
  const [isActiveBattle, setActiveBattle] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setActiveBattle(initial);
  }

  return (
    <ActiveBattleContext.Provider value={{ isActiveBattle, setActiveBattle }}>{children}</ActiveBattleContext.Provider>
  );
}

export function useActiveBattle(): ActiveBattleContextValue {
  const context = useContext(ActiveBattleContext);
  if (!context) {
    throw new Error("useActiveBattle must be used within an ActiveBattleProvider");
  }
  return context;
}
