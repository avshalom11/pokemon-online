"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BattleScene } from "@/components/battle/BattleScene";
import { HealthBar } from "@/components/battle/HealthBar";
import { SpriteImage } from "@/components/media/SpriteImage";
import { useActiveBattle } from "@/features/battle-session/context/active-battle-context";
import { BattleWindow } from "@/features/battle/components/BattleWindow";
import { buildAttackSlots } from "@/features/battle/utils/battle-attack-slots";
import { attackMessage, forcedReplacementMessage } from "@/features/battle/utils/battle-messages";
import {
  getLeagueBattleViewDataAction,
  submitLeagueBattleActionAction,
  switchLeagueBattleActivePokemonAction,
} from "@/features/leagues/actions/league-battle.actions";
import type { LeagueBattleViewData } from "@/features/leagues/services/league-battle-view.service";
import { getBattleTheme } from "@/lib/battle/battleThemes";
import type { BattleMenuAction } from "@/shared/types/battle-ui";

interface LeagueMatchContentProps {
  matchId: string;
  initialData: LeagueBattleViewData;
}

const NO_MENU_ACTIONS: BattleMenuAction[] = [];

// GYMS & LEAGUES PHASE 6 — the League PvP match screen (section 19). Reuses
// BattleWindow + BattleScene unmodified, exactly the same "shared shell,
// new orchestrator" call GymBattleContent.tsx already made in Phase 4 — not
// a reuse of BattleContent/GymBattleContent themselves, since PvP has a
// genuinely different flow neither handles (waiting for a second human,
// simultaneous move submission, no capture/Egg/Chest/escape-as-win
// concepts at all). No second visual battle implementation exists here —
// only a new orchestrator around the same primitives.
export function LeagueMatchContent({ matchId, initialData }: LeagueMatchContentProps) {
  const router = useRouter();
  const { setActiveBattle } = useActiveBattle();
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState(initialData);
  const [message, setMessage] = useState<string | null>(null);
  const [needsReplacement, setNeedsReplacement] = useState(false);

  // ACTIVE-BATTLE NAVIGATION LOCK (section 20) — the exact same generic
  // context Field Battle/Gym Battle already push into; no League-specific
  // lock implementation. NAVIGATION (section 21) — this cleanup only ever
  // flips the UI-gating flag; it never deletes or forfeits the persistent
  // LeagueBattleSession, which is why re-entering this same route later
  // resumes exactly where the match left off.
  useEffect(() => {
    setActiveBattle(true);
    return () => setActiveBattle(false);
  }, [setActiveBattle]);

  // Poll for the opponent while waiting (join, or their move) — no
  // WebSocket/live-push infrastructure exists in this project yet, so a
  // light interval refetch is the simplest correct way for a second human's
  // action to actually show up without a manual page refresh. Never runs
  // once the match is completed.
  useEffect(() => {
    if (data.status === "completed") return;
    const needsOpponent = !data.opponent.joined || (data.status === "in-progress" && !needsReplacement);
    if (!needsOpponent) return;

    const interval = setInterval(() => {
      startTransition(async () => {
        const refreshed = await getLeagueBattleViewDataAction(matchId);
        if (refreshed.status === "ready") setData(refreshed.data);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [data.status, data.opponent.joined, needsReplacement, matchId]);

  function handleAttack(moveId: string) {
    if (isPending || needsReplacement || data.status === "completed") return;

    startTransition(async () => {
      const result = await submitLeagueBattleActionAction(matchId, moveId);

      if (result.status === "invalid-active-pokemon") {
        setNeedsReplacement(true);
        return;
      }
      if (result.status !== "success") {
        return;
      }

      if (!result.resolved) {
        setMessage("ממתין למהלך של היריב...");
        return;
      }

      setMessage(attackMessage(data.self.activeName, data.opponent.activeName));

      const refreshed = await getLeagueBattleViewDataAction(matchId);
      if (refreshed.status !== "ready") return;

      if (result.turn?.selfActiveFainted && !result.battleEnded) {
        setMessage(forcedReplacementMessage(data.self.activeName));
        setNeedsReplacement(true);
      }

      setData(refreshed.data);
    });
  }

  function handleSwitch(slotId: string) {
    if (isPending) return;
    startTransition(async () => {
      const switched = await switchLeagueBattleActivePokemonAction(matchId, slotId);
      if (switched.status !== "ok") return;

      const refreshed = await getLeagueBattleViewDataAction(matchId);
      if (refreshed.status !== "ready") return;

      setData(refreshed.data);
      setNeedsReplacement(false);
      setMessage(`קדימה, ${refreshed.data.self.activeName}!`);
    });
  }

  // MATCH WINDOW STATES (Phase 7, section 28) — server-derived only
  // (data.status/data.roomState), never decided in React. The page itself
  // already ran resolveExpiredLeagueMatch before assembling this data, so
  // an actually-expired match should already be "completed" by the time
  // this renders; this is the rare transient fallback for the moment
  // between the deadline passing and the next resolution attempt.
  if (data.status !== "completed" && data.roomState === "expired") {
    return (
      <BattleWindow>
        <div dir="rtl" className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-950 text-center">
          <p className="text-lg font-semibold text-slate-100">הזמן לקרב הסתיים</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-4 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-600"
          >
            רענון
          </button>
        </div>
      </BattleWindow>
    );
  }

  if (!data.opponent.joined) {
    return (
      <BattleWindow>
        <div dir="rtl" className="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-950 text-center">
          <p className="text-lg font-semibold text-slate-100">ממתין ליריב להצטרף לקרב...</p>
          <p className="text-sm text-slate-400">הקרב יתחיל אוטומטית ברגע שהיריב יצטרף</p>
        </div>
      </BattleWindow>
    );
  }

  if (data.status === "completed") {
    const won = data.winnerSide === "self";
    return (
      <div dir="rtl" role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <div className={`w-full max-w-sm rounded-2xl border p-6 text-center shadow-2xl ${won ? "border-emerald-400/30 bg-slate-900" : "border-red-400/30 bg-slate-900"}`}>
          <h2 className="text-lg font-bold text-slate-100">{won ? "ניצחת בקרב!" : "הפסדת בקרב"}</h2>
          <button
            type="button"
            onClick={() => router.push("/leagues")}
            className="mt-6 w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-600"
          >
            חזרה לליגות
          </button>
        </div>
      </div>
    );
  }

  const theme = getBattleTheme();
  const attacks = buildAttackSlots([...data.knownMoves]);

  return (
    <BattleWindow>
      <BattleScene
        theme={theme}
        enemy={{
          name: data.opponent.activeName,
          level: data.opponent.activeLevel,
          currentHealth: Math.max(0, data.opponent.activeCurrentHp),
          maxHealth: data.opponent.activeMaxHp,
          spriteUrl: data.opponent.activeSpriteUrl,
          status: data.opponent.activeStatus,
        }}
        player={{
          name: data.self.activeName,
          level: data.self.activeLevel,
          currentHealth: Math.max(0, data.self.activeCurrentHp),
          maxHealth: data.self.activeMaxHp,
          spriteUrl: data.self.activeBackSpriteUrl ?? data.self.activeSpriteUrl,
          fallbackSpriteUrl: data.self.activeSpriteUrl,
          status: data.self.activeStatus,
        }}
        message={needsReplacement ? forcedReplacementMessage(data.self.activeName) : (message ?? "הקרב החל!")}
        attacks={needsReplacement ? [] : attacks}
        onAttackSelect={handleAttack}
        menuActions={NO_MENU_ACTIONS}
      />

      <div dir="rtl" className="pointer-events-none absolute right-3 top-3 rounded-lg bg-black/50 px-3 py-1.5 text-xs text-slate-100 backdrop-blur-sm sm:right-6 sm:top-6">
        <p className="font-semibold">קרב ליגה {data.opponent.isComputer ? "מול מחשב" : "מול שחקן"}</p>
      </div>

      {needsReplacement ? <LeagueSwitchPanel participants={data.self.participants} onSelect={handleSwitch} disabled={isPending} /> : null}
    </BattleWindow>
  );
}

interface LeagueSwitchPanelProps {
  participants: LeagueBattleViewData["self"]["participants"];
  onSelect: (slotId: string) => void;
  disabled: boolean;
}

function LeagueSwitchPanel({ participants, onSelect, disabled }: LeagueSwitchPanelProps) {
  return (
    <div dir="rtl" role="dialog" aria-modal="true" className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl">
        <h2 className="mb-3 text-base font-bold text-slate-100">הפוקימון שלך התעלף — בחר פוקימון אחר</h2>
        <div className="flex flex-col gap-2">
          {participants.map((participant) => (
            <button
              key={participant.slotId}
              type="button"
              disabled={disabled || participant.fainted || participant.isActive}
              onClick={() => onSelect(participant.slotId)}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-800/60 p-2 text-right transition-colors enabled:hover:bg-slate-700/60 disabled:opacity-40"
            >
              <SpriteImage src={participant.frontSpriteUrl} alt={participant.name} className="h-12 w-12 object-contain" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-100">
                  {participant.name} <span className="text-slate-400">Lv.{participant.level}</span>
                </p>
                <HealthBar current={Math.max(0, participant.currentHp)} max={participant.maxHp} />
              </div>
              {participant.fainted ? <span className="text-xs text-red-400">התעלף</span> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
