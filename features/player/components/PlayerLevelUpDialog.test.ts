// PLAYER LEVEL UP — CONGRATULATIONS DIALOG. Focused coverage for this
// task's own 4 requirements. The trigger decision itself
// (hasPlayerLeveledUp) is a pure function, pulled out of React specifically
// so it's directly testable with real assertions; the component's wiring
// (reading the shared PlayerProgressionContext, never recomputing level
// math, the button closing the dialog, mounting at the (game) layout level)
// is checked at the source level — this project's established "no
// React-render/DOM harness" convention (see e.g.
// features/player/context/sound-settings-boundary.test.ts).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { hasPlayerLeveledUp } from "@/features/player-progression/progression-calculations";

const dialogSrc = readFileSync(new URL("./PlayerLevelUpDialog.tsx", import.meta.url), "utf8");
const messagesSrc = readFileSync("features/player-progression/progression-messages.ts", "utf8");
const layoutSrc = readFileSync("app/(game)/layout.tsx", "utf8");

// ===========================================================================
// 1 — no popup when level unchanged.
// ===========================================================================
test("1: hasPlayerLeveledUp is false when the level is unchanged", () => {
  assert.equal(hasPlayerLeveledUp(5, 5), false);
});

test("1b: hasPlayerLeveledUp is false for a same-or-lower level (never fires on a stale/out-of-order snapshot)", () => {
  assert.equal(hasPlayerLeveledUp(5, 4), false);
});

test("1c: hasPlayerLeveledUp is false when XP was gained but the level stayed the same (the component only ever compares levels, never XP)", () => {
  // Same level, different totalXp is exactly what "XP gained, no level
  // change" looks like once reduced to the level comparison this function
  // makes — proven at the type it actually operates on (levels), since
  // XP itself never enters this decision at all.
  assert.equal(hasPlayerLeveledUp(3, 3), false);
});

// ===========================================================================
// 2 — popup when player level increases.
// ===========================================================================
test("2: hasPlayerLeveledUp is true for a genuine one-level increase", () => {
  assert.equal(hasPlayerLeveledUp(5, 6), true);
});

// ===========================================================================
// 3 — correct new level shown; one XP grant that jumps multiple levels at
// once still yields exactly one true, for the FINAL level.
// ===========================================================================
test("3: hasPlayerLeveledUp is true for a multi-level jump in one grant (previousLevel -> final newLevel directly)", () => {
  assert.equal(hasPlayerLeveledUp(5, 9), true);
});

test("3b: (source) the dialog is set to progress.level itself (the server-authoritative final level) — never a locally incremented/hardcoded value", () => {
  assert.match(dialogSrc, /setDialogLevel\(progress\.level\)/);
  assert.match(dialogSrc, /\{playerLevelUpDialogMessage\(dialogLevel\)\}/, "the shown message must use the captured dialogLevel, not progress.level directly (which may have moved on by the time this renders)");
});

test("3c: (source) the trigger comparison reuses hasPlayerLeveledUp from progression-calculations.ts — no duplicated level-comparison logic inline", () => {
  assert.ok(dialogSrc.includes('import { hasPlayerLeveledUp } from "@/features/player-progression/progression-calculations";'));
  assert.match(dialogSrc, /hasPlayerLeveledUp\(lastSeenLevelRef\.current, progress\.level\)/);
  assert.ok(!/progress\.level\s*>\s*lastSeenLevelRef\.current/.test(dialogSrc), "must not ALSO inline the same comparison a second time");
});

test("3d: (source) the ref that tracks the last-seen level is seeded from progress.level itself, so the dialog never fires on first mount", () => {
  assert.match(dialogSrc, /useRef\(progress\.level\)/);
});

test("3e: (source) the exact required Hebrew copy is used, driven by the newLevel parameter", () => {
  assert.match(messagesSrc, /playerLevelUpDialogTitle = "כל הכבוד!"/);
  assert.match(messagesSrc, /playerLevelUpDialogMessage\(newLevel: number\)[\s\S]*?עבדת קשה ועלית לרמה \$\{newLevel\}!/);
  assert.match(messagesSrc, /playerLevelUpDialogButtonLabel = "אישור"/);
});

// ===========================================================================
// 4 — clicking אישור closes it, and nothing else happens.
// ===========================================================================
test("4: (source) the confirm button clears dialogLevel back to null on click, with no other side effect", () => {
  const buttonBlock = dialogSrc.slice(dialogSrc.indexOf("<button"), dialogSrc.indexOf("</button>"));
  assert.match(buttonBlock, /onClick=\{\(\) => setDialogLevel\(null\)\}/);
  assert.ok(buttonBlock.includes("{playerLevelUpDialogButtonLabel}"));
  // No server action, no revalidation, no navigation — dismissing is a
  // purely local, client-side state change.
  assert.ok(!buttonBlock.includes("Action("));
  assert.ok(!buttonBlock.includes("router."));
});

test("4b: (source) the dialog renders nothing once dismissed (dialogLevel === null)", () => {
  assert.match(dialogSrc, /if \(dialogLevel === null\) return null;/);
});

// ===========================================================================
// Blocking, matches existing dialog conventions, not a Pokémon-level UI.
// ===========================================================================
test("5: (source) the dialog uses the same blocking full-screen overlay convention as EvolutionPromptDialog/GymVictoryRewardDialog, and never auto-dismisses (no setTimeout)", () => {
  assert.match(dialogSrc, /role="dialog"/);
  assert.match(dialogSrc, /aria-modal="true"/);
  assert.match(dialogSrc, /fixed inset-0 z-\[70\] flex items-center justify-center bg-black\/80/);
  assert.ok(!dialogSrc.includes("setTimeout"), "must never auto-dismiss on a timer");
});

test("6: (source) mounted once, site-wide, at the (game) layout level alongside the other watchers — never inside battle/Pokémon-specific UI", () => {
  assert.ok(layoutSrc.includes('import { PlayerLevelUpDialog } from "@/features/player/components/PlayerLevelUpDialog";'));
  assert.match(layoutSrc, /<PlayerLevelUpDialog\s*\/>/);
});

test("7: (source) the component reads the SAME shared PlayerProgressionContext every other level/XP display uses — no second player-level state", () => {
  assert.ok(dialogSrc.includes('import { usePlayerProgression } from "@/features/player/context/player-progression-context";'));
  assert.ok(dialogSrc.includes("usePlayerProgression()"));
});
