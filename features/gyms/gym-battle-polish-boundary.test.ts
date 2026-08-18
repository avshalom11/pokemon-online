// GYM BATTLE POLISH — source-level boundary coverage for the HUD-position
// and attack-sound wiring that a plain node:test service check can't
// exercise directly (this project has no React-render/DOM test harness —
// every existing Gym test is a service/data-layer check; see this repo's
// own established convention, e.g. gym-battle-action.service.test.ts's
// "Gym Battle code never references Field-Battle-only..." test). These
// assertions read the actual source text of the files this task changed,
// the same technique already used elsewhere in this suite.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const gymBattleContentSrc = fs.readFileSync("features/gyms/components/GymBattleContent.tsx", "utf8");
const battleHudSrc = fs.readFileSync("components/battle/BattleHUD.tsx", "utf8");
const battleSceneSrc = fs.readFileSync("components/battle/BattleScene.tsx", "utf8");

test("HUD 1/2: the Poké Ball rows are passed into BattleScene as playerHudFooter/enemyHudFooter — attached to each side's own status card, not a detached overlay", () => {
  assert.ok(gymBattleContentSrc.includes("playerHudFooter={<PokeBallRow"), "player Poké Ball row must be wired as BattleScene's playerHudFooter");
  assert.ok(gymBattleContentSrc.includes("enemyHudFooter={<PokeBallRow"), "opponent Poké Ball row must be wired as BattleScene's enemyHudFooter");

  // The OLD detached, absolutely-positioned overlay divs (left-3 top-3 /
  // bottom-24 left-3) must be gone — this is the exact bug this task
  // fixes, not just an additive change.
  assert.ok(!gymBattleContentSrc.includes("bottom-24 left-3"), "the old detached floating Poké Ball overlay position must be removed");
});

test("HUD: BattleHUD renders an optional footer slot directly beneath the HP/XP bars, inside the same status card", () => {
  assert.ok(battleHudSrc.includes("footer?: ReactNode"), "BattleHUD must expose an optional generic footer slot");
  assert.ok(battleHudSrc.includes("{footer ?"), "BattleHUD must actually render the footer slot when provided");
});

test("HUD: BattleScene forwards playerHudFooter/enemyHudFooter to each side's own BattleHUD footer prop — never a second/duplicated indicator implementation", () => {
  assert.ok(battleSceneSrc.includes("footer={playerHudFooter}"), "BattleScene must forward playerHudFooter into the player's own BattleHUD");
  assert.ok(battleSceneSrc.includes("footer={enemyHudFooter}"), "BattleScene must forward enemyHudFooter into the enemy's own BattleHUD");
});

test("AUDIO 21: the existing shared attack-sound helper is reused, never a second/duplicated implementation", () => {
  assert.ok(
    gymBattleContentSrc.includes('from "@/features/battle/utils/battle-attack-effect"'),
    "GymBattleContent must import playAttackHitSound from the EXISTING shared Field Battle audio helper"
  );
  // No Gym-only sound helper/asset was created for this task.
  assert.ok(!fs.existsSync("features/gyms/utils/gym-attack-sound-effect.ts"));
  assert.ok(!fs.existsSync("public/sounds/gym"));
  assert.ok(fs.existsSync("public/sounds/battle/attack-hit.mp3"), "the existing shared attack-hit asset must still be the one in use");
});

test("AUDIO 18/19: switching/using an item is itself silent — the sound only ever plays conditionally on the NPC's OWN free-strike response (npcAttacked)", () => {
  // Both handlers must gate playAttackHitSound() behind result.npcAttacked
  // — never call it unconditionally right after the switch/item action
  // itself succeeds.
  assert.ok(gymBattleContentSrc.includes("if (result.npcAttacked) playAttackHitSound();"), "the NPC's free-strike sound must be gated behind result.npcAttacked in both handlers");
  const npcAttackedGateCount = gymBattleContentSrc.split("if (result.npcAttacked) playAttackHitSound();").length - 1;
  assert.equal(npcAttackedGateCount, 2, "exactly two call sites (voluntary switch + Bag item) must gate the free-strike sound this way");
});

test("AUDIO 20: a rejected/non-success attack never plays a sound — the sound call sits after the invalid-active-pokemon/stale-action early returns", () => {
  const soundCallIndex = gymBattleContentSrc.indexOf("playAttackSoundsForTurn(result.events)");
  const invalidActiveReturnIndex = gymBattleContentSrc.indexOf('if (result.status === "invalid-active-pokemon")');
  const staleActionReturnIndex = gymBattleContentSrc.indexOf('if (result.status === "stale-action")');

  assert.ok(soundCallIndex > -1, "the turn's attack sound must be triggered from the resolved result's own events");
  assert.ok(invalidActiveReturnIndex > -1 && invalidActiveReturnIndex < soundCallIndex, "the invalid-active-pokemon early return must come BEFORE the sound trigger");
  assert.ok(staleActionReturnIndex > -1 && staleActionReturnIndex < soundCallIndex, "the stale-action early return must come BEFORE the sound trigger");
});
