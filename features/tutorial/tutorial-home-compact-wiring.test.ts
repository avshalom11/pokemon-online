// TUTORIAL HOME CARD — COMPACT AFTER COMPLETION. UI wiring checks
// (source-level — this project has no React-render/DOM harness, same
// established convention as tutorial-phase0/1/2/3/4/5-wiring.test.ts).
// Presentation-only task: an in-progress Tutorial keeps its large,
// prominent Home card exactly as before; a COMPLETED Tutorial no longer
// shows that card at all — instead a small, subtle entry lower on the page
// (HomeTutorialReplayEntry.tsx) offers the same replay flow.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const homeCardSrc = readFileSync(new URL("./components/HomeTutorialCard.tsx", import.meta.url), "utf8");
const homeReplayEntrySrc = readFileSync(new URL("./components/HomeTutorialReplayEntry.tsx", import.meta.url), "utf8");
const homeContentSrc = readFileSync(new URL("../home/components/HomeContent.tsx", import.meta.url), "utf8");

test("HomeTutorialCard's in-progress presentation (large card, progress bar, resume) is completely untouched", () => {
  assert.ok(homeCardSrc.includes('import { ProgressBar } from "@/components/battle/ProgressBar";'));
  assert.ok(homeCardSrc.includes("percent={view.progressPercent}"));
  assert.ok(homeCardSrc.includes("המשך הכרת המשחק"));
  assert.ok(homeCardSrc.includes("onClick={resume}"));
  assert.match(homeCardSrc, /if \(view\.status !== "in_progress" \|\| panelMode !== "closed"\) return null;/);
});

test("HomeTutorialCard no longer renders anything for the completed state — that presentation moved entirely to HomeTutorialReplayEntry", () => {
  assert.ok(!homeCardSrc.includes("הכרת המשחק ✓"), "the completed-state markup must not live here anymore");
  assert.ok(!homeCardSrc.includes("startReplay"), "the replay entry point must not live here anymore");
  assert.ok(!homeCardSrc.includes('view.status === "completed"'), "no completed-state branch of any kind may remain here");
});

test("HomeTutorialReplayEntry renders only once the real Tutorial is completed and not currently replaying, reusing the SAME TutorialProvider context — never a second copy of Tutorial state", () => {
  assert.ok(homeReplayEntrySrc.includes('import { useTutorial } from "@/features/tutorial/context/tutorial-context";'));
  assert.ok(homeReplayEntrySrc.includes("const { view, mode, startReplay } = useTutorial();"));
  assert.match(homeReplayEntrySrc, /if \(view\.status !== "completed" \|\| mode !== "live"\) return null;/);
  // Presentation-only: no server action, no local progress state, no new
  // fetch — the exact same startReplay() the original completed-state
  // button already called.
  assert.ok(!homeReplayEntrySrc.includes("useState"));
  assert.ok(!homeReplayEntrySrc.includes("Action()"));
});

test("HomeTutorialReplayEntry shows both required lines of copy, and clicking it calls the existing startReplay — never a duplicated/local replay trigger", () => {
  assert.ok(homeReplayEntrySrc.includes("הכרת המשחק ✓"));
  assert.ok(homeReplayEntrySrc.includes("הפעלה חוזרת — ללא פרס"));
  assert.ok(homeReplayEntrySrc.includes("onClick={startReplay}"));
});

test("HomeContent mounts HomeTutorialReplayEntry LOWER on the page — after the Achievements/News/Statistics row, never at the top alongside HomeTutorialCard", () => {
  assert.ok(homeContentSrc.includes('import { HomeTutorialReplayEntry } from "@/features/tutorial/components/HomeTutorialReplayEntry";'));

  const topCardIndex = homeContentSrc.indexOf("<HomeTutorialCard />");
  const statsGridIndex = homeContentSrc.indexOf("<StatisticsPanel");
  const replayEntryIndex = homeContentSrc.indexOf("<HomeTutorialReplayEntry />");

  assert.ok(topCardIndex >= 0 && statsGridIndex >= 0 && replayEntryIndex >= 0);
  assert.ok(topCardIndex < statsGridIndex, "HomeTutorialCard must stay at the top, above the lower-page panels");
  assert.ok(replayEntryIndex > statsGridIndex, "HomeTutorialReplayEntry must render strictly lower than the Achievements/News/Statistics row, never at the top");
});
