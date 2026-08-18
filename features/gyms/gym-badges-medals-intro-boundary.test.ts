// GYM BADGES / MEDALS + GYM INTRO DIALOG — source-level boundary coverage
// for the victory-dialog Badge/Medal display and the Easy-Trainer-only
// intro dialog flow. This project has no React-render/DOM test harness
// (every existing Gym test is a plain node:test service/data check — see
// this repo's own established convention, e.g. the prior two tasks' own
// *-boundary.test.ts files), so these invariants are verified by reading
// the actual source text of the files this task changed.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const gymsContentSrc = fs.readFileSync("features/gyms/components/GymsContent.tsx", "utf8");
const gymIntroDialogSrc = fs.readFileSync("features/gyms/components/GymIntroDialog.tsx", "utf8");
const gymVictoryRewardDialogSrc = fs.readFileSync("features/gyms/components/GymVictoryRewardDialog.tsx", "utf8");

test("5: the Leader/Champion victory dialog shows the Badge image via the badge catalog's own imageUrl (the new numeric helper)", () => {
  assert.ok(gymVictoryRewardDialogSrc.includes("getGymBadgeDefinition"), "must read the badge catalog, never a hardcoded path");
  assert.ok(gymVictoryRewardDialogSrc.includes("imageUrl = medal?.imageUrl ?? badge?.imageUrl ?? "), "the displayed image must come from badge.imageUrl for a Gym Leader win");
  assert.ok(gymVictoryRewardDialogSrc.includes('src={imageUrl}'), "the resolved imageUrl must actually be rendered");
});

test("6: the Regional Champion victory dialog shows the Medal image via the medal catalog's own imageUrl (the new numeric helper)", () => {
  assert.ok(gymVictoryRewardDialogSrc.includes("getRegionalMedalDefinition"), "must read the medal catalog, never a hardcoded path");
  assert.ok(gymVictoryRewardDialogSrc.includes("medal?.imageUrl"), "the displayed image must come from medal.imageUrl for a Champion win");
});

test("8/9/10: clicking Easy routes through the intro dialog FIRST, never openSelection directly — no battle session can be created before the intro's own confirmEasyIntro", () => {
  assert.ok(gymsContentSrc.includes("function handleGymStart("), "there must be one single routing function for every Gym battle-slot click");
  // The Easy branch only ever sets state (opens the intro dialog) — it
  // must never call openSelection/startGymBattleAction directly, which is
  // the only path that can ever create a session.
  const easyBranchMatch = gymsContentSrc.match(/if \(battleSlot === "easy"\) \{\s*setEasyIntroTarget\(\{ regionId, gymNumber \}\);\s*return;\s*\}/);
  assert.ok(easyBranchMatch, "the Easy branch must ONLY open the intro dialog and return — no session-creating call");

  // confirmEasyIntro (only ever called from the intro dialog's own
  // onConfirm) is the ONE place that proceeds into the existing
  // party-selection/session-creation flow for Easy.
  assert.ok(gymsContentSrc.includes("function confirmEasyIntro() {"));
  assert.ok(gymsContentSrc.includes('battleSlot: "easy" };\n    setEasyIntroTarget(null);\n    openSelection(target);'), "confirming the intro must proceed into the existing openSelection flow, only after clearing the intro state");
});

test("11/12/13: Medium, Gym Leader, and Regional Champion never open the intro dialog — they call openSelection directly, unchanged", () => {
  // handleGymStart's non-easy path falls through to openSelection
  // directly, for medium AND leader alike (both reach this same "gym"
  // target branch since only "easy" gets the early return above).
  assert.ok(gymsContentSrc.includes('openSelection({ source: "gym", regionId, gymNumber, battleSlot });'), "Medium/Leader must fall through to the existing openSelection call, never the intro dialog");

  // The Regional Champion's own onStart prop is unchanged — it still
  // calls openSelection directly, never handleGymStart/the intro dialog.
  assert.ok(gymsContentSrc.includes('onStart={() => openSelection({ source: "regional-champion", regionId: region.regionId })}'), "the Champion row must keep calling openSelection directly, bypassing the intro dialog entirely");

  // GymIntroDialog itself is only ever mounted from ONE piece of state
  // (easyIntroTarget), which only the Easy branch above ever sets — so
  // it structurally cannot appear for Medium/Leader/Champion.
  const introRenderCount = gymsContentSrc.split("<GymIntroDialog").length - 1;
  assert.equal(introRenderCount, 1, "GymIntroDialog must be mounted from exactly one place, gated only by easyIntroTarget");
});

test("14: the intro dialog shows the correct Gym LEADER name (not the Easy trainer's own name)", () => {
  assert.ok(
    gymsContentSrc.includes('trainerName={getGymTrainerName(easyIntroTarget.regionId, easyIntroTarget.gymNumber, "leader")}'),
    "the intro dialog must represent the Gym Leader speaking, using the fixed Leader name for that Gym — never the Easy trainer's own name"
  );
});

test("15: the intro dialog shows the correct Gym representative character image, reusing the existing helper (no new image map)", () => {
  assert.ok(
    gymsContentSrc.includes("characterImageUrl={getGymCharacterImageUrl(easyIntroTarget.regionId, easyIntroTarget.gymNumber)}"),
    "the intro dialog must reuse getGymCharacterImageUrl — the same helper GymRow's own card image already uses — never a second image map"
  );
});

test("16: missing Badge/Medal/trainer images stay safe — every image in the victory and intro dialogs uses the project's fallback-aware SpriteImage with a fallbackClassName", () => {
  assert.ok(gymVictoryRewardDialogSrc.includes("import { SpriteImage }"), "the victory dialog must render its Badge/Medal image through SpriteImage");
  assert.ok(gymVictoryRewardDialogSrc.includes("fallbackClassName="), "the victory dialog's image must have a safe fallback for a not-yet-added file");
  assert.ok(gymIntroDialogSrc.includes("import { SpriteImage }"), "the intro dialog must render its character image through SpriteImage");
  assert.ok(gymIntroDialogSrc.includes("fallbackClassName="), "the intro dialog's image must have a safe fallback for a not-yet-added file");
});
