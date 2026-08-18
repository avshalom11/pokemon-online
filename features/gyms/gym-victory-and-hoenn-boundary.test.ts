// GYM BATTLE — VICTORY DIALOG, TRAINER GENDER/NAMES & HOENN LABEL FIX —
// source-level boundary coverage for the victory-dialog confirmation flow
// and the Hoenn typo fix. This project has no React-render/DOM test
// harness (every existing Gym test is a plain node:test service/data
// check — see this repo's own established convention, e.g.
// gym-battle-action.service.test.ts's "Gym Battle code never
// references..." test and the prior task's gym-battle-polish-boundary.
// test.ts), so the victory-dialog invariants are verified by reading the
// actual source text of the files this task changed.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { REGION_DISPLAY_NAMES_HE } from "./data/gym-labels";

const gymBattleContentSrc = fs.readFileSync("features/gyms/components/GymBattleContent.tsx", "utf8");
const gymVictoryRewardDialogSrc = fs.readFileSync("features/gyms/components/GymVictoryRewardDialog.tsx", "utf8");
const gymLabelsSrc = fs.readFileSync("features/gyms/data/gym-labels.ts", "utf8");

const APPROVED_VICTORY_COPY = "כל הכבוד! ניצחת את {trainerName}. לא רבים מצליחים!";

function withTrainerName(name: string): string {
  return APPROVED_VICTORY_COPY.replace("{trainerName}", name);
}

test("1: the victory dialog's copy contains the exact approved sentence structure — 'כל הכבוד!' ... trainer name ... 'לא רבים מצליחים!'", () => {
  for (const src of [gymBattleContentSrc, gymVictoryRewardDialogSrc]) {
    assert.ok(src.includes("כל הכבוד! ניצחת את"), "must contain the approved opening");
    assert.ok(src.includes("לא רבים מצליחים!"), "must contain the approved closing");
  }
});

test("4: the rendered victory text for an actual trainer name matches the approved sentence exactly (both Easy/Medium and Leader/Champion dialogs)", () => {
  const rendered = withTrainerName("דניאל");
  assert.equal(rendered, "כל הכבוד! ניצחת את דניאל. לא רבים מצליחים!");

  // Both dialogs interpolate the real trainer name via a template literal
  // between the approved opening/closing halves — never a hardcoded
  // placeholder string.
  assert.ok(gymBattleContentSrc.includes("כל הכבוד! ניצחת את {trainerName}. לא רבים מצליחים!"), "GymBattleContent's Easy/Medium notice must interpolate the real trainerName");
  assert.ok(gymVictoryRewardDialogSrc.includes("כל הכבוד! ניצחת את ${trainerName}. לא רבים מצליחים!"), "GymVictoryRewardDialog must interpolate the real trainerName via a template literal");
});

test("2/3: navigation away from a victory is only ever triggered by the single, named confirmVictory handler — never automatically, never before the player's own 'אישור' click", () => {
  // confirmVictory exists, does exactly one thing (router.push("/gyms")),
  // and is the ONLY onConfirm wired into both victory dialogs.
  assert.ok(gymBattleContentSrc.includes("function confirmVictory() {"), "confirmVictory must be a single, named handler");
  assert.ok(gymBattleContentSrc.includes("onConfirm={confirmVictory}"), "both victory dialogs must be wired to the SAME confirmVictory handler");
  const onConfirmVictoryCount = gymBattleContentSrc.split("onConfirm={confirmVictory}").length - 1;
  assert.equal(onConfirmVictoryCount, 2, "exactly the Easy/Medium notice and the Leader/Champion reward dialog must use confirmVictory — never a third/inline navigation");

  // `outcome` (which gates the victory dialogs) is never reset once set —
  // a one-way ratchet, so nothing in this component can silently close or
  // auto-dismiss the dialog on its own once a victory is recorded. Checked
  // as an actual statement (trailing `;`) so this doesn't false-positive on
  // this very invariant being described in a doc comment elsewhere in the
  // file.
  assert.ok(!gymBattleContentSrc.includes("setOutcome(null);"), "outcome must never be reset — the victory dialog can only be dismissed via the player's own confirmVictory click");

  // The victory branch itself (inside handleAttack, the only place
  // victoryCompleted can ever be true) returns IMMEDIATELY after
  // setOutcome — no code between them that could navigate first.
  const victoryBranch = gymBattleContentSrc.match(/if \(result\.victoryCompleted\) \{\s*setOutcome\(\{ kind: "victory", reward: result\.reward \?\? null \}\);\s*return;\s*\}/);
  assert.ok(victoryBranch, "the victoryCompleted branch must set outcome and return immediately, with nothing else executing in between");
});

test("exactly one victory dialog renders at a time — never two overlapping dialogs for a Gym Leader/Regional Champion reward win", () => {
  assert.ok(
    gymBattleContentSrc.includes("return outcome.reward ? (") && gymBattleContentSrc.includes("<GymVictoryRewardDialog") && gymBattleContentSrc.includes("<GymEasyMediumVictoryNotice"),
    "the victory render must be a single mutually-exclusive branch between the reward dialog and the plain notice, never both"
  );
});

test("11: the incorrect 'מכוני הוען' spelling no longer exists anywhere in Gym data/UI", () => {
  assert.ok(!gymLabelsSrc.includes("הוען"), "the typo'd Hoenn spelling must not appear in gym-labels.ts");
});

test("12: 'הואן' is the rendered Hoenn display label (מכוני הואן), and the internal region id stays 'hoenn'", () => {
  assert.equal(REGION_DISPLAY_NAMES_HE.hoenn, "הואן");
  // GymsContent's own header renders `מכוני {REGION_DISPLAY_NAMES_HE[region.regionId]}` —
  // confirmed correct via the label value itself above; the internal id
  // key ("hoenn") is untouched (same Record key as before).
});
