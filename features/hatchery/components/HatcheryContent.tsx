"use client";

import { useState, useTransition } from "react";

import { BackButton } from "@/components/layout/BackButton";
import { hatchIncubationAction } from "@/features/hatchery/actions/hatch-incubation.action";
import { startIncubationAction } from "@/features/hatchery/actions/start-incubation.action";
import { HatchResultDialog } from "@/features/hatchery/components/HatchResultDialog";
import { HatcheryEggCard } from "@/features/hatchery/components/HatcheryEggCard";
import { HatcheryIncubatorPanel } from "@/features/hatchery/components/HatcheryIncubatorPanel";
import { IncubatorPickerDialog } from "@/features/hatchery/components/IncubatorPickerDialog";
import type { HatcheryViewData } from "@/features/hatchery/services/hatchery-view.service";
import type { HatchOutcome } from "@/features/eggs/services/hatch.service";

interface HatcheryContentProps {
  initialData: HatcheryViewData;
}

const START_ERROR_MESSAGES: Record<string, string> = {
  "egg-not-found": "לא נמצאה ביצה כזו. נסה לרענן את העמוד.",
  "incubator-not-found": "לא נמצא אינקובטור. נסה לרענן את העמוד.",
  "egg-already-incubating": "הביצה כבר נמצאת בדגירה.",
  "incubator-occupied": "האינקובטור כבר תפוס בביצה אחרת.",
  error: "אירעה שגיאה, נסה שוב.",
};

const HATCH_ERROR_MESSAGES: Record<string, string> = {
  "not-found": "לא נמצאה דגירה פעילה כזו. נסה לרענן את העמוד.",
  "not-ready": "הביצה עדיין לא מוכנה לבקיעה.",
  "empty-pool": "לא נמצא פוקימון מתאים עבור ביצה זו כרגע. נסה שוב מאוחר יותר.",
  error: "אירעה שגיאה, נסה שוב.",
};

// Page composition root for /hatchery — same shell convention (gradient
// background, radial overlay, BackButton, centered max-width column)
// ShopContent/PokemonCenterContent already establish. Owns only UI-state
// (which action is pending, the latest error message, the hatch-result
// dialog, and — INCUBATOR EXPANSION — which egg is currently awaiting an
// incubator choice); every real mutation is server-side through the
// existing eggs/incubator services via the two Hatchery actions. Local
// `data` state is updated directly from each action's own returned result
// (never router.refresh()) — the same convention every other *Content.tsx
// in this project already follows; revalidatePath (inside the actions)
// keeps the next full navigation fresh independently.
export function HatcheryContent({ initialData }: HatcheryContentProps) {
  const [data, setData] = useState(initialData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hatchResult, setHatchResult] = useState<HatchOutcome | null>(null);
  // INCUBATOR EXPANSION — the egg awaiting an explicit incubator choice
  // (opened by HatcheryEggCard's own button, resolved by
  // IncubatorPickerDialog). null means no picker is open.
  const [pickerEggId, setPickerEggId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const emptyIncubators = data.incubators.filter((incubator) => !incubator.activeIncubation);
  const hasEmptyIncubator = emptyIncubators.length > 0;

  function handleOpenPicker(ownedEggId: string) {
    setErrorMessage(null);
    setPickerEggId(ownedEggId);
  }

  function handleCancelPicker() {
    setPickerEggId(null);
  }

  function handleSelectIncubator(incubatorId: string) {
    const ownedEggId = pickerEggId;
    if (!ownedEggId) return;

    setErrorMessage(null);

    startTransition(async () => {
      const result = await startIncubationAction(ownedEggId, incubatorId);

      if (result.status === "started") {
        const egg = data.availableEggs.find((candidate) => candidate.id === ownedEggId);
        if (!egg) return;

        setData((current) => ({
          ...current,
          availableEggs: current.availableEggs.filter((candidate) => candidate.id !== ownedEggId),
          incubators: current.incubators.map((incubator) =>
            incubator.id === incubatorId
              ? {
                  ...incubator,
                  activeIncubation: {
                    incubationId: result.incubation.ownedEggId,
                    battleProgress: result.incubation.battleProgress,
                    requiredBattleTarget: result.incubation.requiredBattleTarget,
                    isReady: result.incubation.battleProgress >= result.incubation.requiredBattleTarget,
                    egg,
                  },
                }
              : incubator
          ),
        }));
        setPickerEggId(null);
        return;
      }

      setErrorMessage(START_ERROR_MESSAGES[result.status] ?? START_ERROR_MESSAGES.error);
      setPickerEggId(null);
    });
  }

  function handleHatch(incubationId: string) {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await hatchIncubationAction(incubationId);

      if (result.status === "hatched") {
        // The incubator is free (or gone) again immediately — the server
        // already consumed the egg/incubation, and the incubator itself if
        // it was single-use, in the same transaction that created the
        // Pokémon (hatchIncubation's own incubatorConsumed flag).
        setData((current) => ({
          ...current,
          incubators: result.incubatorConsumed
            ? current.incubators.filter((incubator) => incubator.id !== result.incubatorId)
            : current.incubators.map((incubator) =>
                incubator.id === result.incubatorId ? { ...incubator, activeIncubation: null } : incubator
              ),
        }));
        setHatchResult(result.result);
        return;
      }

      setErrorMessage(HATCH_ERROR_MESSAGES[result.status] ?? HATCH_ERROR_MESSAGES.error);
    });
  }

  return (
    <div
      dir="rtl"
      className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(129,90,238,0.16), transparent 60%), radial-gradient(ellipse 50% 30% at 90% 100%, rgba(99,102,241,0.12), transparent 60%)",
        }}
      />

      <div className="relative mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <BackButton />

        <h1 className="text-lg font-bold text-slate-100">מדגרה</h1>

        <HatcheryIncubatorPanel incubators={data.incubators} isPending={isPending} onHatch={handleHatch} />

        {errorMessage ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400">
            {errorMessage}
          </p>
        ) : null}

        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">ביצים זמינות</h2>

          {data.availableEggs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
              {hasEmptyIncubator
                ? "עדיין אין לך ביצים. נצח בקרבות שדה כדי לקבל ביצים."
                : "כל האינקובטורים שלך תפוסים כרגע."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {data.availableEggs.map((egg) => (
                <HatcheryEggCard
                  key={egg.id}
                  egg={egg}
                  disabled={isPending || !hasEmptyIncubator}
                  onPlaceInIncubator={handleOpenPicker}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {pickerEggId ? (
        <IncubatorPickerDialog
          emptyIncubators={emptyIncubators}
          onSelect={handleSelectIncubator}
          onCancel={handleCancelPicker}
          disabled={isPending}
        />
      ) : null}

      {hatchResult ? <HatchResultDialog result={hatchResult} onClose={() => setHatchResult(null)} /> : null}
    </div>
  );
}
