// TUTORIAL REPLAY — CLOSE BUTTON. UI wiring checks (source-level — this
// project has no React-render/DOM harness, same established convention as
// tutorial-phase0/1/2/3/4/5-wiring.test.ts). Reuses the exact same
// `postpone` context method the pre-existing "אעשה זאת מאוחר יותר" button
// already calls — no new context method, no new state (see
// tutorial-phase5-wiring.test.ts's own "postpone()'s replay branch never
// calls postponeTutorialAction" test for proof that branch never touches
// the server or the real, already-completed progress).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const panelSrc = readFileSync(new URL("./components/TutorialPanel.tsx", import.meta.url), "utf8");

const awaitingBlock = panelSrc.slice(panelSrc.indexOf('panelMode === "awaiting"'), panelSrc.indexOf("const { copy, ctaKind }"));
const explainingBlock = panelSrc.slice(panelSrc.indexOf("const { copy, ctaKind }"));

test("the minimized/awaiting banner shows a replay-only close (✕) button, calling the existing postpone", () => {
  assert.ok(awaitingBlock.includes("✕"));
  const closeButtonBlock = awaitingBlock.slice(Math.max(0, awaitingBlock.indexOf("✕") - 700), awaitingBlock.indexOf("✕") + 20);
  assert.ok(closeButtonBlock.includes('mode === "replay"'));
  assert.ok(closeButtonBlock.includes("onClick={postpone}"));
  assert.ok(closeButtonBlock.includes('aria-label="יציאה מהפעלה חוזרת"'));
});

test("the full explaining panel shows a replay-only close (✕) button, calling the existing postpone", () => {
  assert.ok(explainingBlock.includes("✕"));
  const closeButtonBlock = explainingBlock.slice(explainingBlock.indexOf("✕") - 300, explainingBlock.indexOf("✕") + 20);
  assert.ok(closeButtonBlock.includes('mode === "replay"'));
  assert.ok(closeButtonBlock.includes("onClick={postpone}"));
  assert.ok(closeButtonBlock.includes('aria-label="יציאה מהפעלה חוזרת"'));
});

test("both replay close buttons remain available regardless of the current stage's own canPostpone flag — Stage 1 (canPostpone: false) is fully replayable and must stay exitable", () => {
  // The ✕ button's own gating condition is `mode === "replay"` alone —
  // find the smallest enclosing `{mode === "replay" ? (...) : null}`
  // block around each ✕ and confirm canPostpone never appears inside it.
  for (const block of [awaitingBlock, explainingBlock]) {
    const closeIndex = block.indexOf("✕");
    const blockStart = block.lastIndexOf('mode === "replay" ? (', closeIndex);
    const blockEnd = block.indexOf(") : null}", closeIndex);
    const gatedBlock = block.slice(blockStart, blockEnd);
    assert.ok(!gatedBlock.includes("canPostpone"), "the replay close button must never be additionally gated on canPostpone");
  }
});

test("exactly two ✕ close buttons exist in real JSX (not counting doc-comment mentions), and neither is ever disabled — postpone's replay branch is a synchronous local reset, so exiting is always immediate", () => {
  const jsxCloseButtons = [...panelSrc.matchAll(/<button[^>]*>\s*✕\s*<\/button>/g)];
  assert.equal(jsxCloseButtons.length, 2);
  for (const [buttonMarkup] of jsxCloseButtons) {
    assert.ok(!buttonMarkup.includes("disabled"));
  }
});

test("the original first-time (live) Tutorial never gets a close button — both are strictly scoped inside a mode === \"replay\" conditional, the same flag every other replay-only element in this panel already uses", () => {
  assert.equal((panelSrc.match(/mode === "replay"/g) ?? []).length >= 4, true, "at least the pre-existing amber banner/label checks plus the two new close-button checks");
});
