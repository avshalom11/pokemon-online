// CHESTS PHASE 5 — regression guard: a chest drop reported in the battle
// victory response must open the blocking ChestFoundDialog, mapped from
// the real BattleVictoryReward.chest data (never fabricated), without ever
// auto-opening the chest or suppressing the (still-silent) egg-drop data.
// BattleContent is a "use client"-tree component with no React Testing
// Library/jsdom set up in this project, so this checks the invariants via
// a static source read — same approach as features/inventory/components/
// InventoryContent.chests.test.ts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const contentSource = readFileSync(new URL("./BattleContent.tsx", import.meta.url), "utf8");

test("applyVictoryReward opens the chest-found state from the real reward.chest data, only when dropped", () => {
  assert.ok(contentSource.includes("if (reward.chest.dropped)"), "must check the real dropped flag, never assume a chest always exists");
  assert.ok(contentSource.includes("setChestFound({"), "must set the chest-found state from the real reward data");
  assert.ok(contentSource.includes("chestDisplayName: reward.chest.displayName"), "must use the server-resolved display name, never a hardcoded one");
});

test("the chest-found message is built via the shared chestFoundMessage helper, never inlined ad hoc", () => {
  assert.ok(contentSource.includes('import { chestFoundMessage }'), "must import the existing shared message helper");
  assert.ok(contentSource.includes("chestFoundMessage(defeatedWildName, reward.chest.displayName)"), "must pass the defeated wild's real name and the real chest display name");
});

test("the dialog is only rendered while chestFound is set, and dismissing it clears the state (never auto-opens the chest)", () => {
  // EGG DROP — CONFIRMATION DIALOG — chestFound now renders in an
  // `: chestFound ? (` else-if branch (deferred behind eggFound, see
  // BattleContent.egg-found.test.ts's own sequencing test) rather than its
  // own top-level `{chestFound ? (` conditional — still exactly one
  // condition gating the dialog, just chained after eggFound's.
  assert.ok(contentSource.includes(": chestFound ? ("), "the dialog must be conditionally rendered");
  assert.ok(contentSource.includes("onConfirm={() => setChestFound(null)}"), "confirming must only dismiss the dialog, never call an opening action");
  assert.ok(!/chestFound[\s\S]{0,80}openChestAction/.test(contentSource), "must never call openChestAction from the battle screen");
});

