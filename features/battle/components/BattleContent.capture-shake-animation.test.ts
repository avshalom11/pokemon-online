// FIELD BATTLE — POKÉ BALL CAPTURE SHAKE ANIMATION. Same source-level
// convention as this file's sibling tests (BattleContent.no-damage-math.
// test.ts, BattleContent.action-network-recovery.test.ts) — no React
// render/DOM harness exists in this project, so the animation state
// machine is verified by reading the real source text.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const battleContentSrc = readFileSync(new URL("./BattleContent.tsx", import.meta.url), "utf8");
const pokemonSpriteSrc = readFileSync("components/battle/PokemonSprite.tsx", "utf8");
const battleSceneSrc = readFileSync("components/battle/BattleScene.tsx", "utf8");
const globalsCssSrc = readFileSync("app/globals.css", "utf8");
const battleTimingSrc = readFileSync("features/battle/utils/battle-timing.ts", "utf8");
const gymBattleContentSrc = readFileSync("features/gyms/components/GymBattleContent.tsx", "utf8");
const leagueMatchContentSrc = readFileSync("features/leagues/components/LeagueMatchContent.tsx", "utf8");

function bodyOf(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start !== -1 && end !== -1 && end > start, `could not locate body between "${startMarker}" and "${endMarker}"`);
  return source.slice(start, end);
}

const proceedCaptureBody = bodyOf(battleContentSrc, "function proceedCapture(ballItemId: string) {", "function handleSelectMedicineTarget(");

// (1) the ball animation starts synchronously, before the network call.
test("the shake animation starts synchronously (before the server round trip), alongside phase=capturing", () => {
  const phaseIndex = proceedCaptureBody.indexOf('setPhase("capturing");');
  const shakeIndex = proceedCaptureBody.indexOf('setCaptureAnimationStage("shaking");');
  const transitionIndex = proceedCaptureBody.indexOf("startCaptureTransition(async () => {");
  assert.ok(phaseIndex > -1 && shakeIndex > -1 && transitionIndex > -1);
  assert.ok(phaseIndex < shakeIndex, "capturing phase must be set before the shake animation starts");
  assert.ok(shakeIndex < transitionIndex, "the shake must already be running before the async transition (and therefore the real server call) even begins");
});

// (2) capture RNG/mechanics are completely unmodified — the real,
// unwrapped attemptCaptureAction call is still what's awaited.
test("the real attemptCaptureAction call is unmodified — capture RNG/mechanics are untouched by the animation", () => {
  assert.ok(proceedCaptureBody.includes("attemptCaptureAction(ballItemId),"), "the real capture action must still be called with only the ball item id, exactly as before");
  assert.ok(!proceedCaptureBody.includes("attemptCaptureAction(ballItemId, "), "no extra argument may be added to the real capture call");
});

// (3) the shake runs IN PARALLEL with the real server call, never
// sequentially before or after it (which would either delay the real
// request or double the wait).
test("the shake's minimum duration and the real server call run in parallel via Promise.all, never sequentially", () => {
  const promiseAllIndex = proceedCaptureBody.indexOf("Promise.all([");
  const actionCallIndex = proceedCaptureBody.indexOf("attemptCaptureAction(ballItemId),");
  const timerIndex = proceedCaptureBody.indexOf("setTimeout(resolve, CAPTURE_SHAKE_DURATION_MS)");
  assert.ok(promiseAllIndex > -1 && actionCallIndex > -1 && timerIndex > -1);
  assert.ok(promiseAllIndex < actionCallIndex && actionCallIndex < timerIndex, "both the real action call and the shake timer must be inside the same Promise.all array");
});

// (4) success: the success glow plays, and ONLY after CAPTURE_SUCCESS_HOLD_MS
// does phase flip to "captured" — the terminal overlay never appears
// mid-shake or mid-glow.
test("on a successful capture, the success glow plays and phase only flips to captured after the hold timer", () => {
  const successStageIndex = proceedCaptureBody.indexOf('setCaptureAnimationStage("success");');
  const timeoutIndex = proceedCaptureBody.indexOf("captureSuccessTimeout.current = setTimeout(() => {");
  const capturedPhaseIndex = proceedCaptureBody.indexOf('setPhase("captured");');
  assert.ok(successStageIndex > -1 && timeoutIndex > -1 && capturedPhaseIndex > -1);
  assert.ok(successStageIndex < timeoutIndex && timeoutIndex < capturedPhaseIndex, "captured phase must only be set inside the hold timer's own callback, after the success stage is shown");
  assert.ok(proceedCaptureBody.includes("}, CAPTURE_SUCCESS_HOLD_MS);"));
});

// (5) failure: the ball animation clears immediately once the shake ends —
// no lingering success glow, no extra delay beyond the shake itself —
// before the existing counter-attack/result logic runs.
test("on a failed capture, the ball animation clears immediately (no success glow) before the existing counter-attack logic runs", () => {
  const clearIndex = proceedCaptureBody.lastIndexOf("setCaptureAnimationStage(null);");
  const triggerHitIndex = proceedCaptureBody.indexOf('triggerHit("enemy");');
  assert.ok(clearIndex > -1 && triggerHitIndex > -1);
  assert.ok(clearIndex < triggerHitIndex, "the wild sprite must reappear (animation cleared) before the counter-attack hit-flash plays");
});

// (6) a thrown/rejected request, or a no-balls/error result, also clears
// the animation cleanly — the ball never gets stuck showing.
test("a thrown/rejected request and a no-balls/error result both clear the capture animation", () => {
  const catchBody = proceedCaptureBody.slice(proceedCaptureBody.indexOf("} catch {"), proceedCaptureBody.indexOf("} catch {") + 200);
  assert.ok(catchBody.includes("setCaptureAnimationStage(null);"));

  const noBallsBody = proceedCaptureBody.slice(
    proceedCaptureBody.indexOf('if (result.status !== "failed") {') - 200,
    proceedCaptureBody.indexOf('if (result.status !== "failed") {')
  );
  assert.ok(noBallsBody.includes("setCaptureAnimationStage(null);"), "the animation must be cleared before the no-balls/error early return");
});

// (7) cleanup — the success-hold timer is cleared on unmount, same
// convention as every other battle timeout ref in this file.
test("the capture success-hold timer is cleared on unmount, same as every other battle animation timeout", () => {
  assert.ok(battleContentSrc.includes("const captureSuccessTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);"));
  assert.ok(battleContentSrc.includes("if (captureSuccessTimeout.current) clearTimeout(captureSuccessTimeout.current);"));
});

// (8) duration constants match the required ~1.5-2.5s shake / brief hold.
test("CAPTURE_SHAKE_DURATION_MS is within the required 1.5-2.5s range, and CAPTURE_SUCCESS_HOLD_MS is a brief hold", () => {
  assert.ok(battleTimingSrc.includes("export const CAPTURE_SHAKE_DURATION_MS = 2000;"));
  assert.ok(battleTimingSrc.includes("export const CAPTURE_SUCCESS_HOLD_MS = 500;"));
});

// (9) asset reuse — the ball image comes from the SAME InventoryItemView
// the Bag already renders, never a new/duplicated path.
test("the thrown ball's image is resolved from the existing InventoryItemView (item.imageUrl) — no new/duplicated asset path", () => {
  assert.ok(proceedCaptureBody.includes("liveInventoryItems.find((view) => view.item.id === ballItemId)?.item.imageUrl ?? null"));
});

// (10) PokemonSprite: the ball replaces the sprite entirely while
// animating, using object-contain (never object-cover, never stretched),
// centered, inside the same anchored/scaled wrapper as the real sprite.
test("PokemonSprite renders the ball via object-contain, centered, in place of (not alongside) the wild sprite", () => {
  assert.ok(pokemonSpriteSrc.includes("captureAnimationStage && captureBallImageSrc"));
  assert.ok(pokemonSpriteSrc.includes("object-contain"));
  const classNameValues = [...pokemonSpriteSrc.matchAll(/className="([^"]*)"/g)].map((m) => m[1]);
  assert.ok(
    classNameValues.every((value) => !value.includes("object-cover")),
    "object-cover would crop the ball art — must never be used"
  );
  assert.ok(pokemonSpriteSrc.includes("items-center justify-center"), "the ball must be centered within its frame");
});

// (11) Gym/League never pass the animation props — they share BattleScene/
// PokemonSprite but stay completely unaffected.
test("Gym and League battle content never reference the capture-animation props — they render exactly as before this feature", () => {
  assert.ok(!gymBattleContentSrc.includes("captureAnimationStage"));
  assert.ok(!gymBattleContentSrc.includes("captureBallImageSrc"));
  assert.ok(!leagueMatchContentSrc.includes("captureAnimationStage"));
  assert.ok(!leagueMatchContentSrc.includes("captureBallImageSrc"));
});

// (12) BattleScene only ever forwards these to the ENEMY sprite, never the
// player's.
test("BattleScene forwards captureAnimationStage/captureBallImageSrc only to the enemy PokemonSprite", () => {
  const enemySpriteBody = bodyOf(battleSceneSrc, '<PokemonSprite\n          role="enemy"', "</PlatformAnchor>");
  assert.ok(enemySpriteBody.includes("captureAnimationStage={captureAnimationStage}"));
  assert.ok(enemySpriteBody.includes("captureBallImageSrc={captureBallImageSrc}"));
  const playerSpriteBody = bodyOf(battleSceneSrc, 'role="player"', "</PlatformAnchor>");
  assert.ok(!playerSpriteBody.includes("captureAnimationStage"));
});

// (13) CSS keyframe durations stay in sync with the JS constants.
test("the CSS shake/success animation durations match the JS timing constants exactly", () => {
  assert.ok(globalsCssSrc.includes("animation: capture-ball-shake 2s ease-in-out;"));
  assert.ok(globalsCssSrc.includes("animation: capture-ball-success 0.5s ease-out forwards;"));
});
