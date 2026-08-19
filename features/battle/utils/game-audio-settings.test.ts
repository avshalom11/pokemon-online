// SOUND TOGGLE — LIVE UPDATE BUG FIX — real behavioral coverage for the
// shared reactive store itself (game-audio-settings.ts). This is the ONE
// piece of the fix that's actually runnable in this project's plain
// node:test environment (no DOM/React-render harness exists here) — it's
// pure JS, no Audio/window/React needed. Proving THIS store notifies
// subscribers synchronously and immediately is the direct proof that
// useBattleMusic's own useSyncExternalStore subscription (React's own,
// well-established mechanism) reacts live; the *wiring* of that hook is
// covered separately by battle-music-boundary.test.ts's own source-level
// checks (no DOM harness to actually mount it).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { isSoundEnabled, setSoundEnabledMirror, subscribeSoundEnabled } from "./game-audio-settings.ts";

beforeEach(() => {
  // Reset to the module's own documented default between tests — this
  // module-level store persists across tests in the same process
  // otherwise, since it's a plain shared singleton (by design).
  setSoundEnabledMirror(true);
});

// 1/2 (prerequisite): OFF/ON immediately updates the value every
// subscriber (useBattleMusic) and every call-time reader
// (playAttackHitSound/playVictorySound/playDefeatSound) observes.
test("isSoundEnabled() reflects a new value immediately after setSoundEnabledMirror — no caching, no delay", () => {
  assert.equal(isSoundEnabled(), true);
  setSoundEnabledMirror(false);
  assert.equal(isSoundEnabled(), false, "OFF must be visible immediately");
  setSoundEnabledMirror(true);
  assert.equal(isSoundEnabled(), true, "ON must be visible immediately");
});

// 1/2: subscribers (useBattleMusic, via useSyncExternalStore) are notified
// synchronously — the actual mechanism that makes an already-mounted
// battle-theme track react without a remount/refresh.
test("subscribeSoundEnabled listeners fire synchronously and immediately on every change, in both directions", () => {
  const seen: boolean[] = [];
  const unsubscribe = subscribeSoundEnabled(() => seen.push(isSoundEnabled()));

  setSoundEnabledMirror(false);
  assert.deepEqual(seen, [false], "OFF must notify immediately");

  setSoundEnabledMirror(true);
  assert.deepEqual(seen, [false, true], "ON must notify immediately — this is what lets background music resume automatically");

  unsubscribe();
});

test("multiple simultaneous subscribers (e.g. more than one mounted battle screen) all get notified from the ONE shared store", () => {
  const a: boolean[] = [];
  const b: boolean[] = [];
  const unsubA = subscribeSoundEnabled(() => a.push(isSoundEnabled()));
  const unsubB = subscribeSoundEnabled(() => b.push(isSoundEnabled()));

  setSoundEnabledMirror(false);

  assert.deepEqual(a, [false]);
  assert.deepEqual(b, [false]);

  unsubA();
  unsubB();
});

test("unsubscribing actually stops further notifications (no leaked listener)", () => {
  const seen: boolean[] = [];
  const unsubscribe = subscribeSoundEnabled(() => seen.push(isSoundEnabled()));
  unsubscribe();

  setSoundEnabledMirror(false);
  assert.deepEqual(seen, [], "an unsubscribed listener must never fire again");
});

// 5: victory/defeat (and attack) sounds "follow the latest setting" —
// proven here at the store level: playAttackHitSound/playVictorySound/
// playDefeatSound all call isSoundEnabled() synchronously at invocation
// time (verified by source in battle-result-sound-boundary.test.ts /
// battle-music-boundary.test.ts), so once the store itself is proven to
// hold the live value immediately (above), those call-time reads are
// correct by construction — no separate caching layer exists anywhere to
// go stale.
test("setSoundEnabledMirror called repeatedly with alternating values never leaves the store or its listeners out of sync", () => {
  const seen: boolean[] = [];
  const unsubscribe = subscribeSoundEnabled(() => seen.push(isSoundEnabled()));

  // Starts from the beforeEach-reset value (true), so i=0 (value true) is a
  // genuine no-op (already true) — the remaining 4 iterations each flip
  // the value and must each notify exactly once.
  for (let i = 0; i < 5; i++) {
    setSoundEnabledMirror(i % 2 === 0);
  }

  assert.equal(isSoundEnabled(), true);
  assert.deepEqual(seen, [false, true, false, true]);
  unsubscribe();
});

// 7: only ONE shared sound state exists — calling the setter with the same
// value as before is a safe no-op (never a phantom extra notification that
// would suggest a second, drifting copy of the state).
test("setting the same value twice does not fire a redundant notification — proves there is exactly one canonical value, not a diverging shadow copy", () => {
  const seen: boolean[] = [];
  const unsubscribe = subscribeSoundEnabled(() => seen.push(isSoundEnabled()));

  setSoundEnabledMirror(true); // already true — must be a no-op
  assert.deepEqual(seen, []);

  setSoundEnabledMirror(false);
  setSoundEnabledMirror(false); // already false now — must be a no-op
  assert.deepEqual(seen, [false]);

  unsubscribe();
});
