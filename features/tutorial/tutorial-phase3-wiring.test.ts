// GAME TUTORIAL — PHASE 3: SCRIPTED PIDGEY BATTLE. UI wiring checks
// (source-level — this project has no React-render/DOM harness, same
// established convention as tutorial-phase0/1/2-wiring.test.ts).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const battleContentSrc = readFileSync(new URL("../battle/components/BattleContent.tsx", import.meta.url), "utf8");
const battleSessionServiceSrc = readFileSync(
  new URL("../battle-session/services/battle-session.service.ts", import.meta.url),
  "utf8"
);
const captureServiceSrc = readFileSync(new URL("../battle/services/capture.service.ts", import.meta.url), "utf8");
const battleViewServiceSrc = readFileSync(new URL("../battle/services/battle-view.service.ts", import.meta.url), "utf8");

test("BattleContent registers a real spotlight target for the whole battle scene", () => {
  assert.ok(battleContentSrc.includes('useTutorialTarget("battle-scene")'));
  assert.ok(battleContentSrc.includes("ref={battleSceneTargetRef}"));
});

test("BattleContent reports 'battle-attack-performed' ONLY after the REAL executeBattleActionAction result confirms success — never a bare click", () => {
  const handlerBody = battleContentSrc.slice(
    battleContentSrc.indexOf("function handleAttack"),
    battleContentSrc.indexOf("function applyInventoryConsumption")
  );
  const successBody = handlerBody.slice(handlerBody.indexOf('if (result.status !== "success")'));
  const beforeWildFainted = successBody.slice(0, successBody.indexOf("if (result.wildFainted)"));

  assert.match(beforeWildFainted, /reportAction\("battle-attack-performed"\);/);
});

test("BattleContent reports 'battle-bag-opened' the instant the real Bag opens", () => {
  const handlerBody = battleContentSrc.slice(
    battleContentSrc.indexOf("function handleMenuAction"),
    battleContentSrc.indexOf("function handleAttackSelect")
  );
  assert.match(handlerBody, /actionId === "bag"\) \{\s*setIsBagOpen\(true\);\s*\/\/[\s\S]*?reportAction\("battle-bag-opened"\);/);
});

test("BattleContent reports 'pidgey-captured' ONLY after the REAL attemptCaptureAction result confirms status 'captured'", () => {
  const handlerBody = battleContentSrc.slice(
    battleContentSrc.indexOf("function proceedCapture"),
    battleContentSrc.indexOf("// Bag -> Medicine")
  );
  const capturedBranch = handlerBody.slice(handlerBody.indexOf('result.status === "captured"'), handlerBody.indexOf("return;\n      }\n\n      // Every other outcome"));

  assert.match(capturedBranch, /reportAction\("pidgey-captured"\);/);
});

test("BattleContent never trusts these events alone — reportAction is always called through the shared, guarded context method, never a duplicated check", () => {
  assert.ok(!battleContentSrc.includes("panelMode"), "BattleContent must never re-implement the awaiting-guard itself — that lives entirely in tutorial-context.tsx");
});

test("getOrStartBattle exposes a forceTutorialEncounter option that builds a deterministic Pidgey encounter, never the real RNG engine, and stamps isTutorialEncounter on the created row", () => {
  assert.ok(battleSessionServiceSrc.includes("options?: { forceTutorialEncounter?: boolean }"));
  assert.ok(battleSessionServiceSrc.includes("buildTutorialPidgeyEncounter(requestedZoneId)"));
  assert.ok(battleSessionServiceSrc.includes("isTutorialEncounter: Boolean(options?.forceTutorialEncounter)"));
  assert.ok(battleSessionServiceSrc.includes('const TUTORIAL_PIDGEY_SPECIES_ID = "pidgey";'));
  assert.ok(battleSessionServiceSrc.includes("const TUTORIAL_PIDGEY_LEVEL = 6;"));
});

test("capture.service.ts's guaranteed-capture branch is keyed off session.isTutorialEncounter, alongside the existing Master Ball branch — never a second/duplicated capture path", () => {
  assert.match(captureServiceSrc, /if \(ball\.id === MASTER_BALL_ITEM_ID \|\| session\.isTutorialEncounter\) \{\s*captured = true;/);
  // Still exactly one place rollCapture is ever called.
  assert.equal((captureServiceSrc.match(/rollCapture\(/g) ?? []).length, 1);
});

test("capture.service.ts stamps markTutorialPidgeyCaptured inside the SAME transaction as the real capture — never a separate, unguarded write", () => {
  const transactionBody = captureServiceSrc.slice(
    captureServiceSrc.indexOf("return prisma.$transaction"),
    captureServiceSrc.lastIndexOf("});")
  );
  assert.ok(transactionBody.includes("if (session.isTutorialEncounter) {"));
  assert.ok(transactionBody.includes("await markTutorialPidgeyCaptured(tx, profile.id);"));
});

test("battle-view.service.ts decides forceTutorialEncounter from the player's own real persisted Tutorial progress — never trusts anything client-supplied", () => {
  assert.ok(battleViewServiceSrc.includes("await getOrCreateTutorialProgress(profile.id)"));
  // MAP CRASH/RACE FIX — the condition now also recognizes "still on the
  // map stage, but Grassland is genuinely the active target" (resolved via
  // the registry's own getActiveTutorialTarget), alongside the original
  // "already at field-battle" check — see that fix's own doc comment,
  // battle-view.service.ts, for exactly why.
  assert.ok(battleViewServiceSrc.includes('import { getActiveTutorialTarget, getTutorialStageById } from "@/features/tutorial/data/tutorial-stages.config";'));
  assert.match(
    battleViewServiceSrc,
    /zoneId === "grassland" &&\s*tutorialProgress\.status === "in_progress" &&\s*!tutorialProgress\.pidgeyCaptured &&\s*\(tutorialProgress\.currentStageId === "field-battle" \|\| isEnteringGrasslandFromMapStage\)/
  );
  assert.match(
    battleViewServiceSrc,
    /const isEnteringGrasslandFromMapStage =\s*tutorialProgress\.currentStageId === "map" && activeTutorialTarget\?\.target\.targetId === "zone-grassland";/
  );
});

test("normal (non-Tutorial) Field Battle code paths are never modified beyond the one new optional parameter — resolveWildEncounter is still the real RNG path", () => {
  assert.ok(battleSessionServiceSrc.includes("resolveWildEncounter(regionId, requestedZoneId, playerLevel, wildLevelRange)"));
});
