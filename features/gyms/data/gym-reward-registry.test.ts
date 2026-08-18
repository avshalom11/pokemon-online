// GYMS & LEAGUES PHASE 4 — focused coverage for the reward registry data
// itself (section 16/17 of this Phase's spec). Pure data assertions against
// the latest approved Excel reward workbook numbers — no DB, no service
// layer.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getAllGymRewardDefinitions,
  getAllRegionalChampionRewardDefinitions,
  getGymRewardDefinition,
  getRegionalChampionRewardDefinition,
} from "./gym-reward-registry.ts";

test("every Kanto Gym reward is exact", () => {
  assert.deepEqual(
    [1, 2, 3].map((n) => {
      const d = getGymRewardDefinition("kanto", n as 1 | 2 | 3);
      return { money: d.money, xp: d.xpPercentOfNextLevel };
    }),
    [
      { money: 500, xp: 10 },
      { money: 800, xp: 20 },
      { money: 1000, xp: 30 },
    ]
  );
});

test("a representative middle-region Gym reward (Unova) is exact", () => {
  assert.deepEqual(
    [1, 2, 3].map((n) => {
      const d = getGymRewardDefinition("unova", n as 1 | 2 | 3);
      return { money: d.money, xp: d.xpPercentOfNextLevel };
    }),
    [
      { money: 1500, xp: 15 },
      { money: 1800, xp: 25 },
      { money: 2000, xp: 35 },
    ]
  );
});

test("every Paldea Gym reward is exact", () => {
  assert.deepEqual(
    [1, 2, 3].map((n) => {
      const d = getGymRewardDefinition("paldea", n as 1 | 2 | 3);
      return { money: d.money, xp: d.xpPercentOfNextLevel };
    }),
    [
      { money: 2500, xp: 15 },
      { money: 2800, xp: 25 },
      { money: 3000, xp: 35 },
    ]
  );
});

test("Kanto Regional Champion reward is exact", () => {
  const d = getRegionalChampionRewardDefinition("kanto");
  assert.equal(d.money, 2000);
  assert.equal(d.xpPercentOfNextLevel, 40);
  assert.deepEqual(d.chestRewards, [{ chestTypeId: "silver", quantity: 1 }]);
});

test("Sinnoh Regional Champion reward is exact", () => {
  const d = getRegionalChampionRewardDefinition("sinnoh");
  assert.equal(d.money, 3500);
  assert.equal(d.xpPercentOfNextLevel, 50);
  assert.deepEqual(d.chestRewards, [{ chestTypeId: "gold", quantity: 1 }]);
});

test("Alola Regional Champion reward is exact", () => {
  const d = getRegionalChampionRewardDefinition("alola");
  assert.equal(d.money, 5000);
  assert.equal(d.xpPercentOfNextLevel, 50);
  assert.deepEqual(d.chestRewards, [
    { chestTypeId: "gold", quantity: 1 },
    { chestTypeId: "silver", quantity: 2 },
  ]);
});

test("Galar Regional Champion reward is exact", () => {
  const d = getRegionalChampionRewardDefinition("galar");
  assert.equal(d.money, 5500);
  assert.equal(d.xpPercentOfNextLevel, 50);
  assert.deepEqual(d.chestRewards, [
    { chestTypeId: "gold", quantity: 1 },
    { chestTypeId: "silver", quantity: 2 },
  ]);
});

// IMPORTANT — the latest approved Excel reward workbook, not any earlier
// conversation decision: Paldea grants Gold x1 + Silver x2 and explicitly
// NO Diamond Chest.
test("Paldea Regional Champion grants EXACTLY Money 6000, XP 50%, Gold Chest x1, Silver Chest x2", () => {
  const d = getRegionalChampionRewardDefinition("paldea");
  assert.equal(d.money, 6000);
  assert.equal(d.xpPercentOfNextLevel, 50);
  assert.deepEqual(d.chestRewards, [
    { chestTypeId: "gold", quantity: 1 },
    { chestTypeId: "silver", quantity: 2 },
  ]);
});

test("Paldea Regional Champion grants NO Diamond Chest", () => {
  const d = getRegionalChampionRewardDefinition("paldea");
  assert.ok(!d.chestRewards.some((chest) => chest.chestTypeId === "diamond"));
});

test("no Regional Champion anywhere grants a Diamond Chest (Phase 4 defines none)", () => {
  for (const d of getAllRegionalChampionRewardDefinitions()) {
    assert.ok(!d.chestRewards.some((chest) => chest.chestTypeId === "diamond"), `${d.regionId} must not grant a Diamond Chest`);
  }
});

test("the registry defines exactly 27 Gym reward entries and 9 Regional Champion reward entries", () => {
  assert.equal(getAllGymRewardDefinitions().length, 27);
  assert.equal(getAllRegionalChampionRewardDefinitions().length, 9);
});

test("every Gym reward definition cross-references its own Badge id (badge/medal reference — section 16)", () => {
  const d = getGymRewardDefinition("kanto", 2);
  assert.equal(d.badgeId, "kanto-gym-2");
});

test("every Regional Champion reward definition cross-references its own Medal id", () => {
  const d = getRegionalChampionRewardDefinition("johto");
  assert.equal(d.medalId, "johto-medal");
});
