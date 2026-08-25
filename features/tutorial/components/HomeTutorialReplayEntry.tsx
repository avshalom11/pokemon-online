"use client";

import { useTutorial } from "@/features/tutorial/context/tutorial-context";

// TUTORIAL HOME CARD — COMPACT AFTER COMPLETION. Once the real Tutorial is
// genuinely completed, HomeTutorialCard's own large, prominent card no
// longer shows at the top of Home at all (see that component's own doc
// comment) — this is its replacement: a small, subtle, easy-to-find entry
// meant to sit LOWER on the page (see HomeContent.tsx's own placement,
// after the Achievements/News/Statistics row) rather than competing for
// attention at the top the way an in-progress Tutorial rightly does.
//
// Presentation only — reads the exact same TutorialProvider context
// HomeTutorialCard already reads (mode/view/startReplay), never a second
// copy of Tutorial state, and calls the exact same startReplay() the
// original completed-state button already called. No progress/reward/
// replay logic lives here at all.
export function HomeTutorialReplayEntry() {
  const { view, mode, startReplay } = useTutorial();

  if (view.status !== "completed" || mode !== "live") return null;

  return (
    <button
      type="button"
      onClick={startReplay}
      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-900/40 px-4 py-2.5 text-right transition-colors hover:border-indigo-400/30 hover:bg-slate-900/60"
    >
      <span className="text-xs font-medium text-slate-400">
        <span className="text-emerald-400/90">הכרת המשחק ✓</span>
        <span className="mx-2 text-slate-600">·</span>
        <span>הפעלה חוזרת — ללא פרס</span>
      </span>
      <span aria-hidden="true" className="text-slate-600">
        ‹
      </span>
    </button>
  );
}
