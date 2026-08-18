"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BackButton } from "@/components/layout/BackButton";
import { SpriteImage } from "@/components/media/SpriteImage";
import { getChestDefinition } from "@/features/chests/data/chest-definitions";
import { startGymBattleAction } from "@/features/gyms/actions/gym-battle.actions";
import {
  GYM_BATTLE_SLOT_LABELS_HE,
  gymBattleActionLabelHe,
  gymBattleFormatLabelHe,
  gymStartResultMessageHe,
  gymTypeLabelHe,
  regionGymLockMessageHe,
  regionStatusLabelHe,
} from "@/features/gyms/data/gym-labels";
import type { RegionGymOverviewView, RegionGymView } from "@/features/gyms/services/gym-overview-view.service";
import type { StartNpcBattleTarget } from "@/features/gyms/services/gym-battle-session.service";
import type { GymBattleSlotId } from "@/features/gyms/types/gym.types";

interface GymsContentProps {
  journey: RegionGymOverviewView[];
}

// GYMS & LEAGUES PHASE 4/9 — the /gyms page body: the player's whole
// 9-region Gym journey, always shown in progression order (locked future
// regions included, never hidden — section 7). Reuses the existing
// region-card/accordion visual language WorldContent.tsx already
// established for this app rather than inventing a new one. Starting a
// battle here only ever calls startGymBattleAction (Phase 3's own
// startNpcBattle, unmodified) and redirects to /gyms/battle — no NPC battle
// logic is duplicated in this component. Every status/label/reward number
// below reads straight off the server-built RegionGymOverviewView (Phase 4,
// extended Phase 9 with regionStatus/pokemonType/hasActiveSession) — nothing
// here re-derives an unlock rule or a reward amount itself.
export function GymsContent({ journey }: GymsContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedRegionId, setExpandedRegionId] = useState<string | null>(
    journey.find((region) => region.regionUnlocked)?.regionId ?? journey[0]?.regionId ?? null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function startBattle(target: StartNpcBattleTarget) {
    if (isPending) return;
    setErrorMessage(null);

    startTransition(async () => {
      const result = await startGymBattleAction(target);
      if (result.status === "started" || result.status === "resumed") {
        router.push("/gyms/battle");
        return;
      }
      setErrorMessage(gymStartResultMessageHe(result.status));
    });
  }

  return (
    <div dir="rtl" className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950">
      <div className="relative mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <BackButton />

        <div>
          <h1 className="text-lg font-bold text-slate-100">מכונים</h1>
          <p className="mt-1 text-sm text-slate-400">מסע המכונים שלך — תשעה אזורים, שלושה מכונים ומנהל מחוז בכל אחד</p>
        </div>

        {errorMessage ? (
          <div role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          {journey.map((region) => (
            <RegionSection
              key={region.regionId}
              region={region}
              isExpanded={expandedRegionId === region.regionId}
              isPending={isPending}
              onToggle={() => setExpandedRegionId((current) => (current === region.regionId ? null : region.regionId))}
              onStartGymBattle={(gymNumber, battleSlot) =>
                startBattle({ source: "gym", regionId: region.regionId, gymNumber, battleSlot })
              }
              onStartChampionBattle={() => startBattle({ source: "regional-champion", regionId: region.regionId })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// GYMS & LEAGUES PHASE 9 (section 4) — status pill colors/labels, purely a
// presentation switch over the server-computed RegionStatus — never a
// second unlock rule.
const REGION_STATUS_STYLE: Record<RegionGymOverviewView["regionStatus"], string> = {
  "locked-level": "border-white/10 bg-slate-800/60 text-slate-500",
  "locked-previous-region": "border-white/10 bg-slate-800/60 text-slate-500",
  available: "border-sky-400/30 bg-sky-950/30 text-sky-300",
  "in-progress": "border-indigo-400/30 bg-indigo-950/30 text-indigo-300",
  completed: "border-emerald-400/30 bg-emerald-950/30 text-emerald-300",
};

interface RegionSectionProps {
  region: RegionGymOverviewView;
  isExpanded: boolean;
  isPending: boolean;
  onToggle: () => void;
  onStartGymBattle: (gymNumber: 1 | 2 | 3, battleSlot: GymBattleSlotId) => void;
  onStartChampionBattle: () => void;
}

function RegionSection({ region, isExpanded, isPending, onToggle, onStartGymBattle, onStartChampionBattle }: RegionSectionProps) {
  const lockMessage =
    region.lockReason === "locked-level"
      ? regionGymLockMessageHe("locked-level", region.regionId)
      : region.lockReason === "locked-previous-region"
        ? regionGymLockMessageHe("locked-previous-region", region.regionId, region.previousRegionId)
        : null;

  return (
    <div className={`overflow-hidden rounded-xl border ${region.regionUnlocked ? "border-white/10 bg-slate-900/50" : "border-white/5 bg-slate-900/25"}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right"
      >
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${region.regionUnlocked ? "text-slate-100" : "text-slate-500"}`}>{region.englishName}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${REGION_STATUS_STYLE[region.regionStatus]}`}>
            {regionStatusLabelHe(region.regionStatus)}
          </span>
          {!region.regionUnlocked ? <span aria-hidden="true">🔒</span> : null}
        </div>
        <span aria-hidden="true" className="text-[10px] text-slate-500">
          {isExpanded ? "▲" : "▼"}
        </span>
      </button>

      {isExpanded ? (
        <div className="flex flex-col gap-3 border-t border-white/5 px-4 py-3">
          {lockMessage ? <p className="text-xs text-amber-300/80">{lockMessage}</p> : null}

          {region.gyms.map((gym) => (
            <GymRow
              key={gym.gymId}
              gym={gym}
              isPending={isPending}
              onStart={(battleSlot) => onStartGymBattle(gym.gymNumber, battleSlot)}
            />
          ))}

          <ChampionRow region={region} isPending={isPending} onStart={onStartChampionBattle} />
        </div>
      ) : null}
    </div>
  );
}

interface GymRowProps {
  gym: RegionGymView;
  isPending: boolean;
  onStart: (battleSlot: GymBattleSlotId) => void;
}

function GymRow({ gym, isPending, onStart }: GymRowProps) {
  return (
    <div className="rounded-lg border border-white/5 bg-slate-950/40 p-3">
      <div className="flex items-center gap-3">
        <SpriteImage
          src={gym.badgeImageUrl}
          alt={gym.typeSpecialization}
          className="h-10 w-10 object-contain"
          fallbackClassName="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
        />
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-100">
            מכון {gym.gymNumber} — {gym.typeSpecialization}
          </p>
          <p className="text-xs text-slate-400">
            סוג: {gymTypeLabelHe(gym.pokemonType)}
            {gym.badgeEarned ? <span className="text-amber-400"> · עיטור התקבל ✓</span> : null}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-col gap-1.5">
        {gym.battles.map((battle, index) => (
          <div key={battle.battleSlot} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-300">
              {GYM_BATTLE_SLOT_LABELS_HE[battle.battleSlot]} <span className="text-slate-500">· {gymBattleFormatLabelHe(battle.battleSlot)}</span>
            </span>
            {battle.completed ? (
              <span className="text-emerald-400">✓ הושלם</span>
            ) : battle.unlocked ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => onStart(battle.battleSlot)}
                className="rounded-md bg-indigo-600 px-3 py-1 font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
              >
                ▶ {gymBattleActionLabelHe(gym.hasActiveSession[index])}
              </button>
            ) : (
              <span className="text-slate-600">🔒 נעול</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ChampionRowProps {
  region: RegionGymOverviewView;
  isPending: boolean;
  onStart: () => void;
}

function ChampionRow({ region, isPending, onStart }: ChampionRowProps) {
  const champion = region.regionalChampion;

  return (
    <div className="rounded-lg border border-amber-400/20 bg-amber-950/10 p-3">
      <div className="flex items-center gap-3">
        <SpriteImage
          src={champion.medalImageUrl}
          alt="מדליית מחוז"
          className="h-10 w-10 object-contain"
          fallbackClassName="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
        />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-200">מנהל מחוז {region.englishName}</p>
          <p className="text-xs text-slate-400">6 נגד 6 · קושי גבוה מאוד</p>
          <p className="text-xs text-slate-500">
            פרס: {champion.rewardPreview.money.toLocaleString("he-IL")} כסף · {champion.rewardPreview.xpPercentOfNextLevel}% ניסיון
            {champion.rewardPreview.chestRewards.length > 0
              ? ` · ${champion.rewardPreview.chestRewards.map((chest) => `${getChestDefinition(chest.chestTypeId).displayName} x${chest.quantity}`).join(", ")}`
              : ""}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end text-xs">
        {champion.defeated ? (
          <span className="text-emerald-400">✓ הובס לצמיתות</span>
        ) : champion.unlocked ? (
          <button
            type="button"
            disabled={isPending}
            onClick={onStart}
            className="rounded-md bg-amber-600 px-3 py-1 font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
          >
            ▶ {gymBattleActionLabelHe(champion.hasActiveSession)}
          </button>
        ) : (
          <span className="text-slate-600">🔒 נדרשים 3 עיטורים</span>
        )}
      </div>
    </div>
  );
}
