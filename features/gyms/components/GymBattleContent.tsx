"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BattleScene } from "@/components/battle/BattleScene";
import { HealthBar } from "@/components/battle/HealthBar";
import { SpriteImage } from "@/components/media/SpriteImage";
import { useActiveBattle } from "@/features/battle-session/context/active-battle-context";
import { BattleWindow } from "@/features/battle/components/BattleWindow";
import { buildAttackSlots } from "@/features/battle/utils/battle-attack-slots";
import { attackMessage, faintedMessage, forcedReplacementMessage, partyDefeatedMessage } from "@/features/battle/utils/battle-messages";
import {
  abandonGymBattleAction,
  executeGymBattleActionAction,
  getGymBattleViewDataAction,
  switchGymBattleActivePokemonAction,
} from "@/features/gyms/actions/gym-battle.actions";
import type { GymBattleViewData } from "@/features/gyms/services/gym-battle-view.service";
import type { GrantedGymReward } from "@/features/gyms/services/gym-reward.service";
import { npcSentOutMessage, npcTeamDefeatedMessage } from "@/features/gyms/utils/gym-battle-messages";
import { getBattleTheme } from "@/lib/battle/battleThemes";
import type { BattleMenuAction } from "@/shared/types/battle-ui";
import { GymVictoryRewardDialog } from "./GymVictoryRewardDialog";

interface GymBattleContentProps {
  initialData: GymBattleViewData;
}

type BattleOutcome = { kind: "victory"; reward: GrantedGymReward | null } | { kind: "defeat" } | null;

const MENU_ACTIONS: BattleMenuAction[] = [{ id: "forfeit", label: "פרישה" }];

// GYMS & LEAGUES PHASE 4 — the NPC battle screen (section 10). Reuses
// BattleWindow (the shared page shell) and BattleScene (the shared
// theme-driven sprite/HUD/attack-panel composition) unmodified — the ONLY
// thing genuinely new here is this file's own orchestration (calling the
// Gym Server Actions instead of Field Battle's, and the Gym-specific
// context header/switch-panel/reward-dialog below).
//
// Deliberately NOT a reuse of BattleContent.tsx itself: that component is
// tightly coupled to wild-encounter-only concepts this battle must never
// trigger (capture, Egg/Chest finds, escape-as-completion, wild rarity) —
// force-fitting an "NPC mode" into it would risk exactly the kind of
// cross-contamination Phase 3's own service-layer isolation was built to
// prevent. Same "extract/reuse what's cleanly shared, build a small
// separate orchestrator for what's genuinely different" call Phase 3 made
// for the turn engine vs. the session model.
export function GymBattleContent({ initialData }: GymBattleContentProps) {
  const router = useRouter();
  const { setActiveBattle } = useActiveBattle();
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState(initialData);
  const [message, setMessage] = useState(npcSentOutMessage(initialData.npc.name));
  const [needsReplacement, setNeedsReplacement] = useState(false);
  const [outcome, setOutcome] = useState<BattleOutcome>(null);

  useEffect(() => {
    setActiveBattle(true);
    return () => setActiveBattle(false);
  }, [setActiveBattle]);

  function handleAttack(moveId: string) {
    if (isPending || needsReplacement || outcome) return;

    startTransition(async () => {
      const result = await executeGymBattleActionAction(moveId);

      if (result.status === "invalid-active-pokemon") {
        setNeedsReplacement(true);
        return;
      }
      if (result.status !== "success") {
        // no-session / not-owned / invalid-move — the session is gone or
        // stale; there is nothing left to do here but return to /gyms.
        router.push("/gyms");
        return;
      }

      setMessage(attackMessage(data.player.name, data.npc.name));

      if (result.victoryCompleted) {
        setOutcome({ kind: "victory", reward: result.reward ?? null });
        return;
      }
      if (result.winner === "npc") {
        setMessage(partyDefeatedMessage());
        setOutcome({ kind: "defeat" });
        return;
      }

      const refreshed = await getGymBattleViewDataAction();
      if (refreshed.status !== "ready") {
        router.push("/gyms");
        return;
      }

      if (result.npcFainted) {
        setMessage(`${faintedMessage(data.npc.name)} ${npcSentOutMessage(refreshed.data.npc.name)}`);
      } else if (result.partyPokemonFainted) {
        setMessage(forcedReplacementMessage(data.player.name));
        setNeedsReplacement(true);
      }

      setData(refreshed.data);
    });
  }

  function handleSwitch(playerPokemonId: string) {
    if (isPending) return;
    startTransition(async () => {
      const switched = await switchGymBattleActivePokemonAction(playerPokemonId);
      if (switched.status !== "ok") return;

      const refreshed = await getGymBattleViewDataAction();
      if (refreshed.status !== "ready") {
        router.push("/gyms");
        return;
      }

      setData(refreshed.data);
      setNeedsReplacement(false);
      setMessage(`קדימה, ${refreshed.data.player.name}!`);
    });
  }

  function handleMenuAction(actionId: string) {
    if (actionId !== "forfeit" || isPending) return;
    startTransition(async () => {
      await abandonGymBattleAction();
      router.push("/gyms");
    });
  }

  if (outcome?.kind === "victory") {
    // Easy/Medium victories complete with no reward (section 12 — no
    // numeric reward for those) — a short confirmation instead of the full
    // Badge/Medal/money/XP dialog, which only ever applies to a Gym
    // Leader/Regional Champion win.
    return outcome.reward ? (
      <GymVictoryRewardDialog
        regionId={data.regionId}
        gymNumber={data.gymNumber}
        reward={outcome.reward}
        onConfirm={() => router.push("/gyms")}
      />
    ) : (
      <GymEasyMediumVictoryNotice onConfirm={() => router.push("/gyms")} />
    );
  }

  const theme = getBattleTheme();
  const attacks = buildAttackSlots([...data.knownMoves]);

  return (
    <BattleWindow>
      <BattleScene
        theme={theme}
        enemy={{
          name: data.npc.name,
          level: data.npc.level,
          currentHealth: Math.max(0, data.npc.currentHp),
          maxHealth: data.npc.maxHp,
          spriteUrl: data.npc.spriteUrl,
          status: data.npc.status,
        }}
        player={{
          name: data.player.name,
          level: data.player.level,
          currentHealth: Math.max(0, data.player.currentHp),
          maxHealth: data.player.maxHp,
          spriteUrl: data.player.spriteUrl,
          fallbackSpriteUrl: data.player.fallbackSpriteUrl,
          status: data.player.status,
        }}
        message={outcome?.kind === "defeat" ? partyDefeatedMessage() : needsReplacement ? forcedReplacementMessage(data.player.name) : message}
        attacks={needsReplacement || outcome ? [] : attacks}
        onAttackSelect={handleAttack}
        menuActions={needsReplacement || outcome ? [] : MENU_ACTIONS}
        onMenuAction={handleMenuAction}
      />

      {/* GYM CONTEXT HEADER (section 10) — region/Gym/battle-slot name or
          Regional Champion, plus how many opponents remain, so the player
          always knows which of the 27 Gyms/9 Champions they're fighting and
          how much of the fixed team is left — never ambiguous with a Field
          Battle wild encounter. */}
      <div dir="rtl" className="pointer-events-none absolute right-3 top-3 rounded-lg bg-black/50 px-3 py-1.5 text-xs text-slate-100 backdrop-blur-sm sm:right-6 sm:top-6">
        <p className="font-semibold">{data.contextLabel}</p>
        <p className="text-slate-300">
          יריבים שנותרו: {data.npcTeamRemainingCount} / {data.npcTeamTotalCount}
        </p>
      </div>

      {needsReplacement ? (
        <GymPartySwitcher participants={data.participants} onSelect={handleSwitch} disabled={isPending} />
      ) : null}

      {outcome?.kind === "defeat" ? (
        <div dir="rtl" role="dialog" aria-modal="true" className="absolute inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-red-400/30 bg-slate-900 p-6 text-center shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100">הפסדת בקרב</h2>
            <p className="mt-2 text-sm text-slate-400">אפשר לנסות שוב בכל עת — לא נרשמה שום התקדמות.</p>
            <button
              type="button"
              onClick={() => router.push("/gyms")}
              className="mt-6 w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-600"
            >
              חזרה למכונים
            </button>
          </div>
        </div>
      ) : null}
    </BattleWindow>
  );
}

interface GymPartySwitcherProps {
  participants: GymBattleViewData["participants"];
  onSelect: (playerPokemonId: string) => void;
  disabled: boolean;
}

// Deliberately NOT a reuse of features/party/components/PartySelector.tsx:
// that component's availability rule (canSwitchTo) reads a real
// OwnedPokemon's REAL currentHp — exactly the field Phase 3's own isolation
// guarantees a Gym battle never touches. Reusing it here would show the
// WRONG availability (a real-Pokémon at 1 HP but full battle-local HP would
// look unusable, and vice versa). This tiny custom list reads only the
// battle-local participant view (currentHp/fainted from
// NpcBattleSession.playerBattleHp), which is the only correct source here.
function GymPartySwitcher({ participants, onSelect, disabled }: GymPartySwitcherProps) {
  return (
    <div dir="rtl" role="dialog" aria-modal="true" className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl">
        <h2 className="mb-3 text-base font-bold text-slate-100">הפוקימון שלך התעלף — בחר פוקימון אחר</h2>
        <div className="flex flex-col gap-2">
          {participants.map((participant) => (
            <button
              key={participant.id}
              type="button"
              disabled={disabled || participant.fainted || participant.isActive}
              onClick={() => onSelect(participant.id)}
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

// GYM REWARD RULE (section 12) — Easy/Medium victories complete with no
// numeric reward at all; this simple confirmation is what they show instead
// of the full Badge/Medal/money/XP GymVictoryRewardDialog.
function GymEasyMediumVictoryNotice({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div dir="rtl" role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-emerald-400/30 bg-slate-900 p-6 text-center shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100">{npcTeamDefeatedMessage()}</h2>
        <button
          type="button"
          onClick={onConfirm}
          className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          אישור
        </button>
      </div>
    </div>
  );
}
