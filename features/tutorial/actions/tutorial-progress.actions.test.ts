// GAME TUTORIAL — PHASE 0. Behavioral tests through the real Server Actions
// (session -> profile -> service -> fake DB), same "real service, fake DB,
// real actions" convention this codebase's other action-layer tests already
// use (see e.g. features/move-learning/actions/move-learning.actions.ts's
// own callers being exercised via move-learning-ux.test.ts).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import {
  advanceTutorialStageAction,
  advanceTutorialSubStepAction,
  claimTutorialRewardAction,
  postponeTutorialAction,
  resumeTutorialAction,
  startTutorialAction,
} from "@/features/tutorial/actions/tutorial-progress.actions";
import { getTutorialStageById, TUTORIAL_STAGES } from "@/features/tutorial/data/tutorial-stages.config";
import { __setSession } from "../../../test/support/fakes/auth-session.fake.ts";
import { getOwnedEggRowsForPlayer, getPlayerProfileRow, resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  __setSession({ user: { id: "session-player" } });
});

test("startTutorialAction resolves the caller's own session/profile and returns their current view", async () => {
  const result = await startTutorialAction();

  assert.equal(result.status, "ok");
  assert.equal(result.status === "ok" ? result.view.currentStageId : null, "welcome");
  assert.equal(result.status === "ok" ? result.view.status : null, "not_started");
});

test("every action rejects with status 'error' when there is no session — never a player id trusted from the client", async () => {
  __setSession(null);

  const results = await Promise.all([
    startTutorialAction(),
    advanceTutorialStageAction(),
    advanceTutorialSubStepAction(),
    claimTutorialRewardAction(),
    postponeTutorialAction(),
    resumeTutorialAction(),
  ]);

  for (const result of results) {
    assert.equal(result.status, "error");
  }
});

test("advanceTutorialSubStepAction advances exactly the caller's own sub-step, resolved from the session", async () => {
  await advanceTutorialStageAction(); // welcome -> home-sidebar
  await advanceTutorialStageAction(); // home-sidebar -> my-pokemon

  const result = await advanceTutorialSubStepAction();
  const myPokemon = getTutorialStageById("my-pokemon")!;
  const firstStepId = myPokemon.completion.kind === "multi-step" ? myPokemon.completion.steps[0].id : undefined;

  assert.equal(result.status, "ok");
  assert.equal(result.status === "ok" ? result.view.currentStageId : null, "my-pokemon");
  assert.equal(result.status === "ok" ? result.view.currentSubStep : null, firstStepId);
});

test("advanceTutorialStageAction advances exactly the caller's own progress, resolved from the session — never a client-supplied player id", async () => {
  const result = await advanceTutorialStageAction();

  assert.equal(result.status, "ok");
  assert.equal(result.status === "ok" ? result.view.currentStageId : null, TUTORIAL_STAGES[1].id);
  assert.equal(result.status === "ok" ? result.view.status : null, "in_progress");
});

test("postponeTutorialAction and resumeTutorialAction both re-confirm the authoritative server state without mutating it", async () => {
  await advanceTutorialStageAction();

  const postponed = await postponeTutorialAction();
  const resumed = await resumeTutorialAction();

  assert.equal(postponed.status, "ok");
  assert.equal(resumed.status, "ok");
  assert.equal(postponed.status === "ok" ? postponed.view.currentStageId : null, TUTORIAL_STAGES[1].id);
  assert.equal(resumed.status === "ok" ? resumed.view.currentStageId : null, TUTORIAL_STAGES[1].id);
});

test("two different sessions never see or affect each other's progress", async () => {
  __setSession({ user: { id: "player-alpha" } });
  await advanceTutorialStageAction();

  __setSession({ user: { id: "player-beta" } });
  const betaView = await startTutorialAction();

  assert.equal(betaView.status === "ok" ? betaView.view.currentStageId : null, "welcome");
  assert.equal(betaView.status === "ok" ? betaView.view.status : null, "not_started");
});

// ===========================================================================
// PHASE 4 — COMPLETION REWARD (claimTutorialRewardAction)
// ===========================================================================

async function reachCompletionStage() {
  for (let i = 0; i < TUTORIAL_STAGES.length - 1; i++) {
    await advanceTutorialStageAction();
  }
}

test("claimTutorialRewardAction grants the real reward to exactly the caller's own session, resolved server-side", async () => {
  seedPlayerProfile({ id: "session-player", coins: 500, gold: 0 });
  await reachCompletionStage();

  const result = await claimTutorialRewardAction();

  assert.equal(result.status, "ok");
  assert.equal(result.status === "ok" ? result.view.status : null, "completed");

  const profile = getPlayerProfileRow("session-player");
  assert.equal(profile?.coins, 2500);
  assert.equal(profile?.gold, 40);
  assert.equal(getOwnedEggRowsForPlayer("session-player").length, 1);
});

test("two concurrent claimTutorialRewardAction calls for the same session (double-click / multi-tab) never grant the reward twice", async () => {
  seedPlayerProfile({ id: "session-player", coins: 500, gold: 0 });
  await reachCompletionStage();

  const [first, second] = await Promise.all([claimTutorialRewardAction(), claimTutorialRewardAction()]);

  assert.equal(first.status, "ok");
  assert.equal(second.status, "ok");

  const profile = getPlayerProfileRow("session-player");
  assert.equal(profile?.coins, 2500, "never 4,000 — the reward must never be granted twice");
  assert.equal(profile?.gold, 40);
  assert.equal(getOwnedEggRowsForPlayer("session-player").length, 1);
});
