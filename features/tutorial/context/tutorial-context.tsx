"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import {
  advanceTutorialStageAction,
  advanceTutorialSubStepAction,
  claimTutorialRewardAction,
  postponeTutorialAction,
  resumeTutorialAction,
} from "@/features/tutorial/actions/tutorial-progress.actions";
import {
  buildReplayProgressView,
  getActiveTutorialTarget,
  getNextReplayStageIndex,
  getReplayActiveTarget,
  REPLAY_FIRST_STAGE_INDEX,
} from "@/features/tutorial/data/tutorial-stages.config";
import type { ReplayProgressView, TutorialActionId, TutorialProgressView } from "@/features/tutorial/types/tutorial.types";

// NAVIGATION ORDER — the panelMode a NEWLY-current stage should open in,
// given the real, server-backed view: "closed" once the whole Tutorial is
// done; "awaiting" (spotlight the first step's target immediately, no big
// panel yet) for a stage flagged explainAfterEntry — see that flag's own
// doc comment, tutorial.types.ts; "explaining" (the normal lead-in) for
// every other stage, unchanged from every earlier phase. Only meaningful
// when `view.currentSubStep` is null (a genuinely fresh stage) — every
// other case always resolves to "explaining" and lets
// getExplainingPanelDisplay re-derive the correct panel from the persisted
// sub-step itself (its own explainAfterEntry branch included), exactly as
// it already does for resume().
function panelModeForCurrentProgress(view: TutorialProgressView): TutorialPanelMode {
  if (view.status === "completed") return "closed";
  if (view.currentSubStep === null && view.currentStage.explainAfterEntry) return "awaiting";
  return "explaining";
}

// NAVIGATION ORDER — the replay-only counterpart to
// panelModeForCurrentProgress above, over a plain stage index (replay has
// no persisted view to read `status`/`currentSubStep` from — a freshly
// advanced replay stage always starts at subStep null, same as a live
// stage transition does).
function panelModeForReplayStage(stageIndex: number): "awaiting" | "explaining" {
  return buildReplayProgressView(stageIndex, null).currentStage.explainAfterEntry ? "awaiting" : "explaining";
}

// PHASE 1 — NAVIGATION + SPOTLIGHT. Three states, not two — see this
// task's own "close/minimize the panel and highlight the real control"
// requirement:
//  - "closed": nothing shown (postponed, or the tutorial isn't currently
//    active for this player).
//  - "explaining": the full instruction panel (Phase 0's only state).
//  - "awaiting": the panel is minimized to a small banner, and
//    TutorialSpotlightOverlay highlights the real control the player must
//    use themselves — this component never navigates or clicks it for
//    them, only detects that they did (see completeActiveTarget below).
export type TutorialPanelMode = "closed" | "explaining" | "awaiting";

// PHASE 5 — REPLAY. "live" is every phase before this one's only mode — the
// panel drives the REAL, server-backed `view`/persistence. "replay" is
// entirely client-side (see ReplayProgressView's own doc comment,
// tutorial.types.ts): `view` itself is never read or written while
// replaying, only `replayView`.
export type TutorialMode = "live" | "replay";

interface TutorialContextValue {
  view: TutorialProgressView;
  mode: TutorialMode;
  // Non-null exactly while mode is "replay" — the one thing every replay-
  // aware component (TutorialPanel, TutorialSpotlightOverlay) renders from
  // instead of `view` whenever mode is "replay".
  replayView: ReplayProgressView | null;
  panelMode: TutorialPanelMode;
  isSubmitting: boolean;
  // TutorialPanel's own CTA on an "explanation-only" stage, or on a
  // multi-step stage's own wrap-up panel — advances straight to the next
  // stage (or marks the tutorial completed, from the last stage). Mode-
  // aware: during replay this only ever moves the local replay index
  // forward (or ends the replay walkthrough entirely, from its own last
  // stage) — never the real Server Action.
  advance: () => void;
  // TutorialPanel's own CTA on a "single"/"multi-step" stage's lead-in
  // panel — minimizes into the awaiting banner; the real completion is
  // ALWAYS detected separately (navigation, a reported action, or a
  // manual confirm), never fired by this call itself. Identical in both
  // modes (purely local UI state either way).
  beginAwaiting: () => void;
  // PHASE 3 — TutorialPanel's own CTA on a mid-flow explainAfter panel —
  // computed at click time (see this file's own proceed() doc comment):
  // resumes "awaiting" for whatever's next, or falls through to the
  // stage's own wrap-up/advance if nothing is. Mode-aware, same reasoning
  // as advance() above.
  proceed: () => void;
  // PHASE 4 — COMPLETION REWARD. TutorialPanel's own CTA on the Completion
  // stage ("קבל את הפרס") — claims the real, exactly-once reward and marks
  // the Tutorial completed (see claimTutorialRewardAction's own doc
  // comment). Never callable from any other stage's CTA, and never
  // reachable at all during replay (getReplayExplainingPanelDisplay
  // coerces the Completion stage's own CTA to "advance" instead — see
  // that function's own doc comment, tutorial-stages.config.ts).
  claimReward: () => void;
  // "אעשה זאת מאוחר יותר" — closes everything (panel and spotlight alike).
  // During replay, this only ever abandons the LOCAL replay walkthrough
  // (never touches the real, already-completed progress); during a live
  // playthrough, progress is already fully persisted the moment it was
  // last reached (see postponeTutorialAction's own doc comment), so
  // nothing here can ever lose a player's place either way.
  postpone: () => void;
  // HomeTutorialCard's "המשך הכרת המשחק" button (live, in-progress
  // Tutorials only) — re-confirms the authoritative server state, then
  // reopens the full panel exactly where the player's persisted progress
  // is (never straight into "awaiting" — see this file's own doc comment
  // on why that sub-state is never persisted).
  resume: () => void;
  // PHASE 5 — REPLAY. HomeTutorialCard's own "הפעלה חוזרת" button (shown
  // only once the real Tutorial is genuinely "completed" — see that
  // component's own doc comment) — starts a fresh, purely client-side
  // replay walkthrough from Stage 1, without touching `view`/the server at
  // all.
  startReplay: () => void;
  // Called from a small integration point at the real source of a non-
  // navigation action (GameSidebar's own open toggle, MyPokemonContent's
  // own party-slot-select handler) — a no-op unless the tutorial is
  // currently awaiting EXACTLY this actionId. Mode-aware: during replay,
  // a skipInReplay target's own signal was already coerced to "manual" by
  // getReplayActiveTarget, so this can only ever match a genuinely
  // harmless (never-skipped) action target while replaying.
  reportAction: (actionId: TutorialActionId) => void;
  // The minimized banner's own confirm button for a "manual" signal (the
  // Friends stage's own real signal, or — during replay — ANY skipInReplay
  // target's own coerced signal). Mode-aware, same reasoning as
  // reportAction above.
  confirmManualTarget: () => void;
  // PHASE 1 — SPOTLIGHT TARGET REGISTRY. A real DOM node registers itself
  // under a stable targetId (via useTutorialTarget, or directly for a
  // dynamic list like Map's own zone polygons) purely so
  // TutorialSpotlightOverlay can find and measure it — never anything
  // completion is derived from (see TutorialTarget's own doc comment,
  // tutorial.types.ts). registryVersion bumps on every register/unregister
  // so the overlay's own effect re-runs and re-measures. Entirely mode-
  // agnostic — the same registry serves both a live playthrough and a
  // replay (this task's own "keep normal navigation/spotlight behavior"
  // requirement, satisfied for free by never duplicating this mechanism).
  registerTarget: (targetId: string, element: Element) => void;
  unregisterTarget: (targetId: string) => void;
  getTargetElement: (targetId: string) => Element | null;
  registryVersion: number;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

interface TutorialProviderProps {
  // Server-fetched once, on every (game) layout render (see
  // tutorial-progress.service.ts's getTutorialProgressView) — the single
  // seed every LIVE Tutorial surface (the panel, the spotlight, Home's
  // card) renders from. Never mutated by replay — see `mode`'s own doc
  // comment above.
  initial: TutorialProgressView;
  children: ReactNode;
}

// GAME TUTORIAL — PHASE 0/1/5. Mounted once at the (game) layout level
// (same "provider mounted once, survives every client-side navigation
// because the layout itself never remounts" pattern ActiveBattleProvider/
// PlayerProgressionProvider already establish there), so the panel's own
// mode, the spotlight target registry, and the player's live progress all
// survive Home -> Map -> My Pokémon navigation without ever being refetched
// or losing a registered target mid-session.
export function TutorialProvider({ initial, children }: TutorialProviderProps) {
  const [view, setView] = useState(initial);
  // STAGE 1 AUTO-OPEN — seeded once, from the server's own initial read,
  // exactly when there was never any progress to begin with ("not_started"
  // only ever describes a row that was JUST lazily created — see
  // getOrCreateTutorialProgress's own doc comment). Every later open/close
  // is purely user-driven — this initializer never re-fires automatically
  // again for this account.
  const [panelMode, setPanelMode] = useState<TutorialPanelMode>(initial.status === "not_started" ? "explaining" : "closed");
  const [isSubmitting, startTransition] = useTransition();
  const pathname = usePathname();

  // PHASE 5 — REPLAY. Purely local state — never read from or written to
  // PlayerTutorialProgress. `mode` starts "live" and only ever becomes
  // "replay" via startReplay() below (HomeTutorialCard's own button,
  // gated on the real view.status already being "completed").
  const [mode, setMode] = useState<TutorialMode>("live");
  const [replayStageIndex, setReplayStageIndex] = useState(REPLAY_FIRST_STAGE_INDEX);
  const [replaySubStep, setReplaySubStep] = useState<string | null>(null);
  const replayView = mode === "replay" ? buildReplayProgressView(replayStageIndex, replaySubStep) : null;

  // PHASE 1 — SPOTLIGHT TARGET REGISTRY. A plain mutable map (not React
  // state) — registering/unregistering a target must never re-render this
  // provider's whole subtree; only the spotlight overlay itself needs to
  // react, via the registryVersion counter below.
  const targetElementsRef = useRef<Map<string, Element>>(new Map());
  const [registryVersion, setRegistryVersion] = useState(0);

  const registerTarget = useCallback((targetId: string, element: Element) => {
    targetElementsRef.current.set(targetId, element);
    setRegistryVersion((current) => current + 1);
  }, []);

  const unregisterTarget = useCallback((targetId: string) => {
    if (targetElementsRef.current.delete(targetId)) {
      setRegistryVersion((current) => current + 1);
    }
  }, []);

  const getTargetElement = useCallback((targetId: string) => targetElementsRef.current.get(targetId) ?? null, []);

  // PHASE 5 — REPLAY. Moves the LOCAL replay stage index forward one stage
  // (or ends the replay walkthrough entirely, from its own last stage) —
  // never touches the real `view`/PlayerTutorialProgress at all. Shares
  // the "advance" name/shape with the live advance() below purely so
  // TutorialPanel's own CTA routing (ctaKind === "advance" ? advance : ...)
  // can call whichever one is currently active without knowing which mode
  // it's in.
  const advance = useCallback(() => {
    if (mode === "replay") {
      // Wrapped in startTransition even though nothing here is actually
      // async — this must never call setState synchronously from inside
      // the pathname-watcher effect below (React's own "avoid setState
      // directly in an effect body" guidance); routing every state update
      // through a transition, exactly like the live branch below already
      // does for its own (genuinely async) Server Action, is what keeps
      // both paths consistent.
      startTransition(() => {
        const nextIndex = getNextReplayStageIndex(replayStageIndex);
        if (nextIndex === null) {
          // Replay's own last stage just finished — end the walkthrough
          // (never a reward, never any server call) and hand control back
          // to the live Home card.
          setMode("live");
          setReplayStageIndex(REPLAY_FIRST_STAGE_INDEX);
          setReplaySubStep(null);
          setPanelMode("closed");
          return;
        }
        setReplayStageIndex(nextIndex);
        setReplaySubStep(null);
        setPanelMode(panelModeForReplayStage(nextIndex));
      });
      return;
    }

    startTransition(async () => {
      const result = await advanceTutorialStageAction();
      if (result.status !== "ok") return;

      setView(result.view);
      setPanelMode(panelModeForCurrentProgress(result.view));
    });
  }, [mode, replayStageIndex]);

  // PHASE 5 — REPLAY. The replay-only counterpart to completeActiveTarget
  // below — advances exactly one LOCAL sub-step (or, for a "single"-kind
  // stage, the whole local stage) whenever a real navigation/action/manual
  // signal is detected while replaying. Never calls a Server Action.
  const completeReplayTarget = useCallback(() => {
    const stage = replayView!.currentStage;
    const completion = stage.completion;
    if (completion.kind !== "single" && completion.kind !== "multi-step") return;

    if (completion.kind === "single") {
      advance();
      return;
    }

    const steps = completion.steps;
    const currentIndex = replaySubStep ? steps.findIndex((step) => step.id === replaySubStep) : -1;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= steps.length) return; // defensive — should never happen while awaiting

    const completingStep = steps[nextIndex];

    // Wrapped in startTransition — same reasoning as advance()'s own
    // replay branch above (never setState synchronously from inside the
    // pathname-watcher effect).
    startTransition(() => {
      setReplaySubStep(completingStep.id);

      // NAVIGATION ORDER — same "step 0 of an explainAfterEntry stage
      // shows the stage's own panelCopy as its implicit explanation"
      // rule as completeActiveTarget's own live counterpart below (see
      // that branch's own doc comment) — mirrored here so replay shows
      // the identical navigate-then-explain order.
      if (completingStep.explainAfter || (stage.explainAfterEntry && completingStep === completion.steps[0])) {
        setPanelMode("explaining");
        return;
      }

      const stillActiveTarget = getReplayActiveTarget(buildReplayProgressView(replayStageIndex, completingStep.id));
      if (stillActiveTarget) {
        setPanelMode("awaiting");
        return;
      }

      const hasWrapUp = completion.kind === "multi-step" && Boolean(completion.wrapUpPanelCopy);
      if (hasWrapUp) {
        setPanelMode("explaining");
        return;
      }

      advance();
    });
  }, [replayView, replaySubStep, replayStageIndex, advance]);

  // PHASE 1 — the one place a detected real event (navigation, a reported
  // action, or a manual confirm) turns into the matching server mutation,
  // for a LIVE playthrough. Always guarded by isSubmitting so an
  // overlapping detection (e.g. a pathname change firing while a previous
  // completion is still in flight) can never double-advance.
  const completeActiveTarget = useCallback(() => {
    if (isSubmitting) return;

    const completion = view.currentStage.completion;
    if (completion.kind !== "single" && completion.kind !== "multi-step") return;

    startTransition(async () => {
      if (completion.kind === "single") {
        const result = await advanceTutorialStageAction();
        if (result.status !== "ok") return;
        setView(result.view);
        setPanelMode(panelModeForCurrentProgress(result.view));
        return;
      }

      // multi-step
      const subStepResult = await advanceTutorialSubStepAction();
      if (subStepResult.status !== "ok") return;

      setView(subStepResult.view);

      // PHASE 3 — the step that JUST completed (subStepResult.view.
      // currentSubStep) may declare its own mid-flow explanation — takes
      // priority over jumping straight to the next step's "awaiting" mode,
      // and over the stage's own wrapUpPanelCopy, since it can fire on ANY
      // step. Shown via the normal "explaining" panel; its own CTA
      // ("proceed", see below) is what actually moves on from here.
      const stageCompletion = subStepResult.view.currentStage.completion;
      const justCompletedStep =
        stageCompletion.kind === "multi-step"
          ? stageCompletion.steps.find((step) => step.id === subStepResult.view.currentSubStep)
          : undefined;

      // NAVIGATION ORDER — explainAfterEntry's own doc comment
      // (tutorial.types.ts): a flagged stage's own panelCopy is the
      // implicit explanation for its FIRST step (always the real route
      // navigation) — shown the instant that step's signal fires, taking
      // priority over jumping straight to the next step's own "awaiting",
      // exactly like an explicit explainAfter would.
      const isFirstStepOfFlaggedStage =
        stageCompletion.kind === "multi-step" &&
        subStepResult.view.currentStage.explainAfterEntry === true &&
        justCompletedStep === stageCompletion.steps[0];

      if (justCompletedStep?.explainAfter || isFirstStepOfFlaggedStage) {
        setPanelMode("explaining");
        return;
      }

      const stillActiveTarget = getActiveTutorialTarget(subStepResult.view);
      if (stillActiveTarget) {
        // The next step is now awaited — straight back into "awaiting"
        // with its own guidance, no intermediate panel (see
        // tutorial.types.ts's own doc comment on why a plain step with no
        // explainAfter never gets a full panel of its own).
        setPanelMode("awaiting");
        return;
      }

      // Every step in this stage is done. If it defines its own wrap-up
      // panel, show it and stop — the player's own explicit "המשך" (a
      // plain `advance()` call) is what moves to the next stage from
      // here. If it doesn't, skip straight through: call the plain stage
      // advance ourselves so the player never sees an inert intermediate
      // panel with nothing left for it to explain.
      const hasWrapUp = stageCompletion.kind === "multi-step" && Boolean(stageCompletion.wrapUpPanelCopy);

      if (hasWrapUp) {
        setPanelMode("explaining");
        return;
      }

      const stageResult = await advanceTutorialStageAction();
      if (stageResult.status !== "ok") return;
      setView(stageResult.view);
      setPanelMode(panelModeForCurrentProgress(stageResult.view));
    });
  }, [view, isSubmitting]);

  // PHASE 3/5 — the CTA for a mid-flow explainAfter panel
  // (getExplainingPanelDisplay's/getReplayExplainingPanelDisplay's own
  // "proceed" ctaKind): computed at CLICK time from the current view (live
  // or replay), never baked into the panel copy itself, so it always does
  // the right thing regardless of whether more steps remain, a wrap-up
  // panel follows, or neither.
  function proceed() {
    if (mode === "replay") {
      const active = getReplayActiveTarget(replayView!);
      if (active) {
        setPanelMode("awaiting");
        return;
      }
      const completion = replayView!.currentStage.completion;
      if (completion.kind === "multi-step" && completion.wrapUpPanelCopy) {
        setPanelMode("explaining");
        return;
      }
      advance();
      return;
    }

    const active = getActiveTutorialTarget(view);
    if (active) {
      setPanelMode("awaiting");
      return;
    }

    const completion = view.currentStage.completion;
    if (completion.kind === "multi-step" && completion.wrapUpPanelCopy) {
      setPanelMode("explaining");
      return;
    }

    advance();
  }

  // PHASE 1/5 — generic "did the player reach the awaited screen"
  // detection, live OR replay alike. usePathname() needs no provider of
  // its own (a plain Next.js router hook), so this works from directly
  // inside TutorialProvider — no per-page integration point needed for any
  // navigate-signal stage.
  useEffect(() => {
    if (panelMode !== "awaiting") return;

    if (mode === "replay") {
      const active = replayView ? getReplayActiveTarget(replayView) : null;
      if (!active || active.signal.kind !== "navigate") return;
      if (pathname.startsWith(active.signal.expectedPathname)) {
        completeReplayTarget();
      }
      return;
    }

    const active = getActiveTutorialTarget(view);
    if (!active || active.signal.kind !== "navigate") return;

    if (pathname.startsWith(active.signal.expectedPathname)) {
      completeActiveTarget();
    }
    // Deliberately keyed on the primitive stage/sub-step/pathname triggers
    // (live and replay alike), not on `active` itself (a freshly computed
    // object every render) or on completeActiveTarget/completeReplayTarget
    // (which already close over their own latest state) — this must only
    // ever re-run on an actual navigation or a genuine stage/sub-step
    // transition, never a stray re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, panelMode, mode, view.currentStageId, view.currentSubStep, replayStageIndex, replaySubStep]);

  function beginAwaiting() {
    setPanelMode("awaiting");
  }

  // PHASE 4 — COMPLETION REWARD. Never reachable during replay —
  // getReplayExplainingPanelDisplay coerces the Completion stage's own CTA
  // to "advance" instead (see that function's own doc comment) — so
  // TutorialPanel simply never calls this while mode is "replay".
  function claimReward() {
    startTransition(async () => {
      const result = await claimTutorialRewardAction();
      if (result.status !== "ok") return;

      setView(result.view);
      // Nothing left to show once the reward is claimed — TutorialPanel
      // itself already stops rendering the instant view.status becomes
      // "completed" regardless of panelMode, but "closed" is the correct
      // value for HomeTutorialCard's own gating too.
      setPanelMode("closed");
    });
  }

  function postpone() {
    setPanelMode("closed");

    if (mode === "replay") {
      // PHASE 5 — REPLAY. Purely local — abandons the walkthrough without
      // ever touching the server (nothing was ever written to it in the
      // first place). A later "הפעלה חוזרת" click starts a fresh replay
      // from Stage 1 again.
      setMode("live");
      setReplayStageIndex(REPLAY_FIRST_STAGE_INDEX);
      setReplaySubStep(null);
      return;
    }

    startTransition(async () => {
      const result = await postponeTutorialAction();
      if (result.status === "ok") setView(result.view);
    });
  }

  function resume() {
    startTransition(async () => {
      const result = await resumeTutorialAction();
      if (result.status === "ok") {
        setView(result.view);
        setPanelMode(panelModeForCurrentProgress(result.view));
        return;
      }
      setPanelMode("explaining");
    });
  }

  // PHASE 5 — REPLAY. HomeTutorialCard's own "הפעלה חוזרת" button.
  function startReplay() {
    setMode("replay");
    setReplayStageIndex(REPLAY_FIRST_STAGE_INDEX);
    setReplaySubStep(null);
    setPanelMode("explaining");
  }

  function reportAction(actionId: TutorialActionId) {
    if (panelMode !== "awaiting") return;

    if (mode === "replay") {
      const active = replayView ? getReplayActiveTarget(replayView) : null;
      if (active?.signal.kind === "action" && active.signal.actionId === actionId) {
        completeReplayTarget();
      }
      return;
    }

    const active = getActiveTutorialTarget(view);
    if (active?.signal.kind === "action" && active.signal.actionId === actionId) {
      completeActiveTarget();
    }
  }

  function confirmManualTarget() {
    if (panelMode !== "awaiting") return;

    if (mode === "replay") {
      const active = replayView ? getReplayActiveTarget(replayView) : null;
      if (active?.signal.kind === "manual") {
        completeReplayTarget();
      }
      return;
    }

    const active = getActiveTutorialTarget(view);
    if (active?.signal.kind === "manual") {
      completeActiveTarget();
    }
  }

  const value: TutorialContextValue = {
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
    resume,
    startReplay,
    reportAction,
    confirmManualTarget,
    registerTarget,
    unregisterTarget,
    getTargetElement,
    registryVersion,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial(): TutorialContextValue {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within TutorialProvider");
  }
  return context;
}

// PHASE 1 — the standard registration hook for a STATIC spotlight target
// (a fixed call site, e.g. the sidebar toggle button or one specific
// sidebar link) — returns a stable ref callback. For a DYNAMIC list (Map's
// own zone polygons, rendered in a .map()), call registerTarget/
// unregisterTarget directly from useTutorial() instead — see
// InteractiveWorldMap.tsx's own doc comment for why this hook itself must
// never be called conditionally/per-iteration.
export function useTutorialTarget(targetId: string) {
  const { registerTarget, unregisterTarget } = useTutorial();

  return useCallback(
    (node: Element | null) => {
      if (node) registerTarget(targetId, node);
      else unregisterTarget(targetId);
    },
    [targetId, registerTarget, unregisterTarget]
  );
}
