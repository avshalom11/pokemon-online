"use client";

import Image from "next/image";

import {
  getActiveTutorialTarget,
  getExplainingPanelDisplay,
  getReplayActiveTarget,
  getReplayExplainingPanelDisplay,
} from "@/features/tutorial/data/tutorial-stages.config";
import { useTutorial } from "@/features/tutorial/context/tutorial-context";

// GAME TUTORIAL — PHASE 0/1/5. The Tutorial's one panel component, reused
// verbatim for both a live playthrough and a replay (this task's own
// "reuse the SAME 16-stage registry/UI" requirement) — the only difference
// is WHICH view/target-resolution functions it reads from, chosen once,
// below, by TutorialProvider's own `mode`.
//
// Two mutually exclusive presentations, driven by TutorialProvider's own
// panelMode:
//
// "explaining" — the full instruction panel: title, body copy, and a CTA
// that either advances directly (explanation-only stages, and a multi-step
// stage's own wrap-up panel), minimizes into "awaiting" (a stage's own
// lead-in panel), "proceeds" (PHASE 3 — a step's own mid-flow explainAfter
// panel, e.g. the scripted Field Battle's "lower wild HP increases capture
// chance" beat), or "claims the reward" (PHASE 4 — the Completion stage's
// own "קבל את הפרס" CTA, never reachable during replay — see
// getReplayExplainingPanelDisplay's own doc comment) — see
// getExplainingPanelDisplay's own doc comment for exactly which. Whichever
// panelCopy is showing may carry its own optional guideImage (Professor
// Oak artwork at the Tutorial's 4 checkpoints — see tutorial-stages.
// config.ts's own doc comment for exactly which stage's panelCopy sets it);
// rendered full-width, uncropped, at its real 793:314 aspect ratio (every
// checkpoint image shares that ratio — see GUIDE PANEL POLISH below), above
// the title, still inside the dialog card's own normal document flow so it
// can never overlap the title/body/CTA beneath it. Omitted entirely for
// every panel with no guideImage of its own.
//
// GUIDE PANEL POLISH — a full, uncropped character image (no circular
// mask, no background fill) rather than the earlier small circular
// portrait: width/height={793}/{314} is the artwork's own real intrinsic
// size (baked in so Next never needs to guess it and reserves the right
// space up front, avoiding layout shift), paired with `h-auto w-full` so
// it always scales down to the card's own actual width — responsive by
// construction, same as every other fixed-aspect-ratio image in this
// codebase (see components/battle/BattleBackground.tsx's own doc comment
// for the general pattern, though that one uses `fill` since its own
// container's aspect ratio is fixed by CSS instead of by the image itself).
//
// "awaiting" — PHASE 1's new minimized banner: a short guidance string
// (never the full explanation again) plus, only for a stage/step whose
// signal has no real detectable event (kind: "manual" — the Friends
// stage's own real signal, or — during replay — ANY skipInReplay target's
// own coerced signal, see getReplayActiveTarget), its own confirm button.
// TutorialSpotlightOverlay (a separate, sibling component) is what
// actually highlights the real control — this component never renders the
// spotlight itself, only the banner.
//
// Mounted once at the (game) layout level (see app/(game)/layout.tsx),
// rendered conditionally on TutorialProvider's own panelMode — same
// "renders nothing when there's nothing to show" convention every other
// gate/dialog in this codebase already follows (PendingEvolutionGate,
// PendingMoveLearningGate).
//
// Deliberately no backdrop-click-to-dismiss and no ✕ close button on a LIVE
// panel — the player can only ever leave it via its own buttons (postpone,
// where the current stage allows it, or the real CTA), same "explicit
// choice only" rule EvolutionPromptDialog/MoveLearningDecisionDialog
// already establish for their own dialogs.
//
// TUTORIAL REPLAY — CLOSE BUTTON. Replay is the one exception: an always-
// visible ✕ (independent of the current stage's own canPostpone — Stage 1
// itself, canPostpone: false, is fully replayable and must be just as
// exitable as every other replayed stage) shown in BOTH panelMode states.
// Clicking it calls the exact same `postpone` context method the "אעשה זאת
// מאוחר יותר" button already calls — its own replay branch (tutorial-
// context.tsx) purely resets the LOCAL replay state back to Stage 1 and
// closes the panel, never touching the server, so it can never save replay
// progress or affect the real, already-completed status/reward. No new
// context method — this is the SAME exit path replay already had, just
// exposed as a second, always-available trigger.
export function TutorialPanel() {
  const {
    view,
    mode,
    replayView,
    panelMode,
    isSubmitting,
    advance,
    beginAwaiting,
    proceed,
    claimReward,
    postpone,
    confirmManualTarget,
  } = useTutorial();

  if (panelMode === "closed") return null;
  // PHASE 5 — REPLAY. view.status is ALREADY "completed" for the entire
  // duration of a replay (that's the precondition replay is even offered
  // under — see HomeTutorialCard) — this guard must only ever apply to a
  // LIVE playthrough, never hide the panel while mode is "replay".
  if (mode === "live" && view.status === "completed") return null;

  // PHASE 5 — REPLAY. The one place this component picks which
  // view/target-resolution to read from — everything below is otherwise
  // completely unaware of which mode it's in.
  const activeView = mode === "replay" ? replayView! : view;
  const getActiveTarget = mode === "replay" ? getReplayActiveTarget : getActiveTutorialTarget;
  const getPanelDisplay = mode === "replay" ? getReplayExplainingPanelDisplay : getExplainingPanelDisplay;

  if (panelMode === "awaiting") {
    const active = getActiveTarget(activeView);
    if (!active) return null; // defensive — should never happen while awaiting

    return (
      <div dir="rtl" className="pointer-events-none fixed inset-x-0 bottom-4 z-[87] flex flex-col items-center gap-2 px-4">
        {mode === "replay" ? (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-400/40 bg-slate-900/95 px-3 py-1 shadow-lg">
            <span className="text-[11px] font-semibold text-amber-300">הפעלה חוזרת — ללא פרס</span>
            <button
              type="button"
              onClick={postpone}
              aria-label="יציאה מהפעלה חוזרת"
              className="text-amber-300/70 transition-colors hover:text-white"
            >
              ✕
            </button>
          </div>
        ) : null}
        <div className="pointer-events-auto flex max-w-lg flex-wrap items-center justify-center gap-3 rounded-full border border-indigo-400/40 bg-slate-900/95 px-4 py-2 text-center shadow-2xl backdrop-blur-sm">
          <span className="text-sm text-slate-200">{active.target.guidance}</span>

          {active.signal.kind === "manual" ? (
            <button
              type="button"
              onClick={confirmManualTarget}
              disabled={isSubmitting}
              className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              המשך
            </button>
          ) : null}

          {activeView.currentStage.canPostpone ? (
            <button
              type="button"
              onClick={postpone}
              disabled={isSubmitting}
              className="text-xs text-slate-400 underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              אעשה זאת מאוחר יותר
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const { copy, ctaKind } = getPanelDisplay(activeView);
  const handleCta =
    ctaKind === "advance"
      ? advance
      : ctaKind === "proceed"
        ? proceed
        : ctaKind === "claim-reward"
          ? claimReward
          : beginAwaiting;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-indigo-400/30 bg-slate-900 p-6 text-center shadow-2xl">
        {mode === "replay" ? (
          <button
            type="button"
            onClick={postpone}
            aria-label="יציאה מהפעלה חוזרת"
            className="absolute top-3 left-3 text-lg leading-none text-slate-500 transition-colors hover:text-white"
          >
            ✕
          </button>
        ) : null}

        {mode === "replay" ? (
          <p className="mb-2 text-[11px] font-semibold text-amber-300">הפעלה חוזרת — ללא פרס</p>
        ) : null}

        {copy.guideImage ? (
          <Image
            src={copy.guideImage}
            alt=""
            width={793}
            height={314}
            className="mx-auto mb-1 h-auto w-full max-w-sm drop-shadow-xl"
            priority
          />
        ) : null}

        <p className="text-xs font-semibold tracking-wide text-indigo-300 uppercase">
          שלב {activeView.stageIndex + 1} מתוך {activeView.totalStages}
        </p>

        <h2 className="mt-2 text-lg font-bold text-slate-100">{copy.title}</h2>
        <p className="mt-4 text-sm whitespace-pre-line text-slate-300">{copy.body}</p>

        <div className="mt-6 flex justify-center gap-3">
          {activeView.currentStage.canPostpone ? (
            <button
              type="button"
              onClick={postpone}
              disabled={isSubmitting}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              אעשה זאת מאוחר יותר
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleCta}
            disabled={isSubmitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copy.ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
