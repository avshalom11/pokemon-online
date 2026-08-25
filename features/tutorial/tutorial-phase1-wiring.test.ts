// GAME TUTORIAL — PHASE 1: NAVIGATION + SPOTLIGHT. UI wiring checks
// (source-level — this project has no React-render/DOM harness, same
// established convention as tutorial-phase0-wiring.test.ts and e.g.
// features/move-learning/move-learning-ux.test.ts's own "UI wiring
// (source-level)" section).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const layoutSrc = readFileSync(new URL("../../app/(game)/layout.tsx", import.meta.url), "utf8");
const contextSrc = readFileSync(new URL("./context/tutorial-context.tsx", import.meta.url), "utf8");
const panelSrc = readFileSync(new URL("./components/TutorialPanel.tsx", import.meta.url), "utf8");
const overlaySrc = readFileSync(new URL("./components/TutorialSpotlightOverlay.tsx", import.meta.url), "utf8");
const sidebarSrc = readFileSync(new URL("../../components/layout/GameSidebar.tsx", import.meta.url), "utf8");
const myPokemonSrc = readFileSync(new URL("../pokemon/components/MyPokemonContent.tsx", import.meta.url), "utf8");
const mapSrc = readFileSync(new URL("../../app/(game)/map/components/InteractiveWorldMap.tsx", import.meta.url), "utf8");
const socialDockSrc = readFileSync(new URL("../friends/components/SocialDock.tsx", import.meta.url), "utf8");

test("the (game) layout mounts TutorialSpotlightOverlay exactly once, alongside TutorialPanel", () => {
  assert.ok(layoutSrc.includes('import { TutorialSpotlightOverlay } from "@/features/tutorial/components/TutorialSpotlightOverlay";'));
  assert.equal((layoutSrc.match(/<TutorialSpotlightOverlay \/>/g) ?? []).length, 1);
});

test("the Tutorial never navigates for the player itself — no router.push/replace anywhere in its own client code", () => {
  for (const [name, src] of [
    ["tutorial-context.tsx", contextSrc],
    ["TutorialPanel.tsx", panelSrc],
    ["TutorialSpotlightOverlay.tsx", overlaySrc],
  ] as const) {
    assert.ok(!/router\.(push|replace)\(/.test(src), `${name} must never navigate on the player's behalf`);
  }
});

test("real navigation is detected generically via usePathname — no per-page integration needed for any navigate-signal stage", () => {
  assert.ok(contextSrc.includes('import { usePathname } from "next/navigation";'));
  assert.ok(contextSrc.includes("pathname.startsWith(active.signal.expectedPathname)"));
});

test("the spotlight overlay is purely visual — every element it renders carries pointer-events-none, never blocking a click", () => {
  const divBlocks = overlaySrc.match(/<div[\s\S]*?\/>/g) ?? [];
  const realDivs = divBlocks.filter((block) => block.includes("aria-hidden"));
  assert.ok(realDivs.length >= 2, "must render both the dim layer and the ring");
  assert.ok(realDivs.every((block) => block.includes("pointer-events-none")), "every spotlight element must never intercept clicks");
});

test("the spotlight overlay renders nothing when the target isn't found — never a dimmed screen with nothing highlighted", () => {
  assert.match(overlaySrc, /if \(!active \|\| !rect\) return null;/);
});

test("the spotlight follows the real element across resizes/scroll — a ResizeObserver plus window resize/scroll listeners, never a one-time measurement", () => {
  assert.ok(overlaySrc.includes("new ResizeObserver"));
  assert.ok(overlaySrc.includes('addEventListener("scroll"'));
  assert.ok(overlaySrc.includes('addEventListener("resize"'));
});

test("useTutorialTarget is exported from the context module for real UI components to register real spotlight targets", () => {
  assert.ok(contextSrc.includes("export function useTutorialTarget"));
});

test("GameSidebar registers the sidebar-opener target and every real sidebar link under its own stable 'sidebar-<id>' id, reusing sidebar-menu.ts's own ids", () => {
  assert.ok(sidebarSrc.includes('useTutorialTarget("sidebar-opener")'));
  assert.ok(sidebarSrc.includes("ref={sidebarOpenerTargetRef}"));
  assert.ok(sidebarSrc.includes("useTutorialTarget(`sidebar-${item.id}`)"));
  assert.ok(sidebarSrc.includes("ref={targetRef}"));
});

test("GameSidebar reports 'sidebar-opened' the instant isOpen transitions to true — never on mount, never on close", () => {
  assert.match(sidebarSrc, /if \(!wasOpenRef\.current && isOpen\) \{\s*reportAction\("sidebar-opened"\);/);
});

test("MyPokemonContent registers the party-section target and reports 'starter-details-opened' only for the real Starter, never any occupied slot", () => {
  assert.ok(myPokemonSrc.includes('useTutorialTarget("my-pokemon-party-section")'));
  assert.ok(myPokemonSrc.includes("ref={partySectionTargetRef}"));
  assert.match(myPokemonSrc, /if \(occupant\.isStarter\) reportAction\("starter-details-opened"\);/);
});

test("InteractiveWorldMap registers ONLY the grassland zone polygon as a spotlight target, via a single STABLE callback ref (never the useTutorialTarget hook inside a .map())", () => {
  assert.ok(mapSrc.includes('const { registerTarget, unregisterTarget } = useTutorial();'));
  // MAP CRASH FIX — the ref callback must be memoized (useCallback) rather
  // than an inline arrow function recreated every render: an unstable ref
  // identity gets detached+reattached by React on every single re-render,
  // and since detaching calls unregisterTarget (which itself bumps
  // registryVersion and re-renders this component), an inline ref here
  // caused a real infinite register/unregister loop ("Maximum update depth
  // exceeded") the moment the Grassland polygon mounted.
  assert.match(mapSrc, /const registerGrasslandRef = useCallback\(/);
  assert.ok(mapSrc.includes("[registerTarget, unregisterTarget]"), "the memoized ref callback must depend on the (stable) register/unregister functions");
  assert.ok(mapSrc.includes('ref={region.zoneId === "grassland" ? registerGrasslandRef : undefined}'));
  assert.ok(!mapSrc.includes("useTutorialTarget("), "must never call the per-component hook from inside a dynamic .map() loop");
});

test("SocialDock registers the friends-bar target on both of its two mutually-exclusive render branches", () => {
  assert.ok(socialDockSrc.includes('useTutorialTarget("friends-bar")'));
  assert.equal((socialDockSrc.match(/ref=\{friendsBarTargetRef\}/g) ?? []).length, 2, "both the row-mode and the standalone dock div must register the same target");
});

test("the panel's minimized banner shows short guidance (never the full explanation) plus a manual confirm button only for a 'manual' signal", () => {
  const awaitingBlock = panelSrc.slice(panelSrc.indexOf('panelMode === "awaiting"'), panelSrc.indexOf("const { copy, ctaKind }"));
  assert.ok(awaitingBlock.includes("active.target.guidance"));
  assert.ok(awaitingBlock.includes('active.signal.kind === "manual"'));
  assert.ok(awaitingBlock.includes("confirmManualTarget"));
});

test("postponing remains reachable from the minimized banner too, gated on the same registry canPostpone flag", () => {
  const awaitingBlock = panelSrc.slice(panelSrc.indexOf('panelMode === "awaiting"'), panelSrc.indexOf("const { copy, ctaKind }"));
  // PHASE 5 — the panel reads canPostpone off activeView (live view.currentStage
  // or, during replay, replayView.currentStage) rather than view directly.
  assert.ok(awaitingBlock.includes("activeView.currentStage.canPostpone"));
  assert.ok(awaitingBlock.includes("onClick={postpone}"));
});

test("completing a target always goes through the real Server Actions (advanceTutorialStageAction / advanceTutorialSubStepAction), never a client-only state mutation pretending progress advanced", () => {
  assert.ok(contextSrc.includes("await advanceTutorialStageAction()"));
  assert.ok(contextSrc.includes("await advanceTutorialSubStepAction()"));
});
