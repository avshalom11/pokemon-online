"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type { LevelUpReward, PlayerProgress } from "@/features/player-progression/progression-types";

// PLAYER LEVEL-UP REWARDS — the Money/Gold total from a level-up grant,
// tagged with the exact level it belongs to so a consumer
// (PlayerLevelUpDialog) can tell a fresh, matching reward apart from a
// stale one left over from an earlier level-up.
export interface LevelUpRewardEvent extends LevelUpReward {
  level: number;
}

interface PlayerProgressionContextValue {
  progress: PlayerProgress;
  // The reward tied to the most recent level-up this context actually
  // accepted (see applyProgress's own doc comment below), or null before
  // any level-up has happened this session.
  levelUpReward: LevelUpRewardEvent | null;
  // Pushes a fresh, server-authoritative snapshot immediately — no
  // navigation, no full refresh. Two call sites use this: BattleContent
  // applies a reward action's own response the instant it resolves (see
  // progressFromLevelUpResult), passing `reward` alongside it whenever that
  // same response also leveled the player up, and the same battle screen's
  // exit path (escape/capture/party-defeat) does one final background
  // re-fetch via getPlayerProgressAction as a confirm-against-the-DB pass
  // (never passing `reward` — a plain re-sync carries no reward info of its
  // own). A fast kill streak can have two reward calls in flight at once
  // (the next encounter never waits on the previous one's XP grant — see
  // battle-timing.ts), so an out-of-order response is possible; `next` is
  // only ever accepted if it represents equal-or-greater total XP than
  // what's already shown, so a stale response can never move the displayed
  // XP backwards. `reward`, when given, is accepted or rejected by that
  // SAME single check, in the SAME atomic update — never independently —
  // so a stale/out-of-order response can never overwrite a newer, already-
  // shown reward with an older one, the same way it can never move totalXp
  // backwards.
  applyProgress: (next: PlayerProgress, reward?: LevelUpRewardEvent) => void;
}

const PlayerProgressionContext = createContext<PlayerProgressionContextValue | null>(null);

interface PlayerProgressionProviderProps {
  initial: PlayerProgress;
  children: ReactNode;
}

interface ProgressionState {
  progress: PlayerProgress;
  levelUpReward: LevelUpRewardEvent | null;
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
  const [state, setState] = useState<ProgressionState>({ progress: initial, levelUpReward: null });
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setState((current) => ({ progress: initial, levelUpReward: current.levelUpReward }));
  }

  function applyProgress(next: PlayerProgress, reward?: LevelUpRewardEvent) {
    setState((current) => {
      if (next.totalXp < current.progress.totalXp) return current;
      return { progress: next, levelUpReward: reward ?? current.levelUpReward };
    });
  }

  return (
    <PlayerProgressionContext.Provider value={{ progress: state.progress, levelUpReward: state.levelUpReward, applyProgress }}>
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
