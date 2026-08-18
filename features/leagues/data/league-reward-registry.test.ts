// GYMS & LEAGUES PHASE 8 — focused coverage for the reward registry data
// itself (REGIONAL REWARDS items 19-24, CHAMPIONS REWARDS items 25-28).
// Pure data assertions — no DB.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getLeagueParticipationRewardDefinition, getLeaguePlacementRewardDefinition } from "./league-reward-registry.ts";

test("League I exact rewards", () => {
  const first = getLeaguePlacementRewardDefinition("league-1", 1);
  assert.deepEqual(
    { money: first.money, xp: first.xpPercentOfNextLevel, gold: first.gold, chests: first.chestRewards },
    { money: 10_000, xp: 50, gold: 100, chests: [{ chestTypeId: "gold", quantity: 1 }] }
  );
  assert.equal(first.achievementLabel, "League I Trophy");

  const second = getLeaguePlacementRewardDefinition("league-1", 2);
  assert.deepEqual(
    { money: second.money, xp: second.xpPercentOfNextLevel, gold: second.gold, chests: second.chestRewards },
    { money: 7_000, xp: 35, gold: 50, chests: [{ chestTypeId: "silver", quantity: 1 }] }
  );
  assert.equal(second.achievementLabel, "Silver Medal");

  const third = getLeaguePlacementRewardDefinition("league-1", 3);
  assert.deepEqual(
    { money: third.money, xp: third.xpPercentOfNextLevel, gold: third.gold, chests: third.chestRewards },
    { money: 4_000, xp: 25, gold: 20, chests: [{ chestTypeId: "silver", quantity: 1 }] }
  );
  assert.equal(third.achievementLabel, "Bronze Medal");
});

test("League II exact rewards", () => {
  const first = getLeaguePlacementRewardDefinition("league-2", 1);
  assert.deepEqual(
    { money: first.money, xp: first.xpPercentOfNextLevel, gold: first.gold, chests: first.chestRewards },
    { money: 15_000, xp: 50, gold: 150, chests: [{ chestTypeId: "gold", quantity: 2 }] }
  );

  const second = getLeaguePlacementRewardDefinition("league-2", 2);
  assert.deepEqual(
    { money: second.money, xp: second.xpPercentOfNextLevel, gold: second.gold, chests: second.chestRewards },
    { money: 10_000, xp: 35, gold: 100, chests: [{ chestTypeId: "gold", quantity: 1 }] }
  );

  const third = getLeaguePlacementRewardDefinition("league-2", 3);
  assert.deepEqual(
    { money: third.money, xp: third.xpPercentOfNextLevel, gold: third.gold, chests: third.chestRewards },
    { money: 7_000, xp: 25, gold: 50, chests: [{ chestTypeId: "silver", quantity: 1 }] }
  );
});

test("League III exact rewards", () => {
  const first = getLeaguePlacementRewardDefinition("league-3", 1);
  assert.deepEqual(
    { money: first.money, xp: first.xpPercentOfNextLevel, gold: first.gold, chests: first.chestRewards },
    { money: 20_000, xp: 50, gold: 200, chests: [{ chestTypeId: "diamond", quantity: 1 }] }
  );

  const second = getLeaguePlacementRewardDefinition("league-3", 2);
  assert.deepEqual(
    { money: second.money, xp: second.xpPercentOfNextLevel, gold: second.gold, chests: second.chestRewards },
    { money: 15_000, xp: 35, gold: 150, chests: [{ chestTypeId: "gold", quantity: 2 }] }
  );

  const third = getLeaguePlacementRewardDefinition("league-3", 3);
  assert.deepEqual(
    { money: third.money, xp: third.xpPercentOfNextLevel, gold: third.gold, chests: third.chestRewards },
    { money: 10_000, xp: 25, gold: 100, chests: [{ chestTypeId: "silver", quantity: 2 }] }
  );
});

test("League I participation reward: Common Egg x1 + Money 1000", () => {
  const reward = getLeagueParticipationRewardDefinition("league-1");
  assert.equal(reward.money, 1_000);
  assert.deepEqual(reward.eggRewards, [{ rarity: "common", quantity: 1 }]);
});

test("League II participation reward: Common Egg x1 + Money 3000", () => {
  const reward = getLeagueParticipationRewardDefinition("league-2");
  assert.equal(reward.money, 3_000);
  assert.deepEqual(reward.eggRewards, [{ rarity: "common", quantity: 1 }]);
});

test("League III participation reward: Rare Egg x1 + Money 4000", () => {
  const reward = getLeagueParticipationRewardDefinition("league-3");
  assert.equal(reward.money, 4_000);
  assert.deepEqual(reward.eggRewards, [{ rarity: "rare", quantity: 1 }]);
});

test("Champions League exact placement rewards", () => {
  const first = getLeaguePlacementRewardDefinition("champions-league", 1);
  assert.deepEqual(
    { money: first.money, xp: first.xpPercentOfNextLevel, gold: first.gold, chests: first.chestRewards },
    { money: 30_000, xp: 50, gold: 400, chests: [{ chestTypeId: "diamond", quantity: 2 }] }
  );
  assert.equal(first.achievementLabel, "Champions League Trophy");

  const second = getLeaguePlacementRewardDefinition("champions-league", 2);
  assert.deepEqual(
    { money: second.money, xp: second.xpPercentOfNextLevel, gold: second.gold, chests: second.chestRewards },
    {
      money: 20_000,
      xp: 35,
      gold: 200,
      chests: [
        { chestTypeId: "gold", quantity: 2 },
        { chestTypeId: "silver", quantity: 2 },
      ],
    }
  );

  const third = getLeaguePlacementRewardDefinition("champions-league", 3);
  assert.deepEqual(
    { money: third.money, xp: third.xpPercentOfNextLevel, gold: third.gold, chests: third.chestRewards },
    { money: 15_000, xp: 25, gold: 150, chests: [{ chestTypeId: "gold", quantity: 2 }] }
  );
});

test("Champions League participation reward: Common Egg x1 + Rare Egg x1 + Money 5000", () => {
  const reward = getLeagueParticipationRewardDefinition("champions-league");
  assert.equal(reward.money, 5_000);
  assert.deepEqual(reward.eggRewards, [
    { rarity: "common", quantity: 1 },
    { rarity: "rare", quantity: 1 },
  ]);
});
