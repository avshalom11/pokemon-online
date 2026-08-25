// GAME TUTORIAL — PHASE 0/1. Shared shapes between the server-only progress
// service, the Server Actions, and every client Tutorial component — never
// duplicated as a second ad-hoc shape anywhere else.

export type TutorialStatus = "not_started" | "in_progress" | "completed";

export interface TutorialPanelCopy {
  title: string;
  // Plain text — no markup, matching every other Hebrew dialog copy in this
  // codebase (EvolutionPromptDialog, MoveLearningDecisionDialog, ...), which
  // never renders rich text either. May contain literal "\n"/"\n\n" for a
  // line/paragraph break (e.g. the Welcome/Completion stages' own reward
  // lines) — TutorialPanel renders this field with `whitespace-pre-line` so
  // those breaks actually show.
  body: string;
  // The stage's own primary action label — "התחל את הכרת המשחק" for the
  // Welcome stage, "בצע" for every stage that follows (see
  // tutorial-stages.config.ts). A per-stage field rather than a hardcoded
  // client-side special case for stage 1, so a future stage's own wording
  // is always a data change, never a component change.
  ctaLabel: string;
  // GUIDE CHARACTER IMAGES. Optional guide-character artwork (a public/
  // path, e.g. "/images/tutorial/Oak1.png") shown alongside this panel's
  // own title/body in the centered Tutorial panel — TutorialPanel renders
  // it purely from this field, never a hardcoded per-stage-id check, so
  // which checkpoint gets an image is entirely a data change in
  // tutorial-stages.config.ts. Omitted for every panel that has no guide
  // artwork of its own (most of them) — nothing renders in that case.
  guideImage?: string;
}

// PHASE 1/2 — NAVIGATION + SPOTLIGHT / REAL ACTIONS. The closed set of
// real, non-navigation in-page events the Tutorial can gate a stage/
// sub-step on — everything else (reaching a new screen) is detected
// generically via pathname, never needs its own id here. Reported via
// TutorialContext's reportAction, from a small integration point at the
// real call site — never DOM scraping, never a fabricated/duplicated
// detection path.
//
// "pokemon-healed" / "poke-ball-purchased" (PHASE 2) are only ever reported
// AFTER the real Server Action's own result is checked at that call site
// (healPartyAction's `status === "healed"` including the Starter's own id;
// purchaseShopItemAction's `status === "success"` for exactly one real
// "poke-ball" at its real 100-money price) — this file's own
// TutorialActionId union carries no verification logic itself, it only
// names the event; PokemonCenterContent.tsx/ShopContent.tsx are what
// actually verify it before ever calling reportAction.
//
// "battle-attack-performed" / "battle-bag-opened" / "pidgey-captured"
// (PHASE 3) — same rule, reported from BattleContent.tsx only after the
// real executeBattleActionAction/attemptCaptureAction result confirms
// success. "pidgey-captured" additionally gets a SERVER-SIDE re-check
// (advanceTutorialSubStep, tutorial-progress.service.ts, against
// PlayerTutorialProgress.pidgeyCaptured) before it's ever allowed to
// advance the Tutorial — the one action here that grants something
// permanent, so a client report alone is never trusted for it either.
export type TutorialActionId =
  | "sidebar-opened"
  | "starter-details-opened"
  | "pokemon-healed"
  | "poke-ball-purchased"
  | "battle-attack-performed"
  | "battle-bag-opened"
  | "pidgey-captured";

// One spotlightable real control — `targetId` matches a useTutorialTarget
// registration somewhere in the real UI (purely for the spotlight overlay's
// own on-screen positioning; completion is never derived from this).
// `guidance` is the short instruction shown in the minimized banner while
// this target is being awaited — never the stage's full explanation, which
// is always shown separately (see TutorialStageCompletion's own doc
// comment).
export interface TutorialTarget {
  targetId: string;
  guidance: string;
  // PHASE 5 — REPLAY. True for a target whose real completion would
  // grant, spend, or otherwise permanently change something on the
  // account (a guaranteed capture, a real Poké Ball purchase, a real
  // heal) — during replay, such a target is never actually awaited: its
  // signal is treated as "manual" instead (a plain confirm button — same
  // shape the Friends stage's own signal already uses), so the player
  // still sees the same guidance/spotlight but is never required (or
  // able) to perform the real, mutating action again. Omitted (or false)
  // for a target whose real completion is harmless (a navigation, an
  // open-the-sidebar toggle, opening a read-only details panel) — those
  // stay fully interactive even during replay, per this task's own "keep
  // normal navigation/spotlight behavior" rule. Never read anywhere
  // outside replay — a live playthrough always uses the real signal as-is
  // regardless of this flag.
  skipInReplay?: boolean;
}

// How a single target's completion is actually detected. "navigate" is
// checked generically (TutorialProvider's own usePathname watcher) against
// ANY route reaching `expectedPathname` — no per-page integration needed.
// "action" is checked against TutorialContext.reportAction calls, wired at
// the one real call site for that action. "manual" has no real detectable
// event at all (e.g. the Friends bar — "do not require another player to
// exist or interact") — the minimized banner shows its own confirm button
// instead of waiting for anything.
export type TutorialCompletionSignal =
  | { kind: "navigate"; expectedPathname: string }
  | { kind: "action"; actionId: TutorialActionId }
  | { kind: "manual" };

// One step of a multi-target stage (e.g. My Pokémon: navigate there, THEN
// open the Starter's own details) — PlayerTutorialProgress.currentSubStep
// persists exactly which step id the player has most recently completed
// (null meaning "about to start the first one"), so a refresh/navigation
// never loses which of several targets within one stage was already
// reached — this task's own explicit requirement.
export interface TutorialSubStep {
  id: string;
  target: TutorialTarget;
  signal: TutorialCompletionSignal;
  // PHASE 3 — an optional full panel shown the INSTANT this step's signal
  // fires, before the next step begins (or before the stage's own
  // wrapUpPanelCopy/advance, if this was the last step) — e.g. the
  // scripted Field Battle's own "lower wild HP increases capture chance;
  // you can also switch Pokémon, though it isn't required now" explanation,
  // shown right after the real attack lands but before requiring the Bag
  // to be opened. Distinct from a stage's own wrapUpPanelCopy (shown once
  // EVERY step is done); this is shown mid-flow, between two specific
  // steps. Omitted for every step that has nothing to explain in between.
  explainAfter?: TutorialPanelCopy;
}

// PHASE 1: three real completion shapes, alongside PHASE 0's
// "explanation-only" (kept for Welcome, the scripted Field Battle
// placeholder, and Completion — none of which have a real target yet).
//
// "single" — one real target; once its signal fires, the whole stage
// completes and advances directly to the next one.
//
// "multi-step" — an ordered sequence of targets within the SAME stage
// (never a full stage advance in between). `wrapUpPanelCopy`, if present,
// is shown once every step is done, before the player's own explicit
// "המשך" advances the stage for real (My Pokémon's own "here's how to read
// level/XP/HP/stats" wrap-up, shown only after the Starter's details are
// actually open) — omitted entirely when a stage's last step already IS
// the natural hand-off into the next stage's own explanation (Map's own
// "enter Grassland" step hands off straight into the Field Battle stage's
// existing panel, so no extra panel is needed in between).
export type TutorialStageCompletion =
  | { kind: "explanation-only" }
  | { kind: "single"; target: TutorialTarget; signal: TutorialCompletionSignal }
  | { kind: "multi-step"; steps: readonly TutorialSubStep[]; wrapUpPanelCopy?: TutorialPanelCopy };

export interface TutorialStageDefinition {
  // Stable string id, never a numeric index — PlayerTutorialProgress.
  // currentStageId persists this directly, so the registry can be
  // reordered/extended (e.g. a future Trading stage) without invalidating
  // already-saved progress.
  id: string;
  // Display/registry order — decoupled from `id` so stages can be
  // renumbered without a data migration.
  order: number;
  // False only for "welcome" (Stage 1's own "no postpone option on this
  // first panel" rule) — every other stage is true.
  canPostpone: boolean;
  // The stage's own explanation panel. By default (explainAfterEntry
  // false/omitted) this is the lead-in — shown first, always, before any
  // spotlighting starts (and the ONLY panel ever shown for an
  // "explanation-only" or "single"-completion stage). For "multi-step"
  // stages this is likewise the very first panel (before step 0 starts) by
  // default; nothing is shown again between steps — only the minimized
  // banner's own short `guidance` — until `wrapUpPanelCopy` (if any)
  // appears once every step is done. See `explainAfterEntry` below for the
  // one case where this same field displays LATER instead.
  panelCopy: TutorialPanelCopy;
  // NAVIGATION ORDER — route-based stages only (My Pokémon, Map, Pokémon
  // Center, Shop, Inventory, Daycare, Hatchery, Gyms, Leagues, Regions,
  // Profile). When true, this stage's OWN panelCopy never shows as a
  // lead-in — the stage starts straight in "awaiting", spotlighting its
  // FIRST completion step's target (always the real sidebar navigation to
  // this stage's own route) with nothing but its short `guidance` text.
  // Only once that first step's signal actually fires (the player has
  // genuinely arrived) does panelCopy show, functioning as an implicit
  // "explainAfter" for that first step — reusing panelCopy verbatim rather
  // than duplicating its text into every step's own explainAfter field, so
  // there is exactly one source of truth for a stage's explanation
  // regardless of when it displays. Any further steps in the stage (e.g.
  // My Pokémon's own "open the Starter's details") continue completely
  // unaffected afterward — this only ever changes WHEN the stage's own
  // panelCopy shows, never anything else about its completion. Requires
  // `completion.kind === "multi-step"` with at least one step (every
  // flagged stage in the registry already is); a meaningless no-op
  // otherwise. Omitted/false for every stage not in the list above
  // (Welcome, Home + Sidebar, the scripted Field Battle, Friends,
  // Completion) — those keep the original "explain, then navigate" order.
  explainAfterEntry?: boolean;
  completion: TutorialStageCompletion;
}

// The server-assembled, ready-to-render view — combines the persisted
// PlayerTutorialProgress row with its matching registry entry (already
// resolved server-side) and the derived progress numbers Home's own
// progress bar needs, so no client component ever has to re-derive
// "how far along is this player" from raw stage ids itself.
export interface TutorialProgressView {
  status: TutorialStatus;
  currentStageId: string;
  currentSubStep: string | null;
  currentStage: TutorialStageDefinition;
  // 0-based position of currentStage within the ordered registry.
  stageIndex: number;
  totalStages: number;
  // 0-100, rounded — stageIndex / totalStages, 100 once status is
  // "completed".
  progressPercent: number;
  isLastStage: boolean;
}

// PHASE 5 — REPLAY. The purely client-side counterpart to
// TutorialProgressView — same shape, minus every field that only makes
// sense for the REAL, server-backed progress (status/currentStageId,
// which the real Tutorial's own currentStageId column persists;
// rewardClaimed, never touched by replay at all). Built and advanced
// entirely in tutorial-context.tsx via TUTORIAL_STAGES array indexing —
// never written to PlayerTutorialProgress, never read from it either,
// so a replay run can never alter (or even briefly appear to alter) the
// real, already-completed progress it's reviewing. getActiveTutorialTarget
// and getExplainingPanelDisplay (tutorial-stages.config.ts) both already
// accept this shape as-is (they only ever destructure currentStage/
// currentSubStep) — see that file's own getReplayActiveTarget/
// getReplayExplainingPanelDisplay wrappers for the one difference: a
// skipInReplay target's signal is coerced to "manual".
export interface ReplayProgressView {
  currentStage: TutorialStageDefinition;
  currentSubStep: string | null;
  stageIndex: number;
  totalStages: number;
  progressPercent: number;
  isLastStage: boolean;
}
