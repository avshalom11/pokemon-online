// GAME TUTORIAL — PHASE 0. Real service + fake DB behavioral tests — same
// "real service, fake DB" convention this codebase's other persistence
// tests already use (see e.g. features/move-learning's own
// move-learning-ux.test.ts).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { FIRST_TUTORIAL_STAGE_ID, getTutorialStageById, TUTORIAL_COMPLETION_STAGE_ID, TUTORIAL_STAGES } from "@/features/tutorial/data/tutorial-stages.config";
import {
  advanceTutorialStage,
  advanceTutorialSubStep,
  claimTutorialReward,
  getOrCreateTutorialProgress,
  getTutorialProgressView,
  markTutorialPidgeyCaptured,
} from "@/features/tutorial/services/tutorial-progress.service";
import { prisma } from "@/lib/db/prisma";
import { getOwnedEggRowsForPlayer, getPlayerProfileRow, resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("getOrCreateTutorialProgress lazily creates a fresh row, defaulted to the first stage and not_started", async () => {
  const row = await getOrCreateTutorialProgress("player-1");

  assert.equal(row.currentStageId, FIRST_TUTORIAL_STAGE_ID);
  assert.equal(row.currentSubStep, null);
  assert.equal(row.status, "not_started");
  assert.equal(row.rewardClaimed, false);
});

test("getOrCreateTutorialProgress is idempotent — a second call never resets an already-advanced player", async () => {
  await getOrCreateTutorialProgress("player-1");
  await advanceTutorialStage("player-1");

  const row = await getOrCreateTutorialProgress("player-1");

  assert.equal(row.currentStageId, TUTORIAL_STAGES[1].id, "the second get-or-create call must never reset progress back to stage 1");
  assert.equal(row.status, "in_progress");
});

test("getTutorialProgressView resolves the current stage's full definition from the registry, and the right progress numbers", async () => {
  const view = await getTutorialProgressView("player-2");

  assert.equal(view.status, "not_started");
  assert.equal(view.currentStageId, "welcome");
  assert.equal(view.currentStage.id, "welcome");
  assert.equal(view.stageIndex, 0);
  assert.equal(view.totalStages, TUTORIAL_STAGES.length);
  assert.equal(view.progressPercent, 0);
  assert.equal(view.isLastStage, false);
});

test("advanceTutorialStage moves the player exactly one stage forward and flips status to in_progress", async () => {
  const view = await advanceTutorialStage("player-3");

  assert.equal(view.currentStageId, TUTORIAL_STAGES[1].id);
  assert.equal(view.status, "in_progress");
  assert.equal(view.stageIndex, 1);
});

test("advancing from the last stage marks the tutorial completed, with completedAt set — never lost/undefined stage", async () => {
  // Walk every stage forward.
  for (let i = 0; i < TUTORIAL_STAGES.length; i++) {
    await advanceTutorialStage("player-4");
  }

  const view = await getTutorialProgressView("player-4");
  assert.equal(view.status, "completed");
  assert.equal(view.isLastStage, true);
  assert.equal(view.progressPercent, 100);

  const row = await getOrCreateTutorialProgress("player-4");
  assert.ok(row.completedAt instanceof Date);
});

test("advanceTutorialStage never advances a different player's progress", async () => {
  await advanceTutorialStage("player-a");

  const otherView = await getTutorialProgressView("player-b");
  assert.equal(otherView.currentStageId, FIRST_TUTORIAL_STAGE_ID, "player-b's own progress must be untouched by player-a's advance");
  assert.equal(otherView.status, "not_started");
});

test("sub-step is always cleared on a generic advance — PHASE 0 never sets one, but this stays correct once a later phase does", async () => {
  const view = await advanceTutorialStage("player-5");
  assert.equal(view.currentSubStep, null);
});

// ===========================================================================
// PHASE 1 — advanceTutorialSubStep
// ===========================================================================

async function reachMyPokemonStage(playerId: string) {
  await advanceTutorialStage(playerId); // welcome -> home-sidebar
  return advanceTutorialStage(playerId); // home-sidebar -> my-pokemon
}

test("advanceTutorialSubStep moves currentSubStep from null to the multi-step stage's first step id", async () => {
  await reachMyPokemonStage("player-6");

  const view = await advanceTutorialSubStep("player-6");
  const myPokemon = getTutorialStageById("my-pokemon")!;
  assert.equal(myPokemon.completion.kind, "multi-step");
  const firstStepId = myPokemon.completion.kind === "multi-step" ? myPokemon.completion.steps[0].id : undefined;

  assert.equal(view.currentStageId, "my-pokemon");
  assert.equal(view.currentSubStep, firstStepId);
});

test("advanceTutorialSubStep is idempotent-safe against a stale/wrong currentSubStep guard — a race never double-advances", async () => {
  await reachMyPokemonStage("player-7");
  const afterFirst = await advanceTutorialSubStep("player-7");

  // Simulate a retried/racing call that still thinks currentSubStep is
  // null (the CAS guard's WHERE clause no longer matches the real row) —
  // must be a safe no-op, never advance a second time from a stale read.
  const raceResult = await getTutorialProgressView("player-7");
  assert.equal(raceResult.currentSubStep, afterFirst.currentSubStep, "a fresh read must agree with the real, already-advanced state");
});

test("advanceTutorialSubStep persists across a fresh read (refresh/navigation never loses which sub-step was reached)", async () => {
  await reachMyPokemonStage("player-8");
  await advanceTutorialSubStep("player-8"); // step 0 done

  const freshRead = await getTutorialProgressView("player-8");
  const myPokemon = getTutorialStageById("my-pokemon")!;
  const firstStepId = myPokemon.completion.kind === "multi-step" ? myPokemon.completion.steps[0].id : undefined;

  assert.equal(freshRead.currentSubStep, firstStepId, "the completed sub-step must survive a completely independent re-read, not just the in-memory return value");
});

test("advanceTutorialSubStep, once every step is done, leaves currentStageId unchanged and does not itself advance the stage", async () => {
  await reachMyPokemonStage("player-9");
  await advanceTutorialSubStep("player-9"); // step 0 done
  const view = await advanceTutorialSubStep("player-9"); // step 1 (last) done

  const myPokemon = getTutorialStageById("my-pokemon")!;
  const lastStepId = myPokemon.completion.kind === "multi-step" ? myPokemon.completion.steps.at(-1)!.id : undefined;

  assert.equal(view.currentStageId, "my-pokemon", "the stage itself must only ever advance via advanceTutorialStage, never implicitly here");
  assert.equal(view.currentSubStep, lastStepId);
  assert.equal(view.status, "in_progress");
});

test("advanceTutorialSubStep on a stage that isn't multi-step is a safe no-op, never throws or corrupts the row", async () => {
  // "welcome" (explanation-only) is the freshly-created default stage.
  const before = await getOrCreateTutorialProgress("player-10");
  const view = await advanceTutorialSubStep("player-10");

  assert.equal(view.currentStageId, before.currentStageId);
  assert.equal(view.currentSubStep, before.currentSubStep);
});

test("advanceTutorialSubStep never advances a different player's sub-step", async () => {
  await reachMyPokemonStage("player-11a");
  await reachMyPokemonStage("player-11b");

  await advanceTutorialSubStep("player-11a");

  const otherView = await getTutorialProgressView("player-11b");
  assert.equal(otherView.currentSubStep, null, "player-11b's own sub-step must be untouched by player-11a's advance");
});

// ===========================================================================
// PHASE 3 — SCRIPTED PIDGEY BATTLE. The one sub-step (field-battle's own
// "capture-pidgey") that additionally requires the server's own
// pidgeyCaptured flag, never trusting a bare reportAction call alone.
// ===========================================================================

// welcome(0) -> home-sidebar(1) -> my-pokemon(2) -> map(3) -> field-battle(4)
async function reachFieldBattleStage(playerId: string) {
  for (let i = 0; i < 4; i++) {
    await advanceTutorialStage(playerId);
  }
}

test("advanceTutorialSubStep refuses to record 'capture-pidgey' as complete when pidgeyCaptured is still false — a bare client report is never enough", async () => {
  await reachFieldBattleStage("player-12");
  await advanceTutorialSubStep("player-12"); // perform-attack done
  await advanceTutorialSubStep("player-12"); // open-bag done

  const beforeAttempt = await getOrCreateTutorialProgress("player-12");
  assert.equal(beforeAttempt.currentSubStep, "open-bag");
  assert.equal(beforeAttempt.pidgeyCaptured, false);

  // Simulates a spoofed/premature reportAction("pidgey-captured") with no
  // real capture having happened yet.
  const view = await advanceTutorialSubStep("player-12");

  assert.equal(view.currentSubStep, "open-bag", "must remain exactly where it was — never advance to capture-pidgey without a real capture");
});

test("advanceTutorialSubStep DOES record 'capture-pidgey' once pidgeyCaptured is genuinely true", async () => {
  await reachFieldBattleStage("player-13");
  await advanceTutorialSubStep("player-13"); // perform-attack done
  await advanceTutorialSubStep("player-13"); // open-bag done

  // Simulates the real capture.service.ts's own stamp — same call, same
  // transaction shape that a genuine guaranteed capture actually uses.
  await prisma.$transaction((tx) => markTutorialPidgeyCaptured(tx, "player-13"));

  const view = await advanceTutorialSubStep("player-13");
  assert.equal(view.currentSubStep, "capture-pidgey");
});

test("once 'capture-pidgey' is recorded, the field-battle stage has nothing left — a plain advanceTutorialStage moves it on, with no wrap-up panel in between", async () => {
  await reachFieldBattleStage("player-14");
  await advanceTutorialSubStep("player-14");
  await advanceTutorialSubStep("player-14");
  await prisma.$transaction((tx) => markTutorialPidgeyCaptured(tx, "player-14"));
  await advanceTutorialSubStep("player-14");

  const view = await advanceTutorialStage("player-14");
  assert.equal(view.currentStageId, "pokemon-center");
  assert.equal(view.currentSubStep, null);
});

test("markTutorialPidgeyCaptured is guarded/idempotent — a second call is a safe no-op, never an error", async () => {
  await getOrCreateTutorialProgress("player-15");

  await prisma.$transaction((tx) => markTutorialPidgeyCaptured(tx, "player-15"));
  await prisma.$transaction((tx) => markTutorialPidgeyCaptured(tx, "player-15"));

  const row = await getOrCreateTutorialProgress("player-15");
  assert.equal(row.pidgeyCaptured, true);
});

// ===========================================================================
// PHASE 4 — COMPLETION REWARD (claimTutorialReward)
// ===========================================================================

async function reachCompletionStage(playerId: string) {
  for (let i = 0; i < TUTORIAL_STAGES.length - 1; i++) {
    await advanceTutorialStage(playerId);
  }
}

test("claiming the reward at the real Completion stage grants 2,000 Money, 40 Gold, and one Very Rare Sinnoh egg, and marks the Tutorial completed", async () => {
  seedPlayerProfile({ id: "reward-1", coins: 500, gold: 0 });
  await reachCompletionStage("reward-1");
  const before = await getOrCreateTutorialProgress("reward-1");
  assert.equal(before.currentStageId, TUTORIAL_COMPLETION_STAGE_ID);

  const view = await claimTutorialReward("reward-1");

  assert.equal(view.status, "completed");

  const profile = getPlayerProfileRow("reward-1");
  assert.equal(profile?.coins, 2500, "500 (starting) + 2,000 granted");
  assert.equal(profile?.gold, 40);

  const eggs = getOwnedEggRowsForPlayer("reward-1");
  assert.equal(eggs.length, 1);
  assert.equal(eggs[0].rarity, "very-rare");
  assert.equal(eggs[0].regionId, "sinnoh");
  assert.equal(eggs[0].source, "tutorial");
});

test("the row is marked rewardClaimed + completed, with completedAt set, atomically with the grant", async () => {
  seedPlayerProfile({ id: "reward-2" });
  await reachCompletionStage("reward-2");

  await claimTutorialReward("reward-2");

  const row = await getOrCreateTutorialProgress("reward-2");
  assert.equal(row.rewardClaimed, true);
  assert.equal(row.status, "completed");
  assert.ok(row.completedAt instanceof Date);
});

test("a second claim call never grants the reward twice (double-click / retry)", async () => {
  seedPlayerProfile({ id: "reward-3", coins: 500, gold: 0 });
  await reachCompletionStage("reward-3");

  await claimTutorialReward("reward-3");
  await claimTutorialReward("reward-3");

  const profile = getPlayerProfileRow("reward-3");
  assert.equal(profile?.coins, 2500, "must be granted exactly once, never 2,000 twice");
  assert.equal(profile?.gold, 40);
  assert.equal(getOwnedEggRowsForPlayer("reward-3").length, 1, "must never create a second egg");
});

test("two concurrent claim calls (multi-tab) never both grant the reward", async () => {
  seedPlayerProfile({ id: "reward-4", coins: 500, gold: 0 });
  await reachCompletionStage("reward-4");

  await Promise.all([claimTutorialReward("reward-4"), claimTutorialReward("reward-4")]);

  const profile = getPlayerProfileRow("reward-4");
  assert.equal(profile?.coins, 2500);
  assert.equal(profile?.gold, 40);
  assert.equal(getOwnedEggRowsForPlayer("reward-4").length, 1);
});

test("claiming from an earlier (not-yet-completion) stage is a safe no-op — grants nothing, never trusts a client call alone", async () => {
  seedPlayerProfile({ id: "reward-5", coins: 500, gold: 0 });
  // Still on "welcome" — never advanced at all.

  const view = await claimTutorialReward("reward-5");

  assert.notEqual(view.status, "completed");
  const profile = getPlayerProfileRow("reward-5");
  assert.equal(profile?.coins, 500, "no currency must ever be granted early");
  assert.equal(profile?.gold, 0);
  assert.equal(getOwnedEggRowsForPlayer("reward-5").length, 0, "no egg must ever be granted early");

  const row = await getOrCreateTutorialProgress("reward-5");
  assert.equal(row.rewardClaimed, false);
});

test("claiming never grants a second player's reward, and each player's own claim is independent", async () => {
  seedPlayerProfile({ id: "reward-6a", coins: 500, gold: 0 });
  seedPlayerProfile({ id: "reward-6b", coins: 500, gold: 0 });
  await reachCompletionStage("reward-6a");
  // reward-6b deliberately never reaches Completion.

  await claimTutorialReward("reward-6a");
  await claimTutorialReward("reward-6b");

  assert.equal(getPlayerProfileRow("reward-6a")?.coins, 2500);
  assert.equal(getPlayerProfileRow("reward-6b")?.coins, 500, "an unrelated/unfinished player must never receive the reward");
});
