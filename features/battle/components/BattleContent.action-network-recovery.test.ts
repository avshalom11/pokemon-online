// FIELD BATTLE STUCK — FOCUSED DIAGNOSIS & FIX.
//
// Real playtest report: attacking played its sound but battle state never
// progressed, no move ever resolved, and flee didn't work either — the
// player was completely stuck with no way to recover short of a reload.
//
// Root cause (found by inspecting the actual FieldBattleSession for the
// affected user): the dev server's own HTTP listener died mid-session
// (an infra failure, not a schema/data problem — the persisted session
// itself was perfectly valid, zero turns elapsed since creation). That
// exposed a REAL, separate code-level gap this file guards against:
// handleAttack, proceedCapture, and handleSelectMedicineTarget each set a
// blocking phase ("enemyTurn"/"capturing") SYNCHRONOUSLY, then `await` a
// Server Action call with no error handling. If that call ever throws or
// rejects — a dropped connection, a dev-server restart mid-request, any
// transient network failure — `phase` was never reset back to
// "playerTurn". Every action handler in this component guards on
// `phase !== "playerTurn"` at its own top, so a permanently-stuck phase
// meant EVERY future action (attack, capture, switch, bag, run) silently
// no-op'd forever — exactly the reported symptom, and reproducible by any
// single dropped request, not just a fully-dead server.
//
// Flee itself was already safe (features/battle-session's own stale-lock
// fix, an earlier ticket this session: handleReturnToMap's `.finally`
// navigates regardless of whether the session-ending delete resolved or
// rejected) — this file's own regression coverage for that lives in
// features/battle-session/active-battle-lock-stale-state.test.ts.
//
// No React-render/DOM harness exists in this project (BattleContent.
// no-damage-math.test.ts already established this file's own source-level
// convention) — the fix is verified at the source level.
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

test("handleAttack: a thrown/rejected executeBattleActionAction call is caught and recovers phase to playerTurn", () => {
  const body = bodyOf("function handleAttack(moveId: string) {", "function proceedCapture(ballItemId: string) {");
  assert.ok(body.includes("try {"), "the Server Action call must be wrapped in a try block");
  assert.ok(body.includes("result = await executeBattleActionAction(zoneId, \"attack\", moveId);"));
  const catchBody = body.slice(body.indexOf("} catch {"), body.indexOf("} catch {") + 120);
  assert.ok(catchBody.includes('setPhase("playerTurn");'), "the catch branch must recover phase back to playerTurn, never leave it stuck on enemyTurn");
});

test("proceedCapture: a thrown/rejected attemptCaptureAction call is caught and recovers phase to playerTurn", () => {
  const body = bodyOf("function proceedCapture(ballItemId: string) {", "function handleSelectMedicineTarget(");
  assert.ok(body.includes("try {"), "the Server Action call must be wrapped in a try block");
  assert.ok(body.includes("result = await attemptCaptureAction(ballItemId);"));
  const catchBody = body.slice(body.indexOf("} catch {"), body.indexOf("} catch {") + 120);
  assert.ok(catchBody.includes('setPhase("playerTurn");'), "the catch branch must recover phase back to playerTurn, never leave it stuck on capturing");
});

test("handleSelectMedicineTarget: a thrown/rejected applyMedicineItemAction call is caught, closes the Bag, and recovers phase to playerTurn", () => {
  const body = bodyOf("function handleSelectMedicineTarget(", "function handleConfirmMedicineResult() {");
  assert.ok(body.includes("try {"), "the Server Action call must be wrapped in a try block");
  assert.ok(body.includes("result = await applyMedicineItemAction(itemId, playerPokemonId);"));
  const catchBody = body.slice(body.indexOf("} catch {"), body.indexOf("} catch {") + 160);
  assert.ok(catchBody.includes("setIsBagOpen(false);"), "the catch branch must close the Bag, exactly like every other rejection path");
  assert.ok(catchBody.includes('setPhase("playerTurn");'), "the catch branch must recover phase back to playerTurn, never leave it stuck");
});

test("the existing explicit non-success recovery paths are still present and unweakened alongside the new try/catch", () => {
  const attackBody = bodyOf("function handleAttack(moveId: string) {", "function proceedCapture(ballItemId: string) {");
  assert.ok(attackBody.includes('if (result.status !== "success") {'));

  const captureBody = bodyOf("function proceedCapture(ballItemId: string) {", "function handleSelectMedicineTarget(");
  assert.ok(captureBody.includes('if (result.status === "captured") {'));
  assert.ok(captureBody.includes('if (result.status !== "failed") {'));

  const medicineBody = bodyOf("function handleSelectMedicineTarget(", "function handleConfirmMedicineResult() {");
  assert.ok(medicineBody.includes('if (result.status !== "success") {'));
});

test("handleEscape/handleReturnToMap's own network-failure resilience (a prior fix) is still intact", () => {
  assert.ok(source.includes("const endSessionPromiseRef = useRef<Promise<void> | null>(null);"));
  const returnToMapBody = bodyOf("function handleReturnToMap() {", "function resolveCounterAttackAgainstActive(");
  assert.ok(returnToMapBody.includes('router.replace("/map");'));
  assert.ok(
    returnToMapBody.includes("pendingEndSession.finally(proceed);"),
    "flee/full-party-defeat must still navigate away regardless of whether the session-ending delete resolved or rejected"
  );
});
