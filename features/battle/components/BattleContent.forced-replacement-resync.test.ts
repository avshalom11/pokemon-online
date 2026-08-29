// FIELD BATTLE STALE-HP / FORCED-REPLACEMENT FIX.
//
// Real bug: the active Pokémon could reach 0 HP server-side (persisted
// durably by executeBattleAction before several later awaits that can still
// fail) while the client's own partyHpMap mirror never learned about it —
// either because the very request that fainted it threw/was rejected before
// its response arrived, or because a LATER attack attempt correctly comes
// back "invalid-active-pokemon" (proof the DB already has it at 0) but the
// client treated that identically to every other generic rejection and just
// reset back to "playerTurn". The result: a Pokémon visually stuck at its
// last-known (often low, e.g. 1-5) HP, attack buttons that stay clickable,
// and every subsequent click silently rejected forever — "an experienced
// player can figure out they need to switch" only because switching itself
// never depended on the old active Pokémon's HP being correct.
//
// No React-render/DOM harness exists in this project for BattleContent
// (BattleContent.no-damage-math.test.ts and BattleContent.
// action-network-recovery.test.ts already establish this file's own
// source-level convention) — this fix is verified the same way: real
// source-text assertions over the actual, unmodified BattleContent.tsx,
// proving the control flow is wired correctly rather than re-implementing
// (and therefore only testing) a parallel copy of the logic.
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

const resyncBody = bodyOf("async function resyncAfterUncertainAttackOutcome() {", "function handleAttack(moveId: string) {");
const handleAttackBody = bodyOf("function handleAttack(moveId: string) {", "function proceedCapture(ballItemId: string) {");

test("resyncAfterUncertainAttackOutcome re-reads the party from the database — never trusts the stale client-side partyHpMap mirror", () => {
  assert.ok(resyncBody.includes("const freshParty = await getLivePartyAction();"), "must fetch the authoritative party via the real server action");
  assert.ok(resyncBody.includes("setPartyHpMap((prev) => {"), "must overwrite the client's HP mirror with the freshly-read authoritative values");
});

test("scenario B/C: a fainted active Pokémon (from a fresh resync) routes through the EXISTING determineNextPhaseAfterFaint decision, never a second/parallel implementation", () => {
  assert.ok(
    resyncBody.includes("const nextPhase = determineNextPhaseAfterFaint(freshParty);"),
    "must reuse the same pure decision function the already-working success path uses"
  );
  assert.ok(resyncBody.includes('setPhase(nextPhase);'));
});

test("scenario A/B/C: when a usable party member remains, the phase becomes selectingForcedReplacement — the existing forced-replacement UI, not a new one", () => {
  assert.ok(
    resyncBody.includes('nextPhase === "selectingForcedReplacement" ? forcedReplacementMessage(playerDisplayName) : partyDefeatedMessage()'),
    "must show the same Hebrew forced-replacement message the existing working path already uses"
  );
});

test("scenario D: no usable party member remains -> partyDefeated, and the existing session-ending call fires, never a bare 'no replacement offered' dead end", () => {
  const partyDefeatedBranch = resyncBody.slice(resyncBody.indexOf('if (nextPhase === "partyDefeated") {'));
  assert.ok(partyDefeatedBranch.includes("confirmedEndedRef.current = true;"));
  assert.ok(partyDefeatedBranch.includes("endSessionPromiseRef.current = endBattleSessionAction();"), "must reuse the exact same session-ending call the working success/counter-attack paths already use");
});

test("scenario E: when the resynced active Pokémon is still genuinely usable (HP > 0), the client returns to a normal, safe playerTurn — never assumes a faint that didn't happen", () => {
  const usableBranch = resyncBody.slice(
    resyncBody.indexOf("if (freshActive && freshActive.currentHp > 0) {"),
    resyncBody.indexOf("const nextPhase = determineNextPhaseAfterFaint(freshParty);")
  );
  assert.ok(usableBranch.includes('setPhase("playerTurn");'), "a still-usable active Pokémon must resume normal play, not be treated as a faint");
});

test("HP correctness: fainted detection after resync is strictly HP > 0 / HP <= 0 — no minimum-HP floor, no percentage-based check, no arbitrary display clamp", () => {
  assert.ok(resyncBody.includes("freshActive.currentHp > 0"), "usability must be a plain currentHp > 0 check");
  assert.ok(!/currentHp\s*[<>]=?\s*[1-9]\d*\s*&&\s*currentHp\s*[<>]/.test(resyncBody), "must never clamp/floor HP to a small positive minimum for display or faint purposes");
  assert.ok(!resyncBody.includes("Math.max(1"), "must never introduce a minimum-1 HP floor");
});

test("the invalid-active-pokemon rejection is resynced, never treated as a generic non-success failure", () => {
  assert.ok(
    handleAttackBody.includes('if (result.status === "invalid-active-pokemon") {'),
    "must special-case invalid-active-pokemon before the generic non-success branch"
  );
  const invalidActiveBranch = handleAttackBody.slice(
    handleAttackBody.indexOf('if (result.status === "invalid-active-pokemon") {'),
    handleAttackBody.indexOf('if (result.status !== "success") {')
  );
  assert.ok(invalidActiveBranch.includes("await resyncAfterUncertainAttackOutcome();"), "invalid-active-pokemon must trigger the same authoritative resync");
  assert.ok(!invalidActiveBranch.includes('setPhase("playerTurn");'), "must never blindly re-enable attacks on an already-confirmed-fainted active Pokémon");
});

test("a thrown/rejected request is ALSO resynced (uncertain outcome), never blindly reset to playerTurn", () => {
  const catchBody = handleAttackBody.slice(handleAttackBody.indexOf("} catch {"), handleAttackBody.indexOf("} catch {") + 160);
  assert.ok(catchBody.includes("await resyncAfterUncertainAttackOutcome();"));
});

test("every OTHER non-success status (returned before any HP mutation ever runs server-side) still safely recovers directly to playerTurn — unrelated behavior is preserved", () => {
  const genericFallback = handleAttackBody.slice(handleAttackBody.indexOf('if (result.status !== "success") {'));
  assert.ok(genericFallback.includes('setPhase("playerTurn");'), "the generic fallback for every other rejection status must remain unchanged");
});

test("scenario A regression: the existing SUCCESS-path forced-replacement/party-defeated transition is untouched by this fix", () => {
  assert.ok(
    handleAttackBody.includes('setPhase(result.battleEnded ? "partyDefeated" : "selectingForcedReplacement");'),
    "a normal successful attack that faints the active Pokémon must still transition exactly as before"
  );
});

test("scenario F: no automatic replacement selection — resyncAfterUncertainAttackOutcome only ever sets a phase, it never itself picks or syncs a new active Pokémon", () => {
  assert.ok(!resyncBody.includes("syncActivePokemonAction"), "must never auto-switch to any Pokémon itself");
  assert.ok(!resyncBody.includes("getFirstUsableMember"), "must never auto-select the first usable Pokémon — the player must choose via the existing picker");
});

test("scenario F: the existing forced-replacement picker still requires an explicit player selection, with no onClose escape hatch", () => {
  const forcedPickerJsx = source.slice(source.indexOf('{phase === "selectingForcedReplacement" ? ('), source.indexOf('{phase === "selectingForcedReplacement" ? (') + 300);
  assert.ok(forcedPickerJsx.includes('mode="forced"'));
  assert.ok(forcedPickerJsx.includes("onSelect={handleForcedReplacementSelect}"));
  assert.ok(!forcedPickerJsx.includes("onClose"), "the forced picker must not be dismissible without choosing a replacement");
});
