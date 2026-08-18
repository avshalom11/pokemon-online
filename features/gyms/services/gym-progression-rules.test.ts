import assert from "node:assert/strict";
import { test } from "node:test";

import {
  battleSlotKey,
  isGymBattleUnlocked,
  isGymUnlocked,
  isRegionalChampionUnlocked,
  type RegionGymProgressSnapshot,
} from "./gym-progression-rules.ts";

function snapshotFrom(completed: string[]): RegionGymProgressSnapshot {
  return { completedBattleSlots: new Set(completed) };
}

const EMPTY = snapshotFrom([]);

test("Gym 1 is always unlocked, even with no progress at all", () => {
  assert.equal(isGymUnlocked(EMPTY, 1), true);
});

test("Gym 2 is locked until Gym 1 is fully completed (Leader won)", () => {
  assert.equal(isGymUnlocked(EMPTY, 2), false);
  assert.equal(isGymUnlocked(snapshotFrom([battleSlotKey(1, "easy"), battleSlotKey(1, "medium")]), 2), false, "Easy+Medium alone must not unlock Gym 2");
  assert.equal(isGymUnlocked(snapshotFrom([battleSlotKey(1, "leader")]), 2), true);
});

test("Gym 3 is locked until Gym 2 is fully completed (Leader won)", () => {
  const gym1Done = [battleSlotKey(1, "leader")];
  assert.equal(isGymUnlocked(snapshotFrom(gym1Done), 3), false);
  assert.equal(isGymUnlocked(snapshotFrom([...gym1Done, battleSlotKey(2, "leader")]), 3), true);
});

test("within a Gym: Easy always unlocked, Medium locked until Easy, Leader locked until Easy+Medium", () => {
  assert.equal(isGymBattleUnlocked(EMPTY, 1, "easy"), true);
  assert.equal(isGymBattleUnlocked(EMPTY, 1, "medium"), false, "Medium locked while Easy is not completed");
  assert.equal(isGymBattleUnlocked(EMPTY, 1, "leader"), false, "Leader locked while Easy+Medium are not completed");

  const easyDone = snapshotFrom([battleSlotKey(1, "easy")]);
  assert.equal(isGymBattleUnlocked(easyDone, 1, "medium"), true);
  assert.equal(isGymBattleUnlocked(easyDone, 1, "leader"), false, "Leader still locked until Medium is completed");

  const easyAndMediumDone = snapshotFrom([battleSlotKey(1, "easy"), battleSlotKey(1, "medium")]);
  assert.equal(isGymBattleUnlocked(easyAndMediumDone, 1, "leader"), true);
});

test("a battle inside a locked Gym is never independently unlocked", () => {
  // Gym 1 not yet fully completed -> Gym 2 is locked, so even Gym 2's own
  // Easy battle (which WOULD be unlocked in isolation) must stay locked.
  assert.equal(isGymBattleUnlocked(EMPTY, 2, "easy"), false);
});

test("the player cannot skip a battle: losing Medium leaves Easy complete and Medium retryable, Leader still locked", () => {
  const afterLosingMedium = snapshotFrom([battleSlotKey(1, "easy")]);
  assert.equal(isGymBattleUnlocked(afterLosingMedium, 1, "medium"), true, "Medium remains retryable");
  assert.equal(isGymBattleUnlocked(afterLosingMedium, 1, "leader"), false);
});

test("Regional Champion is locked until all 3 Gym Badges (Leader battles) in the region are earned", () => {
  assert.equal(isRegionalChampionUnlocked(EMPTY), false);
  const twoOfThree = snapshotFrom([battleSlotKey(1, "leader"), battleSlotKey(2, "leader")]);
  assert.equal(isRegionalChampionUnlocked(twoOfThree), false);
  const allThree = snapshotFrom([battleSlotKey(1, "leader"), battleSlotKey(2, "leader"), battleSlotKey(3, "leader")]);
  assert.equal(isRegionalChampionUnlocked(allThree), true);
});
