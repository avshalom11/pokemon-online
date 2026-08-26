"use client";

import { useEffect, useRef, useState } from "react";

import { hasPlayerLeveledUp } from "@/features/player-progression/progression-calculations";
import {
  playerLevelUpDialogButtonLabel,
  playerLevelUpDialogMessage,
  playerLevelUpDialogRewardGoldLine,
  playerLevelUpDialogRewardMoneyLine,
  playerLevelUpDialogRewardTitle,
  playerLevelUpDialogTitle,
} from "@/features/player-progression/progression-messages";
import type { LevelUpReward } from "@/features/player-progression/progression-types";
import { usePlayerProgression } from "@/features/player/context/player-progression-context";

// PLAYER LEVEL UP — CONGRATULATIONS DIALOG. Mounted once at the (game)
// layout level (same "watcher mounted once, survives every client-side
// navigation because the layout itself never remounts" pattern
// PresenceHeartbeat/FriendshipSyncWatcher already establish), reading the
// SAME single client-side source of truth for the player's account level
// every other header/XP display already reads: PlayerProgressionContext
// (features/player/context/player-progression-context.tsx). No level
// math of any kind lives here — `progress.level` is always the server's
// already-computed value (see progression-service.ts's addPlayerExperience,
// the one place PlayerProfile.level is ever written), whether it arrived
// via a battle reward's applyProgress call or a fresh page load's
// server-seeded `initial` prop. This never distinguishes WHERE the level
// came from (Field Battle, a background re-sync, or any future source
// that eventually flows into this same context) — it only ever reacts to
// the account level actually going up.
//
// ONE XP GRANT, MULTIPLE LEVELS: progress.level already reflects the
// FINAL level after a multi-level grant (the server computes it in one
// step — see progression-calculations.ts's getPlayerProgress), so this
// only ever shows one dialog with that one final level, never one per
// level crossed.
//
// Never fires on mount: lastSeenLevelRef starts at whatever `progress.level`
// already is the first time this renders, so a page load that happens to
// already be at a high level (from a level-up on a previous visit) never
// spuriously re-shows the dialog. Only a genuine INCREASE observed after
// that point — within this same mounted lifetime — triggers it.
export function PlayerLevelUpDialog() {
  const { progress, levelUpReward } = usePlayerProgression();
  const lastSeenLevelRef = useRef(progress.level);
  const [dialogLevel, setDialogLevel] = useState<number | null>(null);
  // PLAYER LEVEL-UP REWARDS — shown in this SAME dialog, never a second
  // popup. Captured alongside dialogLevel below rather than read from
  // levelUpReward directly at render time, so a LATER level-up's reward
  // (context's levelUpReward moving on) can never overwrite the amount
  // already shown for the dialog currently on screen.
  const [dialogReward, setDialogReward] = useState<LevelUpReward | null>(null);

  useEffect(() => {
    if (hasPlayerLeveledUp(lastSeenLevelRef.current, progress.level)) {
      setDialogLevel(progress.level);
      // Only trust levelUpReward when its level matches the increase just
      // observed — a level-up detected via the OTHER update path (the
      // background getPlayerProgressAction re-sync in BattleContent, which
      // carries no reward info) must never show a stale/mismatched amount
      // left over from an earlier level-up.
      setDialogReward(levelUpReward && levelUpReward.level === progress.level ? levelUpReward : null);
    }
    lastSeenLevelRef.current = progress.level;
  }, [progress.level, levelUpReward]);

  if (dialogLevel === null) return null;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-amber-400/30 bg-slate-900 p-6 text-center shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100">{playerLevelUpDialogTitle}</h2>
        <p className="mt-3 text-sm text-slate-300">{playerLevelUpDialogMessage(dialogLevel)}</p>

        {dialogReward ? (
          <div className="mt-4 rounded-lg border border-amber-400/20 bg-slate-800/60 p-3">
            <p className="text-xs font-semibold text-slate-400">{playerLevelUpDialogRewardTitle}</p>
            <p className="mt-1 text-sm font-semibold text-amber-300">
              {playerLevelUpDialogRewardMoneyLine(dialogReward.money)}
            </p>
            <p className="text-sm font-semibold text-amber-300">{playerLevelUpDialogRewardGoldLine(dialogReward.gold)}</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setDialogLevel(null)}
          className="mt-6 w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
        >
          {playerLevelUpDialogButtonLabel}
        </button>
      </div>
    </div>
  );
}
