// LEAGUE PLACEMENT CELEBRATION — ANIMATED FIREWORKS. No React-render/DOM
// harness exists in this project (see PokedexCard.test.ts's own doc
// comment) — this checks the invariants via a static source read instead
// of rendering.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const fireworksSrc = readFileSync(new URL("./LeagueCelebrationFireworks.tsx", import.meta.url), "utf8");
const globalsCssSrc = readFileSync(new URL("../../../app/globals.css", import.meta.url), "utf8");

test("the fireworks layer is pointer-events-none — it can never intercept the אישור button's clicks", () => {
  assert.ok(fireworksSrc.includes('className="pointer-events-none absolute inset-0 overflow-hidden"'));
});

test("particle motion is pure CSS transform/opacity — no per-frame React state updates (requestAnimationFrame is never used)", () => {
  assert.ok(!fireworksSrc.includes("requestAnimationFrame"), "no per-frame JS animation driver may be used");
  assert.ok(fireworksSrc.includes("animate-league-firework-particle"), "particle motion must be driven by the shared CSS keyframe");
});

test("the shared league-firework-particle keyframe animates via transform/opacity only, and is defined exactly once in app/globals.css", () => {
  const keyframeMatches = globalsCssSrc.match(/@keyframes league-firework-particle/g) ?? [];
  assert.equal(keyframeMatches.length, 1, "the keyframe must be defined exactly once, never duplicated");
  assert.ok(globalsCssSrc.includes("transform: translate(var(--firework-dx, 0), var(--firework-dy, 0)) scale(0.15);"));
  assert.ok(globalsCssSrc.includes("opacity: 0;"));
});

test("reduced motion: no bursts are ever scheduled when prefers-reduced-motion is set — the effect returns immediately", () => {
  assert.ok(fireworksSrc.includes('window.matchMedia("(prefers-reduced-motion: reduce)").matches'));
  const matchIndex = fireworksSrc.indexOf('window.matchMedia("(prefers-reduced-motion: reduce)").matches');
  const nextLine = fireworksSrc.slice(matchIndex, matchIndex + 80);
  assert.ok(/matches\)\s*return;/.test(nextLine), "the reduced-motion check must bail out before scheduling any burst");
});

test("bursts spawn repeatedly (not just once) via a self-rescheduling timeout, and are capped so the DOM never grows unbounded", () => {
  assert.ok(fireworksSrc.includes("setTimeout(spawnBurst,"), "spawnBurst must reschedule itself for continuous occasional bursts");
  assert.ok(fireworksSrc.includes("maxConcurrentBursts"), "concurrent bursts must be capped");
  assert.ok(/next\.length > maxConcurrentBursts \? next\.slice/.test(fireworksSrc), "the burst list must be trimmed once the cap is exceeded");
});

test("every timeout is tracked and cleared on cleanup — no leaked timers when the celebration changes or the component unmounts", () => {
  assert.ok(fireworksSrc.includes("const timeouts: ReturnType<typeof setTimeout>[] = [];"));
  assert.ok(/for \(const timeout of timeouts\) clearTimeout\(timeout\);/.test(fireworksSrc), "the cleanup function must clear every scheduled timeout");
  assert.ok(fireworksSrc.includes("setBursts([]);"), "the cleanup must also clear any bursts still on screen");
});

test("the effect re-runs (fresh burst schedule) only when `intense` changes, matching a fresh mount per celebration", () => {
  const useEffectIndex = fireworksSrc.indexOf("useEffect(() => {");
  const dependencyArrayMatch = fireworksSrc.slice(useEffectIndex, useEffectIndex + 3000).match(/\}, \[intense\]\);/);
  assert.ok(dependencyArrayMatch, "the burst-scheduling effect's dependency array must be exactly [intense]");
});

test("1st place gets a more intense treatment than 2nd/3rd through ONE shared component, never three separate fireworks systems", () => {
  assert.ok(fireworksSrc.includes("intense ? 16 : 11"), "particle count must scale with the shared `intense` flag");
  assert.ok(fireworksSrc.includes("intense ? 5 : 3"), "max concurrent bursts must scale with the shared `intense` flag");
  assert.equal((fireworksSrc.match(/export function LeagueCelebrationFireworks/g) ?? []).length, 1, "exactly one exported component must exist");
});

test("no external animation/confetti/fireworks library was introduced — colors and positions are plain inline data", () => {
  const importLines = fireworksSrc.match(/^import .+$/gm) ?? [];
  for (const line of importLines) {
    assert.ok(
      line.includes('from "react"') || line.startsWith("//"),
      `unexpected import in the fireworks component: ${line}`
    );
  }
});
