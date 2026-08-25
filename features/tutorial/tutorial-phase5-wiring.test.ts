// GAME TUTORIAL — PHASE 5: REPLAY. UI wiring checks (source-level — this
// project has no React-render/DOM harness, same established convention as
// tutorial-phase0/1/2/3/4-wiring.test.ts).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const contextSrc = readFileSync(new URL("./context/tutorial-context.tsx", import.meta.url), "utf8");
const panelSrc = readFileSync(new URL("./components/TutorialPanel.tsx", import.meta.url), "utf8");
const overlaySrc = readFileSync(new URL("./components/TutorialSpotlightOverlay.tsx", import.meta.url), "utf8");
const homeReplayEntrySrc = readFileSync(new URL("./components/HomeTutorialReplayEntry.tsx", import.meta.url), "utf8");
const battleContentSrc = readFileSync(new URL("../battle/components/BattleContent.tsx", import.meta.url), "utf8");
const shopSrc = readFileSync(new URL("../shop/components/ShopContent.tsx", import.meta.url), "utf8");
const pokemonCenterSrc = readFileSync(new URL("../pokemon-center/components/PokemonCenterContent.tsx", import.meta.url), "utf8");

test("TutorialProvider exposes mode/replayView/startReplay — a real, distinct replay state machine, not a repurposed live one", () => {
  assert.ok(contextSrc.includes('export type TutorialMode = "live" | "replay";'));
  assert.ok(contextSrc.includes('const [mode, setMode] = useState<TutorialMode>("live");'));
  assert.ok(contextSrc.includes("function startReplay()"));
});

test("startReplay never touches the real view/server — it only ever sets local replay state", () => {
  const fnBody = contextSrc.slice(contextSrc.indexOf("function startReplay()"), contextSrc.indexOf("function reportAction"));
  assert.ok(fnBody.includes('setMode("replay")'));
  assert.ok(fnBody.includes("setReplayStageIndex(REPLAY_FIRST_STAGE_INDEX)"));
  assert.ok(!fnBody.includes("setView("), "must never mutate the real, server-backed view");
  assert.ok(!fnBody.includes("Action()"), "must never call any real Server Action");
});

test("replayView is derived purely from local replay state via buildReplayProgressView — never from the real, server-backed view", () => {
  assert.match(contextSrc, /const replayView = mode === "replay" \? buildReplayProgressView\(replayStageIndex, replaySubStep\) : null;/);
});

test("advance()'s replay branch never calls a real Server Action — only local setState", () => {
  const fnBody = contextSrc.slice(contextSrc.indexOf("const advance = useCallback"), contextSrc.indexOf("// PHASE 5 — REPLAY. The replay-only counterpart"));
  const replayBranch = fnBody.slice(fnBody.indexOf('if (mode === "replay")'), fnBody.indexOf("startTransition(async () => {"));

  assert.ok(!replayBranch.includes("advanceTutorialStageAction"), "the replay branch must never call the real advance action");
  assert.ok(replayBranch.includes("setReplayStageIndex") || replayBranch.includes('setMode("live")'));
});

test("completeReplayTarget never calls advanceTutorialSubStepAction or any other real Server Action", () => {
  const fnBody = contextSrc.slice(
    contextSrc.indexOf("const completeReplayTarget = useCallback"),
    contextSrc.indexOf("// PHASE 1 — the one place a detected real event")
  );

  assert.ok(!fnBody.includes("advanceTutorialSubStepAction"));
  assert.ok(!fnBody.includes("advanceTutorialStageAction"));
  assert.ok(!fnBody.includes("claimTutorialRewardAction"));
  assert.ok(fnBody.includes("setReplaySubStep"));
});

test("claimTutorialRewardAction is never callable during replay — getReplayExplainingPanelDisplay coerces the Completion CTA to 'advance' before TutorialPanel ever routes to claimReward", () => {
  assert.ok(panelSrc.includes("getReplayExplainingPanelDisplay"));
  // The only place claimReward is ever invoked is the ctaKind === "claim-reward" branch,
  // which getReplayExplainingPanelDisplay's own registry-level test proves never
  // produces "claim-reward" during replay.
  assert.match(panelSrc, /ctaKind === "claim-reward"\s*\?\s*claimReward/);
});

test("postpone()'s replay branch never calls postponeTutorialAction — it only ever abandons the local replay walkthrough", () => {
  const fnBody = contextSrc.slice(contextSrc.indexOf("function postpone()"), contextSrc.indexOf("function resume()"));
  const replayBranch = fnBody.slice(fnBody.indexOf('if (mode === "replay")'), fnBody.indexOf("startTransition(async () => {"));

  assert.ok(!replayBranch.includes("postponeTutorialAction"));
  assert.ok(replayBranch.includes('setMode("live")'));
});

test("TutorialPanel shows the required 'הפעלה חוזרת — ללא פרס' banner while replaying, in both awaiting and explaining modes", () => {
  assert.equal((panelSrc.match(/הפעלה חוזרת — ללא פרס/g) ?? []).length, 2, "must appear in both the minimized banner and the full panel");
});

test("TutorialPanel's view.status === 'completed' guard is scoped to LIVE mode only — otherwise replay (which only ever starts once status is already 'completed') could never render at all", () => {
  assert.match(panelSrc, /if \(mode === "live" && view\.status === "completed"\) return null;/);
});

test("TutorialPanel picks its active view/target-resolution functions based on mode, reusing the exact same component for both live and replay", () => {
  assert.match(panelSrc, /const activeView = mode === "replay" \? replayView! : view;/);
  assert.match(panelSrc, /const getActiveTarget = mode === "replay" \? getReplayActiveTarget : getActiveTutorialTarget;/);
  assert.match(panelSrc, /const getPanelDisplay = mode === "replay" \? getReplayExplainingPanelDisplay : getExplainingPanelDisplay;/);
});

test("TutorialSpotlightOverlay resolves the replay-aware active target while replaying — the same overlay component, never duplicated", () => {
  assert.ok(overlaySrc.includes("getReplayActiveTarget"));
  assert.match(overlaySrc, /mode === "replay"/);
});

test("HomeTutorialReplayEntry shows 'הפעלה חוזרת' and calls startReplay, only while status is completed AND not already replaying — moved out of HomeTutorialCard by the later 'compact after completion' presentation change", () => {
  assert.ok(homeReplayEntrySrc.includes("הפעלה חוזרת"));
  assert.ok(homeReplayEntrySrc.includes("onClick={startReplay}"));
  assert.match(homeReplayEntrySrc, /if \(view\.status !== "completed" \|\| mode !== "live"\) return null;/);
});

test("real battle/shop/pokemon-center components never needed any Phase 5 changes — reportAction's own mode-aware guard (tested at the registry level) is what makes a coerced-to-manual target safe by construction", () => {
  // None of these three files reference the Tutorial's own replay
  // machinery (mode/replayView/startReplay/getReplayActiveTarget) — proof
  // they stayed completely unaware replay exists. (Not a bare "replay"
  // substring check — BattleContent.tsx has an unrelated pre-existing
  // comment using the plain English verb "replays".)
  for (const [name, src] of [
    ["BattleContent.tsx", battleContentSrc],
    ["ShopContent.tsx", shopSrc],
    ["PokemonCenterContent.tsx", pokemonCenterSrc],
  ] as const) {
    assert.ok(!/replayView|startReplay|getReplayActiveTarget|TutorialMode/.test(src), `${name} must stay entirely unaware replay exists`);
  }
});
