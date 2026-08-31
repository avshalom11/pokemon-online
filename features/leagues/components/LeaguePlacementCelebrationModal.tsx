"use client";

import { useEffect, useRef, useTransition } from "react";

import { SpriteImage } from "@/components/media/SpriteImage";
import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";
import { getChestDefinition } from "@/features/chests/data/chest-definitions";
import { playVictorySound } from "@/features/battle/utils/battle-result-sound";
import { acknowledgeLeaguePlacementCelebrationAction } from "../actions/acknowledge-league-placement-celebration.action";
import { LeagueCelebrationFireworks } from "./LeagueCelebrationFireworks";
import type { PendingLeaguePlacementCelebration } from "../services/league-placement-celebration.service";

interface LeaguePlacementCelebrationModalProps {
  celebration: PendingLeaguePlacementCelebration;
  onAcknowledged: () => void;
}

// LEAGUE — FINAL PLACEMENT CELEBRATION MODAL. A MANDATORY confirmation —
// deliberately the one modal in this feature with no backdrop-click
// dismissal, no keyboard-driven dismissal, and no dedicated close control
// (same intentional "one-time reward reveal, not a casually dismissible
// panel" shell ChestOpenResultDialog.tsx/HatchResultDialog.tsx already
// establish, just stricter here). The only way out is a successful
// server-side acknowledgement via the "אישור" button below.
//
// ONE SHARED COMPONENT FOR ALL THREE PLACEMENTS (section 7 of this task) —
// never three separate modals; only the accent color/glow and which medal
// tier reads "prominent" scale with `celebration.place`, everything else
// (layout, reward rows, button) is identical.
//
// Every piece of data rendered here — the award image, the League's own
// Hebrew name, and the reward summary — comes straight off `celebration`
// (features/leagues/services/league-placement-celebration.service.ts),
// itself built from the real LeagueTournamentPlacement row and the real
// LeaguePlacementRewardDefinition (league-reward-registry.ts). This
// component never recomputes an image path, a League name, or a reward
// amount itself, and never grants anything — clicking "אישור" only ever
// calls acknowledgeLeaguePlacementCelebrationAction, which persists an
// acknowledgement record, nothing else.
const PLACEMENT_THEME: Record<
  1 | 2 | 3,
  { border: string; glow: string; button: string; ring: string }
> = {
  1: {
    border: "border-amber-400/50",
    glow: "shadow-[0_0_60px_rgba(251,191,36,0.35)]",
    button: "bg-amber-500 hover:bg-amber-400",
    ring: "ring-4 ring-amber-400/40",
  },
  2: {
    border: "border-slate-300/40",
    glow: "shadow-[0_0_45px_rgba(203,213,225,0.25)]",
    button: "bg-slate-400 hover:bg-slate-300 text-slate-950",
    ring: "ring-4 ring-slate-300/30",
  },
  3: {
    border: "border-orange-400/40",
    glow: "shadow-[0_0_40px_rgba(251,146,60,0.25)]",
    button: "bg-orange-500 hover:bg-orange-400",
    ring: "ring-4 ring-orange-400/30",
  },
};

export function LeaguePlacementCelebrationModal({ celebration, onAcknowledged }: LeaguePlacementCelebrationModalProps) {
  const [isPending, startTransition] = useTransition();
  const theme = PLACEMENT_THEME[celebration.place];
  const { reward } = celebration;

  // VICTORY SOUND — plays exactly once per NEW celebration. Guarded by a
  // ref keyed on tournamentId (same "ref-guarded so this plays exactly
  // once" precedent LeagueMatchContent.tsx's own battle-result-sound
  // wiring already establishes) rather than relying solely on this
  // component being remounted per celebration (it is — see
  // LeaguesContent.tsx's own `key={tournamentId}` — but the ref guard
  // keeps this correct even under React Strict Mode's double-invoked
  // effects, with no risk of an unrelated re-render replaying it, since an
  // unrelated re-render never changes celebration.tournamentId).
  const playedSoundForTournamentIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (playedSoundForTournamentIdRef.current === celebration.tournamentId) return;
    playedSoundForTournamentIdRef.current = celebration.tournamentId;
    playVictorySound();
  }, [celebration.tournamentId]);

  function handleAcknowledge() {
    // PREVENT DUPLICATE ACKNOWLEDGEMENT SUBMISSIONS (section 3/9) — a
    // rapid double-click while the first request is still in flight must
    // never fire a second acknowledgement request.
    if (isPending) return;
    startTransition(async () => {
      await acknowledgeLeaguePlacementCelebrationAction(celebration.tournamentId);
      // Only advance past this modal once the server confirms the
      // acknowledgement — a network failure leaves the modal open and the
      // button re-enabled, never silently dismissing an unacknowledged
      // placement.
      onAcknowledged();
    });
  }

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="league-placement-celebration-heading"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      {/* FIREWORKS — rendered here, BEFORE the card below, so it paints
          above the backdrop but behind the card (plain DOM stacking order
          within this shared stacking context — neither layer sets its own
          z-index). pointer-events-none (set on the layer itself) keeps it
          from ever intercepting the אישור button's clicks. */}
      <LeagueCelebrationFireworks intense={celebration.place === 1} />

      <div className={`relative flex w-full max-w-sm flex-col items-center rounded-2xl border ${theme.border} bg-slate-900 p-6 text-center ${theme.glow}`}>
        <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{celebration.leagueDisplayName}</p>
        <h2 id="league-placement-celebration-heading" className="mt-1 text-2xl font-bold text-slate-100">
          {celebration.placementTitle}
        </h2>

        <div className={`mt-5 flex h-32 w-32 items-center justify-center rounded-full ${theme.ring}`}>
          <SpriteImage
            src={celebration.imageUrl}
            alt={celebration.placementTitle}
            className="h-28 w-28 object-contain"
            fallbackClassName="flex h-28 w-28 items-center justify-center rounded-full border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
        </div>

        <p className="mt-4 text-sm text-slate-300">זכית בפרסים הבאים:</p>
        <div className="mt-2 flex w-full flex-col gap-1.5">
          <RewardRow label="כסף" valueText={reward.money.toLocaleString("he-IL")} currency="money" />
          {reward.gold > 0 ? <RewardRow label="זהב" valueText={reward.gold.toLocaleString("he-IL")} currency="gold" /> : null}
          <RewardRow label="ניסיון" valueText={`${reward.xpPercentOfNextLevel}%`} />
          {reward.chestRewards.map((chest) => {
            const definition = getChestDefinition(chest.chestTypeId);
            return <RewardRow key={chest.chestTypeId} label={definition.displayName} valueText={`×${chest.quantity}`} imageUrl={definition.imageUrl} />;
          })}
        </div>

        <button
          type="button"
          onClick={handleAcknowledge}
          disabled={isPending}
          className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${theme.button}`}
        >
          אישור
        </button>
      </div>
    </div>
  );
}

interface RewardRowProps {
  label: string;
  valueText: string;
  imageUrl?: string;
  currency?: "money" | "gold";
}

function RewardRow({ label, valueText, imageUrl, currency }: RewardRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-800/60 p-2">
      {imageUrl ? (
        <SpriteImage
          src={imageUrl}
          alt={label}
          className="h-8 w-8 shrink-0 object-contain"
          fallbackClassName="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
        />
      ) : currency ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center">
          <CurrencyIcon type={currency} className="h-5 w-5" />
        </span>
      ) : null}

      <span className="flex-1 text-right text-sm font-semibold text-slate-100">{label}</span>
      <span dir="ltr" className="text-sm font-bold text-emerald-300">
        {valueText}
      </span>
    </div>
  );
}
