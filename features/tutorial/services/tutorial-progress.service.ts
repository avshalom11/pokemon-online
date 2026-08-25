import "server-only";

import {
  FIRST_TUTORIAL_STAGE_ID,
  getNextTutorialStageId,
  getTutorialStageById,
  getTutorialStageIndex,
  TUTORIAL_COMPLETION_STAGE_ID,
  TUTORIAL_STAGES,
} from "@/features/tutorial/data/tutorial-stages.config";
import type { TutorialProgressView, TutorialStatus } from "@/features/tutorial/types/tutorial.types";
import { grantCurrencyRewards } from "@/features/currency/services/currency-reward.service";
import { createOwnedEgg } from "@/features/eggs/services/egg-ownership.service";
import { prisma } from "@/lib/db/prisma";
import type { Prisma, PlayerTutorialProgress } from "@/lib/generated/prisma/client";

// GAME TUTORIAL — PHASE 4 — COMPLETION REWARD. The exact reward this task's
// own spec requires — plain constants, never re-derived or duplicated
// elsewhere (the Welcome/Completion stages' own panel copy already quotes
// these same numbers as plain Hebrew text, authored once in Phase 0/1;
// this is the one place they're actually granted).
const TUTORIAL_COMPLETION_MONEY_REWARD = 2000;
const TUTORIAL_COMPLETION_GOLD_REWARD = 40;
const TUTORIAL_COMPLETION_EGG_RARITY = "very-rare" as const;
const TUTORIAL_COMPLETION_EGG_REGION_ID = "sinnoh";

// GAME TUTORIAL — PHASE 0. Lazily creates this player's PlayerTutorialProgress
// row the first time it's read — never part of selectStarterPokemon's own
// transaction (features/onboarding/services/select-starter.service.ts), so
// onboarding stays entirely unaware the Tutorial exists. Same idempotent-
// upsert idiom as lib/auth/player-profile.ts's ensurePlayerProfile: a player
// who already has a row is never touched by this again, and a missing row
// self-heals on the next call rather than throwing.
//
// This is what makes Stage 1 "auto-open for a new player after Starter
// onboarding is completed": app/(game)/layout.tsx (the one shared shell
// every authenticated route renders through, reached only once onboarding
// has completed — see getOnboardingRedirectTarget) calls
// getTutorialProgressView below on every render, which calls this first —
// the very first time an onboarded player loads any (game) route, this
// creates a fresh row defaulted to { currentStageId: "welcome", status:
// "not_started" }, and TutorialProvider's own client logic (see
// tutorial-context.tsx) opens the panel automatically exactly when status
// is still "not_started".
export async function getOrCreateTutorialProgress(playerId: string): Promise<PlayerTutorialProgress> {
  return prisma.playerTutorialProgress.upsert({
    where: { playerId },
    create: { playerId },
    update: {},
  });
}

// Combines a persisted row with its matching registry entry into the one
// shape every Tutorial component actually renders — resolved once, here,
// so no client component ever has to re-derive "how far along is this
// player" from a raw stage id itself. Falls back to the first stage
// whenever `row.currentStageId` no longer resolves against the registry (a
// defensive "never crash, never undefined" guard for a stage that was
// renamed/removed after the row was written — should never happen in
// practice, since ids are only ever added, never renamed, but this keeps a
// stale row from ever breaking the page rather than trusting it blindly).
function buildTutorialProgressView(row: PlayerTutorialProgress): TutorialProgressView {
  const resolvedStage = getTutorialStageById(row.currentStageId);
  const currentStage = resolvedStage ?? getTutorialStageById(FIRST_TUTORIAL_STAGE_ID)!;
  const stageIndex = getTutorialStageIndex(currentStage.id);
  const totalStages = TUTORIAL_STAGES.length;
  const status = row.status as TutorialStatus;

  return {
    status,
    currentStageId: currentStage.id,
    currentSubStep: row.currentSubStep,
    currentStage,
    stageIndex,
    totalStages,
    progressPercent: status === "completed" ? 100 : Math.round((stageIndex / totalStages) * 100),
    isLastStage: getNextTutorialStageId(currentStage.id) === null,
  };
}

// The one read every server surface (the (game) layout's seed for
// TutorialProvider, and any future server-rendered Tutorial UI) goes
// through — get-or-create, then resolve against the registry.
export async function getTutorialProgressView(playerId: string): Promise<TutorialProgressView> {
  const row = await getOrCreateTutorialProgress(playerId);
  return buildTutorialProgressView(row);
}

// Moves the player from their current stage to the next one in the
// registry (or, from the last stage, marks the tutorial completed) —
// PHASE 0's only real mutation. Guarded by a CAS-style updateMany
// (`where: { playerId, currentStageId: <the exact stage just read} }`),
// same idiom promoteToNextEncounter's own updateMany guard already
// establishes (battle-session.service.ts): a race (double-click, a retried
// Server Action) that already advanced this same row simply matches 0
// rows and is treated as a no-op re-read, never a duplicate advance and
// never a thrown error.
//
// Sub-step (currentSubStep) is always cleared on a stage advance — no
// Phase 0 stage sets one (see this file's own registry doc comment); a
// later phase's own multi-step stage (the scripted Field Battle) writes it
// through a separate, stage-scoped mutation, not this generic advance.
export async function advanceTutorialStage(playerId: string): Promise<TutorialProgressView> {
  const row = await getOrCreateTutorialProgress(playerId);
  const nextStageId = getNextTutorialStageId(row.currentStageId);

  const data =
    nextStageId !== null
      ? { currentStageId: nextStageId, currentSubStep: null, status: "in_progress" as const }
      : { status: "completed" as const, completedAt: new Date() };

  await prisma.playerTutorialProgress.updateMany({
    where: { playerId, currentStageId: row.currentStageId },
    data,
  });

  return getTutorialProgressView(playerId);
}

// PHASE 1 — NAVIGATION + SPOTLIGHT. Moves the player from their currently-
// awaited sub-step to the next one WITHIN the same multi-step stage (e.g.
// My Pokémon: "reached /my-pokemon" -> "opened the Starter's details") —
// never touches currentStageId, and never fires for a stage that isn't
// "multi-step" (a defensive no-op — the client only ever calls this while
// a multi-step stage's own target is what was just detected, but this
// stays correct even if that ever drifted).
//
// Same CAS-guarded updateMany idiom as advanceTutorialStage above (`where`
// re-asserts the exact currentSubStep just read, so a race/retry can never
// double-advance past a step). Once every step in the stage is already
// done (there is no next step to move to), this deliberately does NOT
// itself advance the whole stage — that only happens once the player
// confirms this stage's own wrapUpPanelCopy (if any) via the plain
// advanceTutorialStage above, or — for a stage with no wrap-up panel at
// all — the client calls advanceTutorialStage itself immediately after
// seeing this function's own "nothing left to persist" result. See
// tutorial-context.tsx's completeActiveTarget for the exact client-side
// sequencing.
export async function advanceTutorialSubStep(playerId: string): Promise<TutorialProgressView> {
  const row = await getOrCreateTutorialProgress(playerId);
  const stage = getTutorialStageById(row.currentStageId);

  if (!stage || stage.completion.kind !== "multi-step") {
    return buildTutorialProgressView(row);
  }

  const steps = stage.completion.steps;
  const currentIndex = row.currentSubStep ? steps.findIndex((step) => step.id === row.currentSubStep) : -1;
  const nextIndex = currentIndex + 1;

  if (nextIndex >= steps.length) {
    // Every step is already done — nothing new to persist here.
    return buildTutorialProgressView(row);
  }

  const completingStep = steps[nextIndex];

  // GAME TUTORIAL — PHASE 3. The one sub-step whose completion grants
  // something permanent (a real owned Pokémon) — never trust the client's
  // mere reportAction call alone. Requires the server's own persisted
  // pidgeyCaptured flag (set exclusively by capture.service.ts's
  // attemptCapture, inside the SAME transaction as the real guaranteed
  // capture) to already be true before this step can ever be recorded as
  // complete. A client that reports this action without a real capture
  // having happened yet is a safe no-op here, never an advance — matches
  // this task's own "do not trust a client event alone" rule for the one
  // step that actually matters economically.
  if (stage.id === "field-battle" && completingStep.id === "capture-pidgey" && !row.pidgeyCaptured) {
    return buildTutorialProgressView(row);
  }

  await prisma.playerTutorialProgress.updateMany({
    where: { playerId, currentStageId: row.currentStageId, currentSubStep: row.currentSubStep },
    data: { currentSubStep: completingStep.id },
  });

  return getTutorialProgressView(playerId);
}

// GAME TUTORIAL — PHASE 3. Stamps the one-time "already obtained the
// guaranteed Tutorial Pidgey" flag — called from capture.service.ts's
// attemptCapture, inside the SAME transaction as the real capture, so the
// flag can never be set without a genuine capture actually happening (and
// a capture can never happen twice for this account — see
// battle-session.service.ts's getOrStartBattle, which stops forcing a
// fresh tutorial encounter the instant this is true). Guarded (`where:
// {playerId, pidgeyCaptured: false}`) so a retried/racing call is a safe
// no-op — same atomic idiom every other exactly-once flag in this
// codebase already uses (FieldBattleSession.wildDefeatRewardGranted,
// PlayerProfile.onboardingCompleted).
export async function markTutorialPidgeyCaptured(tx: Prisma.TransactionClient, playerId: string): Promise<void> {
  await tx.playerTutorialProgress.updateMany({
    where: { playerId, pidgeyCaptured: false },
    data: { pidgeyCaptured: true },
  });
}

// GAME TUTORIAL — PHASE 4 — COMPLETION REWARD. Grants the one-time
// completion reward (2,000 Money, 40 Gold, one Very Rare Sinnoh Egg) and
// marks the Tutorial completed, all atomically — this task's own explicit
// requirement. Same "claim first via a guarded updateMany, then perform
// the reward grants inside the same transaction only if the claim
// actually won" idiom battle-session.service.ts's own applyWildHpSync
// already establishes for wildDefeatRewardGranted: a double-click, a
// retried Server Action, or a second tab racing the claim button can
// never grant the reward twice, because the updateMany's WHERE guard
// resolves the race at the DB level, not in application code.
//
// Server-side gated on `currentStageId === "completion"` (never trusted
// from the client alone) — a call from any earlier stage is a safe no-op,
// never an early/out-of-order grant. Uses the EXISTING, unmodified
// currency and Egg ownership services (grantCurrencyRewards,
// createOwnedEgg) — never a Tutorial-specific reward mechanism.
export async function claimTutorialReward(playerId: string): Promise<TutorialProgressView> {
  const row = await getOrCreateTutorialProgress(playerId);

  if (row.currentStageId !== TUTORIAL_COMPLETION_STAGE_ID) {
    return buildTutorialProgressView(row);
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.playerTutorialProgress.updateMany({
      where: { playerId, currentStageId: TUTORIAL_COMPLETION_STAGE_ID, rewardClaimed: false },
      data: { rewardClaimed: true, status: "completed", completedAt: new Date() },
    });

    if (claimed.count === 0) {
      // Already claimed (a retry, a double-click, a second tab) — the
      // reward grants below must never run a second time.
      return;
    }

    await grantCurrencyRewards(tx, playerId, [
      { type: "money", amount: TUTORIAL_COMPLETION_MONEY_REWARD },
      { type: "gold", amount: TUTORIAL_COMPLETION_GOLD_REWARD },
    ]);
    await createOwnedEgg(tx, playerId, TUTORIAL_COMPLETION_EGG_RARITY, TUTORIAL_COMPLETION_EGG_REGION_ID, "tutorial");
  });

  return getTutorialProgressView(playerId);
}
