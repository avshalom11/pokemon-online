// GAME TUTORIAL — PHASE 4: COMPLETION REWARD. UI wiring checks
// (source-level — this project has no React-render/DOM harness, same
// established convention as tutorial-phase0/1/2/3-wiring.test.ts).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const panelSrc = readFileSync(new URL("./components/TutorialPanel.tsx", import.meta.url), "utf8");
const homeReplayEntrySrc = readFileSync(new URL("./components/HomeTutorialReplayEntry.tsx", import.meta.url), "utf8");
const contextSrc = readFileSync(new URL("./context/tutorial-context.tsx", import.meta.url), "utf8");
const serviceSrc = readFileSync(new URL("./services/tutorial-progress.service.ts", import.meta.url), "utf8");
const eggTypesSrc = readFileSync(new URL("../eggs/types/egg.types.ts", import.meta.url), "utf8");

test("TutorialPanel routes the 'claim-reward' ctaKind to claimReward — a distinct handler from advance/proceed/beginAwaiting", () => {
  assert.ok(panelSrc.includes('ctaKind === "claim-reward"'));
  assert.match(panelSrc, /ctaKind === "claim-reward"\s*\?\s*claimReward/);
});

test("claimReward is a real context method, calling the real claimTutorialRewardAction — never a client-only state mutation", () => {
  assert.ok(contextSrc.includes("function claimReward()"));
  assert.ok(contextSrc.includes("await claimTutorialRewardAction()"));
});

test("HomeTutorialReplayEntry shows the completed state ('הכרת המשחק ✓') once view.status is 'completed' — moved out of HomeTutorialCard by the later 'compact after completion' presentation change", () => {
  assert.ok(homeReplayEntrySrc.includes('view.status !== "completed"'));
  assert.ok(homeReplayEntrySrc.includes("הכרת המשחק ✓"));
});

test("claimTutorialReward is server-side gated on the real currentStageId, never trusting the client alone, and uses the EXISTING currency/egg services", () => {
  assert.ok(serviceSrc.includes("if (row.currentStageId !== TUTORIAL_COMPLETION_STAGE_ID) {"));
  assert.ok(serviceSrc.includes('import { grantCurrencyRewards } from "@/features/currency/services/currency-reward.service";'));
  assert.ok(serviceSrc.includes('import { createOwnedEgg } from "@/features/eggs/services/egg-ownership.service";'));
  assert.ok(!serviceSrc.includes("tx.playerProfile.update"), "must never hand-roll the currency grant — grantCurrencyRewards is the one place PlayerProfile.coins/gold is ever incremented");
});

test("claimTutorialReward's own exactly-once guard is a single atomic updateMany, matching the codebase's established idiom (wildDefeatRewardGranted / onboardingCompleted)", () => {
  const fnBody = serviceSrc.slice(serviceSrc.indexOf("export async function claimTutorialReward"));
  assert.match(fnBody, /where: \{ playerId, currentStageId: TUTORIAL_COMPLETION_STAGE_ID, rewardClaimed: false \}/);
  assert.match(fnBody, /data: \{ rewardClaimed: true, status: "completed", completedAt: new Date\(\) \}/);
  // The reward grants must be INSIDE the same $transaction as the guard.
  const transactionBody = fnBody.slice(fnBody.indexOf("prisma.$transaction"), fnBody.indexOf("return getTutorialProgressView"));
  assert.ok(transactionBody.includes("grantCurrencyRewards(tx, playerId"));
  assert.ok(transactionBody.includes("createOwnedEgg(tx, playerId"));
});

test("the granted egg is exactly very-rare / sinnoh / source 'tutorial' — matching this task's own spec literally", () => {
  assert.ok(serviceSrc.includes('const TUTORIAL_COMPLETION_EGG_RARITY = "very-rare" as const;'));
  assert.ok(serviceSrc.includes('const TUTORIAL_COMPLETION_EGG_REGION_ID = "sinnoh";'));
  assert.ok(serviceSrc.includes('createOwnedEgg(tx, playerId, TUTORIAL_COMPLETION_EGG_RARITY, TUTORIAL_COMPLETION_EGG_REGION_ID, "tutorial")'));
});

test("the granted currency amounts are exactly 2,000 Money and 40 Gold — matching this task's own spec literally", () => {
  assert.ok(serviceSrc.includes("const TUTORIAL_COMPLETION_MONEY_REWARD = 2000;"));
  assert.ok(serviceSrc.includes("const TUTORIAL_COMPLETION_GOLD_REWARD = 40;"));
});

test("EggAcquisitionSource gained 'tutorial' as a real, closed-union member — never a raw untyped string", () => {
  assert.match(eggTypesSrc, /export type EggAcquisitionSource = "battle" \| "shop" \| "chest" \| "league" \| "tutorial";/);
});
