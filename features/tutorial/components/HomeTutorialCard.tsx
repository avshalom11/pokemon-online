"use client";

import { ProgressBar } from "@/components/battle/ProgressBar";
import { PanelCard } from "@/features/home/components/PanelCard";
import { useTutorial } from "@/features/tutorial/context/tutorial-context";

// GAME TUTORIAL — PHASE 0. Home's own "המשך הכרת המשחק" card — reads
// TutorialProvider directly (mounted once at the (game) layout level, see
// app/(game)/layout.tsx) rather than threading tutorial data through
// HomeViewData/HomeContent's own props, same "seeded independently at
// layout level, not duplicated into Home's own aggregator" precedent
// DailyBattleCountProvider/PlayerProgressionProvider already establish for
// comparable account-wide state.
//
// Renders nothing while the panel/spotlight itself is showing (nothing to
// "resume" — the player is already inside it, in either the "explaining"
// or "awaiting" mode — see tutorial-context.tsx's own TutorialPanelMode),
// before the tutorial has ever started (Stage 1 auto-opens instead), and —
// TUTORIAL HOME CARD — COMPACT AFTER COMPLETION — once the real Tutorial
// is genuinely completed. This large/prominent card is only ever right for
// an in-progress Tutorial; the completed state gets its own small, lower-
// on-the-page entry instead (HomeTutorialReplayEntry.tsx, mounted
// separately in HomeContent.tsx) so it stops competing for top-of-Home
// attention once there's nothing left to resume.
export function HomeTutorialCard() {
  const { view, panelMode, isSubmitting, resume } = useTutorial();

  if (view.status !== "in_progress" || panelMode !== "closed") return null;

  return (
    <PanelCard title="הכרת המשחק">
      <p className="mb-1 text-sm font-semibold text-slate-200">{view.currentStage.panelCopy.title}</p>
      <p className="mb-3 text-xs text-slate-500">
        שלב {view.stageIndex + 1} מתוך {view.totalStages}
      </p>

      <ProgressBar percent={view.progressPercent} fillStyle={{ backgroundColor: "#818cf8" }} height="sm" />

      <button
        type="button"
        onClick={resume}
        disabled={isSubmitting}
        className="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        המשך הכרת המשחק
      </button>
    </PanelCard>
  );
}
