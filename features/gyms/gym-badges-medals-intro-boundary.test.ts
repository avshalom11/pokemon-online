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
const gymChampionIntroDialogSrc = fs.readFileSync("features/gyms/components/GymChampionIntroDialog.tsx", "utf8");
const gymVictoryRewardDialogSrc = fs.readFileSync("features/gyms/components/GymVictoryRewardDialog.tsx", "utf8");

test("MEDAL IMAGE SIZE: the victory dialog shows the Regional Medal image slightly larger than a Gym Badge (h-28 w-28 vs the unchanged h-24 w-24), never affecting dialog text/logic/rewards", () => {
  assert.ok(
    gymVictoryRewardDialogSrc.includes('isChampion ? "h-28 w-28 object-contain" : "h-24 w-24 object-contain"'),
    "only the Champion (Medal) branch may be enlarged, Leader (Badge) stays h-24 w-24"
  );
});

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

test("11/12: Medium and Gym Leader never open ANY intro dialog — they call openSelection directly, unchanged", () => {
  // handleGymStart's non-easy path falls through to openSelection
  // directly, for medium AND leader alike (both reach this same "gym"
  // target branch since only "easy" gets the early return above).
  assert.ok(gymsContentSrc.includes('openSelection({ source: "gym", regionId, gymNumber, battleSlot });'), "Medium/Leader must fall through to the existing openSelection call, never any intro dialog");

  // GymIntroDialog itself is only ever mounted from ONE piece of state
  // (easyIntroTarget), which only the Easy branch above ever sets — so
  // it structurally cannot appear for Medium/Leader/Champion.
  const introRenderCount = gymsContentSrc.split("<GymIntroDialog").length - 1;
  assert.equal(introRenderCount, 1, "GymIntroDialog must be mounted from exactly one place, gated only by easyIntroTarget");
});

// REGIONAL CHAMPION — INTRO + VICTORY DIALOG POLISH (later task) — this
// supersedes this file's own former "13" assertion (the Champion row used
// to call openSelection directly, bypassing any intro entirely). That is
// now deliberately no longer true: the Champion row opens its OWN dedicated
// intro dialog (GymChampionIntroDialog, never GymIntroDialog — the two stay
// completely separate components/states) first, exactly like Easy already
// does for Gym battles, and only proceeds into openSelection after the
// player's own explicit אישור there.
test("13 (superseded): Regional Champion now opens its own dedicated intro dialog first — never openSelection directly, never GymIntroDialog", () => {
  assert.ok(!gymsContentSrc.includes('onStart={() => openSelection({ source: "regional-champion", regionId: region.regionId })}'), "the Champion row must no longer call openSelection directly — it must go through its own intro first");
  assert.ok(gymsContentSrc.includes("onStart={() => setChampionIntroRegionId(region.regionId)}"), "the Champion row's onStart must open the Champion-only intro state");

  assert.ok(gymsContentSrc.includes("function confirmChampionIntro() {"), "there must be a dedicated confirm handler for the Champion intro");
  assert.ok(
    gymsContentSrc.includes('source: "regional-champion", regionId: championIntroRegionId };\n    setChampionIntroRegionId(null);\n    openSelection(target);'),
    "confirming the Champion intro must proceed into the existing openSelection flow, only after clearing the intro state — no battle session before this"
  );

  // GymChampionIntroDialog is mounted from exactly one place, gated only by
  // championIntroRegionId — never reachable from Easy/Medium/Leader.
  const championIntroRenderCount = gymsContentSrc.split("<GymChampionIntroDialog").length - 1;
  assert.equal(championIntroRenderCount, 1, "GymChampionIntroDialog must be mounted from exactly one place, gated only by championIntroRegionId");
  assert.ok(gymsContentSrc.includes("import { GymChampionIntroDialog }"), "GymChampionIntroDialog must be its own imported component, never a parameterized reuse of GymIntroDialog");
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
  assert.ok(gymChampionIntroDialogSrc.includes("import { SpriteImage }"), "the Champion intro dialog must render its character image through SpriteImage");
  assert.ok(gymChampionIntroDialogSrc.includes("fallbackClassName="), "the Champion intro dialog's image must have a safe fallback for a not-yet-added file");
});

// REGIONAL CHAMPION — INTRO + VICTORY DIALOG POLISH (later task) — the
// Champion intro's own image/name, reusing the exact same helpers
// GymsContent's own ChampionRow card already reads (gym-trainer-images.ts /
// gym-trainer-names.ts) — no new image map, no new name table.
test("17: the Champion intro dialog shows the correct Regional Champion character image, reusing the existing helper (no new image map)", () => {
  assert.ok(
    gymsContentSrc.includes("characterImageUrl={getRegionalChampionCharacterImageUrl(championIntroRegionId)}"),
    "the Champion intro dialog must reuse getRegionalChampionCharacterImageUrl — the same helper ChampionRow's own card image already uses — never a second image map"
  );
});

test("18: the Champion intro dialog shows the correct Regional Champion name", () => {
  assert.ok(
    gymsContentSrc.includes("championName={getRegionalChampionTrainerName(championIntroRegionId)}"),
    "the Champion intro dialog must use the fixed Regional Champion name (gym-trainer-names.ts), never a Gym trainer's own name"
  );
});

test("19: the Champion intro dialog uses one polished, approved challenging line — not the Easy Trainer's own copy", () => {
  assert.ok(
    gymChampionIntroDialogSrc.includes(
      "עברת דרך ארוכה כדי להגיע עד אליי... אבל אל תטעה לחשוב שזה אומר שאתה מסוגל לנצח אותי."
    ),
    "the Champion intro must show its own approved challenging line"
  );
  assert.ok(!gymChampionIntroDialogSrc.includes("נראה אם אתה באמת מוכן"), "the Champion intro must never reuse the Easy Trainer's own copy");
});

test("20: the Regional Champion victory dialog uses its own approved congratulatory line naming the Regional Medal, distinct from the Leader's generic sentence, and still shows the Champion's own name for context", () => {
  assert.ok(
    gymVictoryRewardDialogSrc.includes("כל הכבוד! הוכחת שאתה ראוי למדליית המחוז. מעטים מצליחים להגיע עד כאן ולנצח אותי."),
    "the Champion victory copy must be the approved congratulatory sentence"
  );
  assert.ok(gymVictoryRewardDialogSrc.includes("{trainerName}"), "the Champion's own name must still be rendered for context, even though the new sentence doesn't interpolate it inline");
  // The Leader's own sentence must be completely untouched by this task —
  // both approved sentences must coexist as two distinct, non-overlapping
  // branches (isChampion ? ... : ...), never one replacing the other.
  assert.ok(gymVictoryRewardDialogSrc.includes("כל הכבוד! ניצחת את ${trainerName}. לא רבים מצליחים!"), "the Leader's own approved sentence must stay completely unmodified");
});
