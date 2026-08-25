// GAME TUTORIAL — PHASE 0. UI wiring checks (source-level — this project has
// no React-render/DOM harness, same established convention as e.g.
// features/move-learning/move-learning-ux.test.ts's own "UI wiring
// (source-level)" section).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const layoutSrc = readFileSync(new URL("../../app/(game)/layout.tsx", import.meta.url), "utf8");
const providerSrc = readFileSync(new URL("./context/tutorial-context.tsx", import.meta.url), "utf8");
const panelSrc = readFileSync(new URL("./components/TutorialPanel.tsx", import.meta.url), "utf8");
const homeCardSrc = readFileSync(new URL("./components/HomeTutorialCard.tsx", import.meta.url), "utf8");
const homeContentSrc = readFileSync(new URL("../home/components/HomeContent.tsx", import.meta.url), "utf8");
const serviceSrc = readFileSync(new URL("./services/tutorial-progress.service.ts", import.meta.url), "utf8");

test("the (game) layout mounts TutorialProvider (seeded from the real server-side view) and TutorialPanel exactly once", () => {
  assert.ok(layoutSrc.includes('import { TutorialProvider } from "@/features/tutorial/context/tutorial-context";'));
  assert.ok(layoutSrc.includes('import { TutorialPanel } from "@/features/tutorial/components/TutorialPanel";'));
  assert.ok(layoutSrc.includes('import { getTutorialProgressView } from "@/features/tutorial/services/tutorial-progress.service";'));
  assert.ok(layoutSrc.includes("getTutorialProgressView(profile.id)"), "must seed from the real per-request server read, never client-only state");
  assert.match(layoutSrc, /<TutorialProvider initial=\{tutorialProgress\}>/);
  assert.equal((layoutSrc.match(/<TutorialPanel \/>/g) ?? []).length, 1, "the panel must be mounted exactly once");
});

test("TutorialProvider auto-opens the panel ONLY when the seeded status is not_started — never unconditionally, never for in_progress/completed", () => {
  assert.match(providerSrc, /useState<TutorialPanelMode>\(initial\.status === "not_started" \? "explaining" : "closed"\)/);
});

test("Stage 1's 'no postpone option' rule is entirely data-driven (registry's canPostpone), never a hardcoded stage-id special case in the panel", () => {
  assert.ok(panelSrc.includes("currentStage.canPostpone"));
  assert.ok(!panelSrc.includes('"welcome"'), "the panel must never special-case the welcome stage id directly — the registry's canPostpone flag is the only source of truth");
});

test("the panel renders nothing once closed, or completed while live (PHASE 5 — replay reuses the same panel component with a live-only completed guard), and only ever shows one full dialog", () => {
  assert.match(panelSrc, /if \(panelMode === "closed"\) return null;/);
  assert.match(panelSrc, /if \(mode === "live" && view\.status === "completed"\) return null;/);
  assert.equal((panelSrc.match(/role="dialog"/g) ?? []).length, 1);
});

test("advancing and postponing both go through the real Server Actions — the panel never mutates progress itself", () => {
  assert.ok(panelSrc.includes("advance") && panelSrc.includes("postpone"));
  assert.ok(!panelSrc.includes("prisma"), "a client component must never touch Prisma directly");
});

test("HomeTutorialCard only shows while the tutorial is in_progress AND panelMode is 'closed' — never while the panel or the spotlight banner is showing", () => {
  assert.match(homeCardSrc, /if \(view\.status !== "in_progress" \|\| panelMode !== "closed"\) return null;/);
});

test("HomeTutorialCard shows the real current stage's progress via the shared ProgressBar primitive, never a fabricated percent", () => {
  assert.ok(homeCardSrc.includes('import { ProgressBar } from "@/components/battle/ProgressBar";'));
  assert.ok(homeCardSrc.includes("percent={view.progressPercent}"));
  assert.ok(homeCardSrc.includes("המשך הכרת המשחק"));
});

test("HomeContent mounts HomeTutorialCard", () => {
  assert.ok(homeContentSrc.includes('import { HomeTutorialCard } from "@/features/tutorial/components/HomeTutorialCard";'));
  assert.ok(homeContentSrc.includes("<HomeTutorialCard />"));
});

test("the progress service never lets an unrecognized persisted stage id crash the view — it always falls back to the first stage", () => {
  assert.ok(serviceSrc.includes("resolvedStage ?? getTutorialStageById(FIRST_TUTORIAL_STAGE_ID)!"));
});

test("PHASE 0 never touches selectStarterPokemon's own onboarding transaction — the Tutorial row is created lazily, independently", () => {
  const onboardingSrc = readFileSync(
    new URL("../onboarding/services/select-starter.service.ts", import.meta.url),
    "utf8"
  );
  assert.ok(!onboardingSrc.includes("tutorial"), "onboarding must stay entirely unaware the Tutorial exists");
});
