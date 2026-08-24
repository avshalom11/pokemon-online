// FLEE CONFIRMATION — regression guard: the "בריחה" menu action must open a
// blocking confirmation (FleeConfirmDialog) rather than fleeing
// immediately, and the resulting "escaped" result screen must wait for the
// player's own click rather than auto-navigating away. No React-render/DOM
// harness exists in this project (BattleContent.action-network-recovery.
// test.ts already established this file's own source-level convention) —
// verified at the source level, same approach.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("./BattleContent.tsx", import.meta.url), "utf8");

function bodyOf(startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start !== -1 && end !== -1 && end > start, `could not locate body between "${startMarker}" and "${endMarker}"`);
  return source.slice(start, end);
}

test("handleMenuAction opens the flee confirmation instead of fleeing immediately", () => {
  const body = bodyOf("function handleMenuAction(actionId: string) {", "function handleAttackSelect(");
  assert.ok(body.includes('if (actionId === "run") {'));
  const runBranch = body.slice(body.indexOf('if (actionId === "run") {'), body.indexOf("} else if"));
  assert.ok(runBranch.includes("setPendingFleeConfirm(true)"), "the run action must only open the confirmation, never call handleEscape directly");
  assert.ok(!runBranch.includes("handleEscape()"), "handleEscape must not be called directly from the menu action");
});

test("handleConfirmFlee closes the confirmation and proceeds via the existing handleEscape flow", () => {
  const body = bodyOf("function handleConfirmFlee() {", "function handleCancelFlee() {");
  assert.ok(body.includes("setPendingFleeConfirm(false);"));
  assert.ok(body.includes("handleEscape();"), "confirming must reuse the existing handleEscape flow, not a duplicate flee implementation");
});

test("handleCancelFlee only closes the confirmation — no phase change, no server call", () => {
  const body = bodyOf("function handleCancelFlee() {", "function handleMenuAction(actionId: string) {");
  assert.ok(body.includes("setPendingFleeConfirm(false);"));
  assert.ok(!body.includes("setPhase("), "cancelling must never touch battle phase — the player stays in battle");
  assert.ok(!body.includes("endBattleSessionAction"), "cancelling must never end the battle session");
});

test("handleEscape no longer auto-navigates — the escaped result screen waits for the player's own click", () => {
  const body = bodyOf("function handleEscape() {", "function handleConfirmFlee() {");
  assert.ok(body.includes('setPhase("escaped");'));
  assert.ok(body.includes("endSessionPromiseRef.current = endBattleSessionAction();"), "session cleanup must still fire immediately");
  assert.ok(!body.includes("handleReturnToMap();"), "handleEscape must not call handleReturnToMap itself — only the overlay's own button may navigate");
});

test("the escaped result overlay's own button is still the only thing that calls handleReturnToMap for a flee", () => {
  assert.ok(
    source.includes('phase === "captured" || phase === "partyDefeated" || phase === "escaped"') &&
      source.includes("onReturnToMap={handleReturnToMap}"),
    "the escaped variant must render through the same BattleResultOverlay whose button triggers navigation"
  );
});

test("FleeConfirmDialog is rendered conditionally on pendingFleeConfirm, wired to cancel/confirm", () => {
  assert.ok(source.includes('import { FleeConfirmDialog } from "./FleeConfirmDialog";'));
  assert.ok(source.includes("const [pendingFleeConfirm, setPendingFleeConfirm] = useState(false);"));
  assert.ok(
    source.includes("{pendingFleeConfirm ? <FleeConfirmDialog onCancel={handleCancelFlee} onConfirm={handleConfirmFlee} /> : null}")
  );
});
