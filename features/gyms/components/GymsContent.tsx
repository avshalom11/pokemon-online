"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BackButton } from "@/components/layout/BackButton";
import { SpriteImage } from "@/components/media/SpriteImage";
import { getChestDefinition } from "@/features/chests/data/chest-definitions";
import { getGymBattlePartySelectionAction, startGymBattleAction } from "@/features/gyms/actions/gym-battle.actions";
import {
  GYM_BATTLE_SLOT_LABELS_HE,
  REGION_DISPLAY_NAMES_HE,
  gymBattleActionLabelHe,
  gymBattleFormatLabelHe,
  gymStartResultMessageHe,
  gymTypeLabelHe,
  regionGymLockMessageHe,
  regionStatusLabelHe,
} from "@/features/gyms/data/gym-labels";
import { getGymCharacterImageUrl, getRegionalChampionCharacterImageUrl } from "@/features/gyms/data/gym-trainer-images";
import { getGymTrainerName, getRegionalChampionTrainerName } from "@/features/gyms/data/gym-trainer-names";
import type { RegionGymOverviewView, RegionGymView } from "@/features/gyms/services/gym-overview-view.service";
import type { GymPartySelectionOption, StartNpcBattleTarget } from "@/features/gyms/services/gym-battle-session.service";
import type { GymBattleSlotId } from "@/features/gyms/types/gym.types";
import { GymChampionIntroDialog } from "./GymChampionIntroDialog";
import { GymIntroDialog } from "./GymIntroDialog";
import { GymPartySelectionModal } from "./GymPartySelectionModal";

interface GymsContentProps {
  region: RegionGymOverviewView;
}

interface SelectionState {
  readonly target: StartNpcBattleTarget;
  readonly requiredCount: number;
  readonly options: readonly GymPartySelectionOption[];
  readonly errorMessage: string | null;
}

// GYM INTRO DIALOG — EASY TRAINER ONLY (later task, section 6) — only ever
// set for an Easy-Trainer click (see handleGymStart below); Medium/Leader/
// Champion always call openSelection directly and never touch this state.
interface EasyIntroTarget {
  readonly regionId: RegionGymOverviewView["regionId"];
  readonly gymNumber: 1 | 2 | 3;
}

// REGIONAL CHAMPION INTRO (later task) — scoped to Regional Champion ONLY,
// the same "one route, gated by which state gets set" pattern
// EasyIntroTarget above already establishes for the Easy Trainer. Just the
// regionId: the champion target itself is fully derived from it
// ({ source: "regional-champion", regionId }), same as ChampionRow's own
// onStart already builds today.
type ChampionIntroRegionId = RegionGymOverviewView["regionId"];

// GYMS & LEAGUES PHASE 4/9, REGION-SCOPED UI, PARTY SELECTION (later tasks)
// — the /gyms page body: the player's own CURRENT region's Gym content only
// — 3 Gyms + a Regional Champion, never the other 8 regions. "Start" now
// opens the pre-battle party-selection modal FIRST (section 6/7) rather
// than immediately creating a session — the actual session is only ever
// created once the player explicitly confirms a valid selection
// (startGymBattleAction, Phase 3's own startNpcBattle, unmodified beyond
// requiring that selection). No NPC battle logic is duplicated here.
export function GymsContent({ region }: GymsContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [easyIntroTarget, setEasyIntroTarget] = useState<EasyIntroTarget | null>(null);
  const [championIntroRegionId, setChampionIntroRegionId] = useState<ChampionIntroRegionId | null>(null);

  // GYM INTRO DIALOG — EASY TRAINER ONLY (later task, section 5/6/8) — the
  // ONE routing point that decides whether a battle-slot click needs the
  // intro gate first. Medium/Leader/Champion (see their own onStart props
  // below) call openSelection directly, unchanged from before this task —
  // this function is never reached for them, so the intro dialog can only
  // ever be reached via an Easy-Trainer click. Nothing here creates a
  // session; that still only ever happens inside confirmSelection, exactly
  // as before — this just adds one more explicit confirmation IN FRONT of
  // the existing flow for Easy specifically.
  function handleGymStart(regionId: RegionGymOverviewView["regionId"], gymNumber: 1 | 2 | 3, battleSlot: GymBattleSlotId) {
    if (battleSlot === "easy") {
      setEasyIntroTarget({ regionId, gymNumber });
      return;
    }
    openSelection({ source: "gym", regionId, gymNumber, battleSlot });
  }

  function confirmEasyIntro() {
    if (!easyIntroTarget) return;
    const target: StartNpcBattleTarget = { source: "gym", regionId: easyIntroTarget.regionId, gymNumber: easyIntroTarget.gymNumber, battleSlot: "easy" };
    setEasyIntroTarget(null);
    openSelection(target);
  }

  // REGIONAL CHAMPION INTRO (later task) — the Champion row's onStart now
  // opens this blocking intro FIRST, mirroring confirmEasyIntro above: no
  // battle session (nor even the read-only party-selection call) happens
  // until the player explicitly clicks the intro's own אישור. Canceling
  // just clears the state — openSelection is never called, so nothing is
  // created, exactly like closing the Easy intro today.
  function confirmChampionIntro() {
    if (!championIntroRegionId) return;
    const target: StartNpcBattleTarget = { source: "regional-champion", regionId: championIntroRegionId };
    setChampionIntroRegionId(null);
    openSelection(target);
  }

  function openSelection(target: StartNpcBattleTarget) {
    if (isPending) return;
    setErrorMessage(null);

    startTransition(async () => {
      const result = await getGymBattlePartySelectionAction(target);

      if (result.status !== "ok") {
        setErrorMessage(gymStartResultMessageHe(result.status));
        return;
      }

      // An in-progress attempt for this EXACT target already exists —
      // selection was already locked in when it started; resume it
      // directly, never re-ask (section 6's own "once battle starts,
      // selection is fixed for that attempt").
      if (result.resuming) {
        router.push("/gyms/battle");
        return;
      }

      setSelection({ target, requiredCount: result.requiredCount, options: result.options, errorMessage: null });
    });
  }

  function confirmSelection(selectedIds: readonly string[]) {
    if (!selection || isPending) return;

    startTransition(async () => {
      const result = await startGymBattleAction(selection.target, selectedIds);
      if (result.status === "started" || result.status === "resumed") {
        router.push("/gyms/battle");
        return;
      }
      setSelection({ ...selection, errorMessage: gymStartResultMessageHe(result.status) });
    });
  }

  const lockMessage =
    region.lockReason === "locked-level"
      ? regionGymLockMessageHe("locked-level", region.regionId)
      : region.lockReason === "locked-previous-region"
        ? regionGymLockMessageHe("locked-previous-region", region.regionId, region.previousRegionId)
        : null;

  return (
    <div dir="rtl" className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950">
      <div className="relative mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <BackButton />

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-100">מכוני {REGION_DISPLAY_NAMES_HE[region.regionId]}</h1>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${REGION_STATUS_STYLE[region.regionStatus]}`}>
              {regionStatusLabelHe(region.regionStatus)}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">שלושה מכונים ומנהל מחוז — {region.englishName}</p>
        </div>

        {errorMessage ? (
          <div role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        {lockMessage ? <p className="text-xs text-amber-300/80">{lockMessage}</p> : null}

        <div className="flex flex-col gap-3">
          {region.gyms.map((gym) => (
            <GymRow
              key={gym.gymId}
              regionId={region.regionId}
              gym={gym}
              isPending={isPending}
              onStart={(battleSlot) => handleGymStart(region.regionId, gym.gymNumber, battleSlot)}
            />
          ))}

          <ChampionRow region={region} isPending={isPending} onStart={() => setChampionIntroRegionId(region.regionId)} />
        </div>
      </div>

      {easyIntroTarget ? (
        <GymIntroDialog
          trainerName={getGymTrainerName(easyIntroTarget.regionId, easyIntroTarget.gymNumber, "leader")}
          characterImageUrl={getGymCharacterImageUrl(easyIntroTarget.regionId, easyIntroTarget.gymNumber)}
          isPending={isPending}
          onConfirm={confirmEasyIntro}
          onCancel={() => setEasyIntroTarget(null)}
        />
      ) : null}

      {championIntroRegionId ? (
        <GymChampionIntroDialog
          championName={getRegionalChampionTrainerName(championIntroRegionId)}
          characterImageUrl={getRegionalChampionCharacterImageUrl(championIntroRegionId)}
          isPending={isPending}
          onConfirm={confirmChampionIntro}
          onCancel={() => setChampionIntroRegionId(null)}
        />
      ) : null}

      {selection ? (
        <GymPartySelectionModal
          options={selection.options}
          requiredCount={selection.requiredCount}
          isPending={isPending}
          errorMessage={selection.errorMessage}
          onConfirm={confirmSelection}
          onCancel={() => setSelection(null)}
        />
      ) : null}
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

interface GymRowProps {
  regionId: RegionGymOverviewView["regionId"];
  gym: RegionGymView;
  isPending: boolean;
  onStart: (battleSlot: GymBattleSlotId) => void;
}

function GymRow({ regionId, gym, isPending, onStart }: GymRowProps) {
  // SIMPLE CHARACTER IMAGE ARCHITECTURE — one representative character
  // image for the whole Gym card, shared by Easy/Medium/Leader alike (never
  // a different image per battle slot); derived, never hardcoded — see
  // gym-trainer-images.ts.
  const characterImageUrl = getGymCharacterImageUrl(regionId, gym.gymNumber);

  return (
    <div className="rounded-lg border border-white/5 bg-slate-950/40 p-3">
      <div className="flex items-center gap-3">
        <SpriteImage
          src={characterImageUrl}
          alt={gym.typeSpecialization}
          className="h-14 w-14 rounded-lg object-contain"
          fallbackClassName="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
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
  const characterImageUrl = getRegionalChampionCharacterImageUrl(region.regionId);

  return (
    <div className="rounded-lg border border-amber-400/20 bg-amber-950/10 p-3">
      <div className="flex items-center gap-3">
        <SpriteImage
          src={characterImageUrl}
          alt="מנהל מחוז"
          className="h-14 w-14 rounded-lg object-contain"
          fallbackClassName="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
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
