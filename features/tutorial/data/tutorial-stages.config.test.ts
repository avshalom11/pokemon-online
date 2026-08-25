// GAME TUTORIAL — PHASE 0. Pure unit tests for the central stage registry —
// the one thing every other Tutorial surface (the service, the panel, the
// Home card) depends on being internally consistent.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildReplayProgressView,
  FIRST_TUTORIAL_STAGE_ID,
  getActiveTutorialTarget,
  getExplainingPanelDisplay,
  getNextReplayStageIndex,
  getNextTutorialStageId,
  getReplayActiveTarget,
  getReplayExplainingPanelDisplay,
  getTutorialStageById,
  getTutorialStageIndex,
  REPLAY_FIRST_STAGE_INDEX,
  TUTORIAL_COMPLETION_STAGE_ID,
  TUTORIAL_STAGES,
} from "@/features/tutorial/data/tutorial-stages.config";

test("the registry has exactly the 16 stages the product spec requires", () => {
  assert.equal(TUTORIAL_STAGES.length, 16);
});

test("every stage id is unique", () => {
  const ids = TUTORIAL_STAGES.map((stage) => stage.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("stages are declared in strict ascending order (0..15), matching their array position", () => {
  TUTORIAL_STAGES.forEach((stage, index) => {
    assert.equal(stage.order, index);
  });
});

test("Stage 1 (welcome) is first, and is the only stage that cannot be postponed", () => {
  assert.equal(TUTORIAL_STAGES[0].id, "welcome");
  assert.equal(TUTORIAL_STAGES[0].canPostpone, false);

  const everyOtherStage = TUTORIAL_STAGES.slice(1);
  assert.ok(everyOtherStage.every((stage) => stage.canPostpone === true), "every stage from Stage 2 onward must allow postponing");
});

test("every stage carries non-empty panel copy (title, body, ctaLabel)", () => {
  for (const stage of TUTORIAL_STAGES) {
    assert.ok(stage.panelCopy.title.length > 0, `${stage.id} must have a title`);
    assert.ok(stage.panelCopy.body.length > 0, `${stage.id} must have body copy`);
    assert.ok(stage.panelCopy.ctaLabel.length > 0, `${stage.id} must have a CTA label`);
  }
});

test("PHASE 3: explanation-only stages are exactly welcome and completion — every other stage (including field-battle, now scripted) has a real target", () => {
  const explanationOnlyIds = TUTORIAL_STAGES.filter((stage) => stage.completion.kind === "explanation-only").map(
    (stage) => stage.id
  );
  assert.deepEqual(explanationOnlyIds, ["welcome", "completion"]);
});

test("PHASE 1: every 'single'-completion stage carries a non-empty targetId and guidance", () => {
  for (const stage of TUTORIAL_STAGES) {
    if (stage.completion.kind !== "single") continue;
    assert.ok(stage.completion.target.targetId.length > 0, `${stage.id} must have a real targetId`);
    assert.ok(stage.completion.target.guidance.length > 0, `${stage.id} must have real guidance text`);
  }
});

test("PHASE 1: every 'multi-step' stage has at least 1 step, each with a real targetId/guidance and a unique step id", () => {
  for (const stage of TUTORIAL_STAGES) {
    if (stage.completion.kind !== "multi-step") continue;
    const { steps } = stage.completion;
    // NAVIGATION ORDER — a stage flagged explainAfterEntry (see that
    // flag's own doc comment, tutorial.types.ts) is only ever "multi-step"
    // to reuse the SAME step-completion machinery for showing its own
    // panelCopy after a real navigation, even when it has just the one
    // real target (Inventory, Daycare, Hatchery, Gyms, Leagues, Regions,
    // Profile) — every OTHER multi-step stage still needs at least 2 to
    // justify the kind at all.
    const minSteps = stage.explainAfterEntry ? 1 : 2;
    assert.ok(steps.length >= minSteps, `${stage.id} must have at least ${minSteps} step(s)`);

    const stepIds = steps.map((step) => step.id);
    assert.equal(new Set(stepIds).size, stepIds.length, `${stage.id}'s own step ids must be unique`);

    for (const step of steps) {
      assert.ok(step.target.targetId.length > 0, `${stage.id}/${step.id} must have a real targetId`);
      assert.ok(step.target.guidance.length > 0, `${stage.id}/${step.id} must have real guidance text`);
    }
  }
});

test("every route-based/scripted stage is multi-step; only home-sidebar and friends remain single", () => {
  const multiStepIds = TUTORIAL_STAGES.filter((stage) => stage.completion.kind === "multi-step").map((stage) => stage.id);
  assert.deepEqual(multiStepIds, [
    "my-pokemon",
    "map",
    "field-battle",
    "pokemon-center",
    "shop",
    "inventory",
    "daycare",
    "hatchery",
    "gyms",
    "leagues",
    "regions",
    "profile",
  ]);

  const singleIds = TUTORIAL_STAGES.filter((stage) => stage.completion.kind === "single").map((stage) => stage.id);
  assert.deepEqual(singleIds, ["home-sidebar", "friends"]);
});

// ===========================================================================
// NAVIGATION ORDER — navigate/highlight target first, THEN explain
// ===========================================================================

const EXPLAIN_AFTER_ENTRY_STAGE_IDS = [
  "my-pokemon",
  "map",
  "pokemon-center",
  "shop",
  "inventory",
  "daycare",
  "hatchery",
  "gyms",
  "leagues",
  "regions",
  "profile",
];

test("explainAfterEntry is set on exactly the 11 route-based stages this task requires, and on no others", () => {
  const flaggedIds = TUTORIAL_STAGES.filter((stage) => stage.explainAfterEntry === true).map((stage) => stage.id);
  assert.deepEqual(flaggedIds.sort(), [...EXPLAIN_AFTER_ENTRY_STAGE_IDS].sort());

  // Explicitly unchanged: welcome (Stage 1), home-sidebar, the scripted
  // field-battle, friends, and completion.
  for (const id of ["welcome", "home-sidebar", "field-battle", "friends", "completion"]) {
    assert.notEqual(getTutorialStageById(id)!.explainAfterEntry, true, `${id} must keep the original explain-first order`);
  }
});

test("every explainAfterEntry stage's own panelCopy is reachable only through getExplainingPanelDisplay's 'proceed' branch once step 0 fires — never as its own lead-in", () => {
  for (const id of EXPLAIN_AFTER_ENTRY_STAGE_IDS) {
    const stage = getTutorialStageById(id)!;
    assert.equal(stage.completion.kind, "multi-step");
    if (stage.completion.kind !== "multi-step") continue;

    // Before any step completes (currentSubStep null) — begin-awaiting the
    // FIRST step directly. getActiveTutorialTarget must return step 0
    // (the spotlight/guidance), and getExplainingPanelDisplay's own value
    // here is irrelevant, since TutorialProvider never shows "explaining"
    // for a flagged stage at subStep null (see tutorial-context.tsx's own
    // panelModeForCurrentProgress) — this test only proves the traversal
    // itself is untouched.
    const freshTarget = getActiveTutorialTarget({ currentStage: stage, currentSubStep: null });
    assert.equal(freshTarget?.target.targetId, stage.completion.steps[0].target.targetId);

    // The instant step 0 completes, the stage's OWN panelCopy is what
    // shows — not a "begin-awaiting" re-display of itself, and not
    // whatever step 1 (if any) would otherwise be.
    const firstStepId = stage.completion.steps[0].id;
    const display = getExplainingPanelDisplay({ currentStage: stage, currentSubStep: firstStepId });
    assert.equal(display.copy, stage.panelCopy);
    assert.equal(display.ctaKind, "proceed");
  }
});

test("replay shows the identical navigate-then-explain order for every explainAfterEntry stage — getReplayExplainingPanelDisplay never touches this branch", () => {
  for (const id of EXPLAIN_AFTER_ENTRY_STAGE_IDS) {
    const stage = getTutorialStageById(id)!;
    if (stage.completion.kind !== "multi-step") continue;

    const firstStepId = stage.completion.steps[0].id;
    const liveDisplay = getExplainingPanelDisplay({ currentStage: stage, currentSubStep: firstStepId });
    const replayDisplay = getReplayExplainingPanelDisplay({ currentStage: stage, currentSubStep: firstStepId });
    assert.equal(replayDisplay.copy, liveDisplay.copy);
    assert.equal(replayDisplay.ctaKind, liveDisplay.ctaKind);
  }
});

// ===========================================================================
// PHASE 2 — REAL ACTIONS (Pokémon Center heal, Shop Poké Ball purchase)
// ===========================================================================

test("pokemon-center: first step navigates to /pokemon-center, second step is the real 'pokemon-healed' action — no wrapUpPanelCopy", () => {
  const stage = getTutorialStageById("pokemon-center")!;
  assert.equal(stage.completion.kind, "multi-step");
  if (stage.completion.kind !== "multi-step") return;

  assert.equal(stage.completion.steps.length, 2);
  assert.deepEqual(stage.completion.steps[0].signal, { kind: "navigate", expectedPathname: "/pokemon-center" });
  assert.deepEqual(stage.completion.steps[1].signal, { kind: "action", actionId: "pokemon-healed" });
  assert.equal(stage.completion.wrapUpPanelCopy, undefined);
});

test("shop: first step navigates to /shop, second step is the real 'poke-ball-purchased' action — no wrapUpPanelCopy", () => {
  const stage = getTutorialStageById("shop")!;
  assert.equal(stage.completion.kind, "multi-step");
  if (stage.completion.kind !== "multi-step") return;

  assert.equal(stage.completion.steps.length, 2);
  assert.deepEqual(stage.completion.steps[0].signal, { kind: "navigate", expectedPathname: "/shop" });
  assert.deepEqual(stage.completion.steps[1].signal, { kind: "action", actionId: "poke-ball-purchased" });
  assert.equal(stage.completion.wrapUpPanelCopy, undefined);
});

test("getActiveTutorialTarget walks pokemon-center's two real steps in order, then has nothing left", () => {
  const pokemonCenter = getTutorialStageById("pokemon-center")!;

  const first = getActiveTutorialTarget({ currentStage: pokemonCenter, currentSubStep: null });
  assert.equal(first?.target.targetId, "sidebar-pokemon-center");

  const second = getActiveTutorialTarget({ currentStage: pokemonCenter, currentSubStep: "open-pokemon-center" });
  assert.equal(second?.target.targetId, "pokemon-center-heal-flow");
  assert.deepEqual(second?.signal, { kind: "action", actionId: "pokemon-healed" });

  const done = getActiveTutorialTarget({ currentStage: pokemonCenter, currentSubStep: "heal-starter" });
  assert.equal(done, null);
});

test("getActiveTutorialTarget walks shop's two real steps in order, then has nothing left", () => {
  const shop = getTutorialStageById("shop")!;

  const first = getActiveTutorialTarget({ currentStage: shop, currentSubStep: null });
  assert.equal(first?.target.targetId, "sidebar-shop");

  const second = getActiveTutorialTarget({ currentStage: shop, currentSubStep: "open-shop" });
  assert.equal(second?.target.targetId, "shop-purchase-flow");
  assert.deepEqual(second?.signal, { kind: "action", actionId: "poke-ball-purchased" });

  const done = getActiveTutorialTarget({ currentStage: shop, currentSubStep: "buy-poke-ball" });
  assert.equal(done, null);
});

test("getExplainingPanelDisplay: once pokemon-center/shop's steps are exhausted (no wrapUpPanelCopy), the fallback never crashes — TutorialContext is what actually skips this state (see completeActiveTarget)", () => {
  for (const id of ["pokemon-center", "shop"]) {
    const stage = getTutorialStageById(id)!;
    const lastStepId = stage.completion.kind === "multi-step" ? stage.completion.steps.at(-1)!.id : undefined;
    const display = getExplainingPanelDisplay({ currentStage: stage, currentSubStep: lastStepId ?? null });
    assert.ok(display.copy.title.length > 0);
  }
});

test("map's own multi-step stage has no wrapUpPanelCopy (its last step hands off straight into the next stage's own explanation)", () => {
  const map = getTutorialStageById("map")!;
  assert.equal(map.completion.kind, "multi-step");
  assert.ok(map.completion.kind === "multi-step" && !map.completion.wrapUpPanelCopy);
});

test("MAP COPY FIX: the Grassland zone is called 'אזור הדשא' everywhere in the Map stage's own copy — the old 'אזור המישור' wording is gone", () => {
  const map = getTutorialStageById("map")!;
  assert.ok(map.panelCopy.body.includes("אזור הדשא"));
  assert.ok(map.completion.kind === "multi-step");
  if (map.completion.kind !== "multi-step") return;
  const enterGrassland = map.completion.steps.find((step) => step.id === "enter-grassland")!;
  assert.ok(enterGrassland.target.guidance.includes("אזור הדשא"));

  for (const stage of TUTORIAL_STAGES) {
    assert.ok(!stage.panelCopy.title.includes("אזור המישור"), `${stage.id}'s title must not use the old wording`);
    assert.ok(!stage.panelCopy.body.includes("אזור המישור"), `${stage.id}'s body must not use the old wording`);
    if (stage.completion.kind === "multi-step") {
      for (const step of stage.completion.steps) {
        assert.ok(!step.target.guidance.includes("אזור המישור"), `${stage.id}/${step.id}'s guidance must not use the old wording`);
      }
    }
    if (stage.completion.kind === "single") {
      assert.ok(!stage.completion.target.guidance.includes("אזור המישור"), `${stage.id}'s guidance must not use the old wording`);
    }
  }
});

test("my-pokemon's own multi-step stage DOES define a wrapUpPanelCopy with real title/body/ctaLabel", () => {
  const myPokemon = getTutorialStageById("my-pokemon")!;
  assert.equal(myPokemon.completion.kind, "multi-step");
  assert.ok(myPokemon.completion.kind === "multi-step" && myPokemon.completion.wrapUpPanelCopy);
  const wrapUp = myPokemon.completion.kind === "multi-step" ? myPokemon.completion.wrapUpPanelCopy : undefined;
  assert.ok(wrapUp!.title.length > 0);
  assert.ok(wrapUp!.body.length > 0);
  assert.ok(wrapUp!.ctaLabel.length > 0);
});

test("the friends stage's signal is 'manual' — no real detectable event, matching 'do not require another player to exist or interact'", () => {
  const friends = getTutorialStageById("friends")!;
  assert.equal(friends.completion.kind, "single");
  assert.ok(friends.completion.kind === "single" && friends.completion.signal.kind === "manual");
});

test("getActiveTutorialTarget: explanation-only stages have no active target", () => {
  const view = { currentStage: getTutorialStageById("welcome")!, currentSubStep: null };
  assert.equal(getActiveTutorialTarget(view), null);
});

test("getActiveTutorialTarget: a 'single' stage's active target is always its own target/signal", () => {
  const view = { currentStage: getTutorialStageById("home-sidebar")!, currentSubStep: null };
  const active = getActiveTutorialTarget(view);
  assert.equal(active?.target.targetId, "sidebar-opener");
  assert.equal(active?.signal.kind, "action");
});

test("getActiveTutorialTarget: a 'multi-step' stage starts at step 0 when currentSubStep is null, then advances by step id", () => {
  const myPokemon = getTutorialStageById("my-pokemon")!;

  const first = getActiveTutorialTarget({ currentStage: myPokemon, currentSubStep: null });
  assert.equal(first?.target.targetId, "sidebar-team");

  const second = getActiveTutorialTarget({ currentStage: myPokemon, currentSubStep: "open-my-pokemon" });
  assert.equal(second?.target.targetId, "my-pokemon-party-section");

  const done = getActiveTutorialTarget({ currentStage: myPokemon, currentSubStep: "open-starter-details" });
  assert.equal(done, null, "once every step is done there is nothing left to spotlight");
});

test("getExplainingPanelDisplay: explanation-only always advances directly", () => {
  const display = getExplainingPanelDisplay({ currentStage: getTutorialStageById("welcome")!, currentSubStep: null });
  assert.equal(display.ctaKind, "advance");
  assert.equal(display.copy.title, getTutorialStageById("welcome")!.panelCopy.title);
});

test("getExplainingPanelDisplay: a 'single'/'multi-step' stage's own lead-in panel begins awaiting, never advances directly", () => {
  const homeSidebar = getExplainingPanelDisplay({ currentStage: getTutorialStageById("home-sidebar")!, currentSubStep: null });
  assert.equal(homeSidebar.ctaKind, "begin-awaiting");

  const myPokemonLeadIn = getExplainingPanelDisplay({ currentStage: getTutorialStageById("my-pokemon")!, currentSubStep: null });
  assert.equal(myPokemonLeadIn.ctaKind, "begin-awaiting");
});

test("getExplainingPanelDisplay: my-pokemon shows its wrapUpPanelCopy (with an 'advance' CTA) once every step is done", () => {
  const myPokemon = getTutorialStageById("my-pokemon")!;
  const display = getExplainingPanelDisplay({ currentStage: myPokemon, currentSubStep: "open-starter-details" });

  assert.equal(display.ctaKind, "advance");
  assert.ok(myPokemon.completion.kind === "multi-step");
  assert.equal(display.copy, myPokemon.completion.kind === "multi-step" ? myPokemon.completion.wrapUpPanelCopy : undefined);
});

test("FIRST_TUTORIAL_STAGE_ID matches the registry's first entry", () => {
  assert.equal(FIRST_TUTORIAL_STAGE_ID, TUTORIAL_STAGES[0].id);
});

test("getTutorialStageById resolves a real stage, and returns undefined for an unknown id", () => {
  assert.equal(getTutorialStageById("welcome")?.id, "welcome");
  assert.equal(getTutorialStageById("completion")?.id, "completion");
  assert.equal(getTutorialStageById("no-such-stage"), undefined);
});

test("getTutorialStageIndex returns each stage's real array position, and -1 for an unknown id", () => {
  assert.equal(getTutorialStageIndex("welcome"), 0);
  assert.equal(getTutorialStageIndex("completion"), TUTORIAL_STAGES.length - 1);
  assert.equal(getTutorialStageIndex("no-such-stage"), -1);
});

test("getNextTutorialStageId walks the registry forward, and returns null from the last stage", () => {
  assert.equal(getNextTutorialStageId("welcome"), TUTORIAL_STAGES[1].id);
  assert.equal(getNextTutorialStageId("completion"), null, "the last stage has no next stage");
  assert.equal(getNextTutorialStageId("no-such-stage"), null, "an unknown stage id must never throw or resolve to a stage");
});

// ===========================================================================
// PHASE 3 — SCRIPTED PIDGEY BATTLE
// ===========================================================================

test("field-battle has exactly 3 real steps in order: attack, bag, capture — matching this task's own required sequence", () => {
  const stage = getTutorialStageById("field-battle")!;
  assert.equal(stage.completion.kind, "multi-step");
  if (stage.completion.kind !== "multi-step") return;

  assert.deepEqual(
    stage.completion.steps.map((step) => step.id),
    ["perform-attack", "open-bag", "capture-pidgey"]
  );
  assert.deepEqual(stage.completion.steps[0].signal, { kind: "action", actionId: "battle-attack-performed" });
  assert.deepEqual(stage.completion.steps[1].signal, { kind: "action", actionId: "battle-bag-opened" });
  assert.deepEqual(stage.completion.steps[2].signal, { kind: "action", actionId: "pidgey-captured" });
  assert.equal(stage.completion.wrapUpPanelCopy, undefined, "capture succeeding is itself the confirmation — no extra panel before advancing");
});

test("field-battle's first step (attack) carries an explainAfter panel — the required 'capture chance + switching' explanation", () => {
  const stage = getTutorialStageById("field-battle")!;
  assert.equal(stage.completion.kind, "multi-step");
  if (stage.completion.kind !== "multi-step") return;

  const attackStep = stage.completion.steps[0];
  assert.ok(attackStep.explainAfter, "must explain capture chance right after the real attack");
  assert.ok(attackStep.explainAfter!.body.includes("לתפוס"), "must mention capture chance");
  assert.ok(attackStep.explainAfter!.body.includes("להחליף"), "must explain switching, even though it is never required");

  // The bag/capture steps have nothing to explain in between.
  assert.equal(stage.completion.steps[1].explainAfter, undefined);
  assert.equal(stage.completion.steps[2].explainAfter, undefined);
});

test("getActiveTutorialTarget walks field-battle's three real steps in order, then has nothing left", () => {
  const fieldBattle = getTutorialStageById("field-battle")!;

  const first = getActiveTutorialTarget({ currentStage: fieldBattle, currentSubStep: null });
  assert.deepEqual(first?.signal, { kind: "action", actionId: "battle-attack-performed" });

  const second = getActiveTutorialTarget({ currentStage: fieldBattle, currentSubStep: "perform-attack" });
  assert.deepEqual(second?.signal, { kind: "action", actionId: "battle-bag-opened" });

  const third = getActiveTutorialTarget({ currentStage: fieldBattle, currentSubStep: "open-bag" });
  assert.deepEqual(third?.signal, { kind: "action", actionId: "pidgey-captured" });

  const done = getActiveTutorialTarget({ currentStage: fieldBattle, currentSubStep: "capture-pidgey" });
  assert.equal(done, null);
});

test("getExplainingPanelDisplay shows the attack step's explainAfter panel with a 'proceed' CTA right after it completes", () => {
  const fieldBattle = getTutorialStageById("field-battle")!;
  const display = getExplainingPanelDisplay({ currentStage: fieldBattle, currentSubStep: "perform-attack" });

  assert.equal(display.ctaKind, "proceed");
  assert.equal(display.copy, fieldBattle.completion.kind === "multi-step" ? fieldBattle.completion.steps[0].explainAfter : undefined);
});

test("getExplainingPanelDisplay never shows anything for the bag/capture steps completing (no explainAfter, no wrapUpPanelCopy — TutorialContext skips straight through)", () => {
  const fieldBattle = getTutorialStageById("field-battle")!;

  const afterBag = getExplainingPanelDisplay({ currentStage: fieldBattle, currentSubStep: "open-bag" });
  assert.notEqual(afterBag.ctaKind, "proceed", "the bag step has no explainAfter to show");

  const afterCapture = getExplainingPanelDisplay({ currentStage: fieldBattle, currentSubStep: "capture-pidgey" });
  assert.notEqual(afterCapture.ctaKind, "proceed", "the capture step has no explainAfter to show either");
});

// ===========================================================================
// PHASE 4 — COMPLETION REWARD
// ===========================================================================

test("TUTORIAL_COMPLETION_STAGE_ID matches the registry's own last stage id", () => {
  assert.equal(TUTORIAL_COMPLETION_STAGE_ID, "completion");
  assert.equal(TUTORIAL_STAGES.at(-1)!.id, TUTORIAL_COMPLETION_STAGE_ID);
});

test("the completion stage's CTA label is the real 'קבל את הפרס' button text this task requires", () => {
  const stage = getTutorialStageById(TUTORIAL_COMPLETION_STAGE_ID)!;
  assert.equal(stage.panelCopy.ctaLabel, "קבל את הפרס");
});

test("getExplainingPanelDisplay routes the completion stage's own lead-in panel to 'claim-reward' — never plain 'advance'", () => {
  const stage = getTutorialStageById(TUTORIAL_COMPLETION_STAGE_ID)!;
  const display = getExplainingPanelDisplay({ currentStage: stage, currentSubStep: null });

  assert.equal(display.ctaKind, "claim-reward");
  assert.equal(display.copy, stage.panelCopy);
});

test("getExplainingPanelDisplay never routes any OTHER explanation-only stage to 'claim-reward'", () => {
  const otherExplanationOnlyStages = TUTORIAL_STAGES.filter(
    (stage) => stage.completion.kind === "explanation-only" && stage.id !== TUTORIAL_COMPLETION_STAGE_ID
  );
  assert.ok(otherExplanationOnlyStages.length > 0, "sanity: there must be at least one other explanation-only stage (welcome)");

  for (const stage of otherExplanationOnlyStages) {
    const display = getExplainingPanelDisplay({ currentStage: stage, currentSubStep: null });
    assert.equal(display.ctaKind, "advance", `${stage.id} must still just advance, never claim a reward`);
  }
});

// ===========================================================================
// PHASE 5 — REPLAY
// ===========================================================================

// Collects every {stageId, stepId | null, targetId} tuple that is marked
// skipInReplay: true, walking every stage's own completion shape generically
// (never hardcoded against today's specific stage ids) — a future stage
// that adds its own skipInReplay target is automatically covered by every
// test below without needing an update here.
function collectSkipInReplayTargets(): Array<{ stageId: string; stepId: string | null; targetId: string }> {
  const found: Array<{ stageId: string; stepId: string | null; targetId: string }> = [];
  for (const stage of TUTORIAL_STAGES) {
    if (stage.completion.kind === "single" && stage.completion.target.skipInReplay) {
      found.push({ stageId: stage.id, stepId: null, targetId: stage.completion.target.targetId });
    }
    if (stage.completion.kind === "multi-step") {
      for (const step of stage.completion.steps) {
        if (step.target.skipInReplay) {
          found.push({ stageId: stage.id, stepId: step.id, targetId: step.target.targetId });
        }
      }
    }
  }
  return found;
}

test("skipInReplay is set on exactly the 6 real-mutation targets this task's own spec forbids replaying: Grassland entry, all 3 Field Battle steps, healing, and the Poké Ball purchase", () => {
  const found = collectSkipInReplayTargets().map(({ stageId, stepId }) => `${stageId}/${stepId ?? "single"}`);

  assert.deepEqual(
    found.sort(),
    [
      "field-battle/capture-pidgey",
      "field-battle/open-bag",
      "field-battle/perform-attack",
      "map/enter-grassland",
      "pokemon-center/heal-starter",
      "shop/buy-poke-ball",
    ].sort()
  );
});

test("every harmless navigate/action target (map's own first step, my-pokemon, home-sidebar, pokemon-center/shop's own first step, every plain navigate stage) is NOT skipInReplay — replay keeps normal navigation/spotlight behavior for these", () => {
  const skipTargetIds = new Set(collectSkipInReplayTargets().map((entry) => entry.targetId));

  assert.ok(!skipTargetIds.has("sidebar-opener"));
  assert.ok(!skipTargetIds.has("sidebar-team"));
  assert.ok(!skipTargetIds.has("my-pokemon-party-section"));
  assert.ok(!skipTargetIds.has("sidebar-map"));
  assert.ok(!skipTargetIds.has("sidebar-pokemon-center"));
  assert.ok(!skipTargetIds.has("sidebar-shop"));
  assert.ok(!skipTargetIds.has("sidebar-inventory"));
  assert.ok(!skipTargetIds.has("sidebar-daycare"));
  assert.ok(!skipTargetIds.has("sidebar-hatchery"));
  assert.ok(!skipTargetIds.has("sidebar-gyms"));
  assert.ok(!skipTargetIds.has("sidebar-leagues"));
  assert.ok(!skipTargetIds.has("sidebar-world"));
  assert.ok(!skipTargetIds.has("sidebar-profile"));
  assert.ok(!skipTargetIds.has("friends-bar"));
});

test("getReplayActiveTarget coerces a skipInReplay target's real signal to 'manual' — the same target/guidance, but never requiring the real action", () => {
  const fieldBattle = getTutorialStageById("field-battle")!;
  const real = getActiveTutorialTarget({ currentStage: fieldBattle, currentSubStep: null });
  const replay = getReplayActiveTarget({ currentStage: fieldBattle, currentSubStep: null });

  assert.equal(real?.signal.kind, "action", "sanity: the real signal must still require the real battle-attack-performed action");
  assert.equal(replay?.signal.kind, "manual", "replay must never require the real action");
  assert.equal(replay?.target.targetId, real?.target.targetId, "the same target — spotlight/guidance behavior is otherwise unchanged");
  assert.equal(replay?.target.guidance, real?.target.guidance);
});

test("getReplayActiveTarget leaves a harmless (non-skipInReplay) target's real signal completely untouched", () => {
  const homeSidebar = getTutorialStageById("home-sidebar")!;
  const real = getActiveTutorialTarget({ currentStage: homeSidebar, currentSubStep: null });
  const replay = getReplayActiveTarget({ currentStage: homeSidebar, currentSubStep: null });

  assert.deepEqual(replay, real, "a harmless target must behave identically in replay and live — this task's own 'keep normal navigation/spotlight behavior' rule");
});

test("getReplayActiveTarget also coerces a navigate-kind skipInReplay target (Map's own enter-grassland) to manual — never requires the real navigation into a live battle", () => {
  const map = getTutorialStageById("map")!;
  const replay = getReplayActiveTarget({ currentStage: map, currentSubStep: "open-map" });

  assert.equal(replay?.target.targetId, "zone-grassland");
  assert.equal(replay?.signal.kind, "manual");
});

test("getReplayExplainingPanelDisplay coerces the Completion stage's own 'claim-reward' CTA to 'advance' — replay never claims the already-claimed reward again", () => {
  const completion = getTutorialStageById(TUTORIAL_COMPLETION_STAGE_ID)!;
  const real = getExplainingPanelDisplay({ currentStage: completion, currentSubStep: null });
  const replay = getReplayExplainingPanelDisplay({ currentStage: completion, currentSubStep: null });

  assert.equal(real.ctaKind, "claim-reward", "sanity: the real CTA must still claim the reward for a live playthrough");
  assert.equal(replay.ctaKind, "advance");
  assert.equal(replay.copy, real.copy, "the exact same panel copy is shown either way — only what the CTA DOES differs");
});

test("getReplayExplainingPanelDisplay leaves every other stage's display completely untouched", () => {
  for (const stage of TUTORIAL_STAGES) {
    if (stage.id === TUTORIAL_COMPLETION_STAGE_ID) continue;
    const real = getExplainingPanelDisplay({ currentStage: stage, currentSubStep: null });
    const replay = getReplayExplainingPanelDisplay({ currentStage: stage, currentSubStep: null });
    assert.deepEqual(replay, real, `${stage.id}'s own display must be identical in replay and live`);
  }
});

test("buildReplayProgressView derives a real, fully-formed view purely from a stage index — matching TUTORIAL_STAGES exactly", () => {
  const view = buildReplayProgressView(2, "some-sub-step");

  assert.equal(view.currentStage, TUTORIAL_STAGES[2]);
  assert.equal(view.currentSubStep, "some-sub-step");
  assert.equal(view.stageIndex, 2);
  assert.equal(view.totalStages, TUTORIAL_STAGES.length);
  assert.equal(view.isLastStage, false);
});

test("buildReplayProgressView correctly identifies the last stage", () => {
  const view = buildReplayProgressView(TUTORIAL_STAGES.length - 1, null);
  assert.equal(view.isLastStage, true);
});

test("REPLAY_FIRST_STAGE_INDEX is the registry's own first stage (0) — replay always starts from Stage 1, exactly like a live playthrough", () => {
  assert.equal(REPLAY_FIRST_STAGE_INDEX, 0);
});

test("getNextReplayStageIndex walks the registry forward by plain index, and returns null from the last stage", () => {
  assert.equal(getNextReplayStageIndex(0), 1);
  assert.equal(getNextReplayStageIndex(TUTORIAL_STAGES.length - 2), TUTORIAL_STAGES.length - 1);
  assert.equal(getNextReplayStageIndex(TUTORIAL_STAGES.length - 1), null);
});

// GUIDE CHARACTER IMAGES — exactly the 4 checkpoints from this task's own
// spec, wired entirely through panelCopy.guideImage (data, not a hardcoded
// per-stage-id check in the component).
test("guideImage is set on exactly the 4 required checkpoint stages, pointing at the real files under public/images/tutorial/", () => {
  const withImage = TUTORIAL_STAGES.filter((stage) => stage.panelCopy.guideImage !== undefined).map((stage) => ({
    id: stage.id,
    guideImage: stage.panelCopy.guideImage,
  }));

  assert.deepEqual(withImage, [
    { id: "welcome", guideImage: "/images/tutorial/Oak1.png" },
    { id: "pokemon-center", guideImage: "/images/tutorial/Oak2.png" },
    { id: "gyms", guideImage: "/images/tutorial/Oak3.png" },
    { id: "completion", guideImage: "/images/tutorial/Oak4.png" },
  ]);
});

test("every other stage's panelCopy has no guideImage at all", () => {
  const checkpointIds = new Set(["welcome", "pokemon-center", "gyms", "completion"]);
  for (const stage of TUTORIAL_STAGES) {
    if (checkpointIds.has(stage.id)) continue;
    assert.equal(stage.panelCopy.guideImage, undefined, `${stage.id} must not have a guideImage`);
  }
});

test("pokemon-center's own panelCopy (Oak2) is exactly the panel getExplainingPanelDisplay shows once the player actually navigates to /pokemon-center (explainAfterEntry's own step-0 branch) — field-battle's last step (capture-pidgey) hands off into it with no wrapUpPanelCopy/explainAfter of its own in between", () => {
  const fieldBattle = getTutorialStageById("field-battle")!;
  assert.equal(fieldBattle.completion.kind, "multi-step");
  if (fieldBattle.completion.kind === "multi-step") {
    const lastStep = fieldBattle.completion.steps[fieldBattle.completion.steps.length - 1];
    assert.equal(lastStep.id, "capture-pidgey");
    assert.equal(lastStep.explainAfter, undefined);
    assert.equal(fieldBattle.completion.wrapUpPanelCopy, undefined);
  }

  const pokemonCenter = getTutorialStageById("pokemon-center")!;
  assert.equal(pokemonCenter.explainAfterEntry, true);
  assert.equal(pokemonCenter.completion.kind, "multi-step");
  if (pokemonCenter.completion.kind !== "multi-step") return;
  const firstStepId = pokemonCenter.completion.steps[0].id;

  const display = getExplainingPanelDisplay({ currentStage: pokemonCenter, currentSubStep: firstStepId });
  assert.equal(display.copy.guideImage, "/images/tutorial/Oak2.png");
});

test("gyms' own panelCopy (Oak3) is exactly the panel getExplainingPanelDisplay shows once the player actually navigates to /gyms (explainAfterEntry's own step-0 branch), immediately following Hatchery in registry order", () => {
  const hatcheryIndex = getTutorialStageIndex("hatchery");
  const gymsIndex = getTutorialStageIndex("gyms");
  assert.equal(gymsIndex, hatcheryIndex + 1, "gyms must immediately follow hatchery in registry order");

  const gyms = getTutorialStageById("gyms")!;
  assert.equal(gyms.explainAfterEntry, true);
  assert.equal(gyms.completion.kind, "multi-step");
  if (gyms.completion.kind !== "multi-step") return;
  const firstStepId = gyms.completion.steps[0].id;

  const display = getExplainingPanelDisplay({ currentStage: gyms, currentSubStep: firstStepId });
  assert.equal(display.copy.guideImage, "/images/tutorial/Oak3.png");
});

test("replay shows the exact same 4 checkpoint images at the exact same stages — getReplayExplainingPanelDisplay never strips or substitutes guideImage", () => {
  for (const id of ["welcome", "pokemon-center", "gyms", "completion"]) {
    const stage = getTutorialStageById(id)!;
    const liveDisplay = getExplainingPanelDisplay({ currentStage: stage, currentSubStep: null });
    const replayDisplay = getReplayExplainingPanelDisplay({ currentStage: stage, currentSubStep: null });
    assert.equal(replayDisplay.copy.guideImage, liveDisplay.copy.guideImage);
    assert.equal(replayDisplay.copy.guideImage, stage.panelCopy.guideImage);
  }
});
