"use client";

import { useState, useTransition } from "react";

import { BackButton } from "@/components/layout/BackButton";
import { hatchIncubationAction } from "@/features/hatchery/actions/hatch-incubation.action";
import { startIncubationAction } from "@/features/hatchery/actions/start-incubation.action";
import { HatchResultDialog } from "@/features/hatchery/components/HatchResultDialog";
import { HatcheryEggCard } from "@/features/hatchery/components/HatcheryEggCard";
import { HatcheryIncubatorPanel } from "@/features/hatchery/components/HatcheryIncubatorPanel";
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
// (which action is pending, the latest error message, and the hatch-result
// dialog); every real mutation is server-side through the existing EGGS
// PHASE 1-4 services via the two Hatchery actions. Local `data` state is
// updated directly from each action's own returned result (never
// router.refresh()) — the same convention every other *Content.tsx in this
// project already follows; revalidatePath (inside the actions) keeps the
// next full navigation fresh independently.
export function HatcheryContent({ initialData }: HatcheryContentProps) {
  const [data, setData] = useState(initialData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hatchResult, setHatchResult] = useState<HatchOutcome | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePlaceInIncubator(ownedEggId: string) {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await startIncubationAction(ownedEggId);

      if (result.status === "started") {
        const egg = data.availableEggs.find((candidate) => candidate.id === ownedEggId);
        if (!egg) return;

        setData((current) => ({
          ...current,
          availableEggs: current.availableEggs.filter((candidate) => candidate.id !== ownedEggId),
          activeIncubation: {
            incubationId: result.incubation.ownedEggId,
            battleProgress: result.incubation.battleProgress,
            requiredBattleTarget: result.incubation.requiredBattleTarget,
            isReady: result.incubation.battleProgress >= result.incubation.requiredBattleTarget,
            egg,
          },
        }));
        return;
      }

      setErrorMessage(START_ERROR_MESSAGES[result.status] ?? START_ERROR_MESSAGES.error);
    });
  }

  function handleHatch(incubationId: string) {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await hatchIncubationAction(incubationId);

      if (result.status === "hatched") {
        // The incubator is empty again immediately — the server already
        // consumed the egg/incubation in the same transaction that created
        // the Pokémon (EGGS PHASE 4's own hatchIncubation).
        setData((current) => ({ ...current, activeIncubation: null }));
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

        <HatcheryIncubatorPanel
          incubatorDisplayName={data.incubatorDisplayName}
          activeIncubation={data.activeIncubation}
          isPending={isPending}
          onHatch={handleHatch}
        />

        {errorMessage ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400">
            {errorMessage}
          </p>
        ) : null}

        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">ביצים זמינות</h2>

          {data.availableEggs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
              {data.activeIncubation
                ? "כל הביצים שלך נמצאות כרגע בדגירה."
                : "עדיין אין לך ביצים. נצח בקרבות שדה כדי לקבל ביצים."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {data.availableEggs.map((egg) => (
                <HatcheryEggCard
                  key={egg.id}
                  egg={egg}
                  disabled={isPending || Boolean(data.activeIncubation)}
                  onPlaceInIncubator={handlePlaceInIncubator}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {hatchResult ? <HatchResultDialog result={hatchResult} onClose={() => setHatchResult(null)} /> : null}
    </div>
  );
}
