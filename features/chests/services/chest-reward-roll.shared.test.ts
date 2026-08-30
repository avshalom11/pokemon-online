// CHESTS PHASE 2 — cross-tier coverage: every item/incubator id a chest
// reward can ever reference resolves against the REAL, existing project
// catalogs (never an invented substitute id), and the reward-roll engine
// itself writes nothing to any database.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import { isEvolutionItemId } from "@/data/pokemon/pokemon-evolutions";
import { getIncubatorDefinition } from "@/features/eggs/data/incubator-definitions";
import { EVOLUTION_ITEM_CATALOG, rollChestReward } from "./chest-reward-roll.service.ts";
import { paddedRandom } from "../../../test/support/deterministic-random.ts";

const POKE_BALL_IDS = ["poke-ball", "great-ball", "ultra-ball", "master-ball"];
const POTION_IDS = ["potion", "super-potion", "hyper-potion", "max-potion"];
const REVIVE_IDS = ["revive", "max-revive"];

test("the evolution-item catalog reused by this feature is exactly the existing 12-item catalog, never a chest-specific list", () => {
  assert.equal(EVOLUTION_ITEM_CATALOG.length, 12);
  for (const itemId of EVOLUTION_ITEM_CATALOG) {
    assert.ok(isEvolutionItemId(itemId), `${itemId} must be a real, recognized EvolutionItemId`);
    assert.ok(getShopItemById(itemId), `${itemId} must resolve as a real Shop catalog entry`);
  }
});

test("every item/incubator id ANY chest tier can ever produce resolves against a real, existing catalog entry", () => {
  // Sweep both extreme deterministic paths for all 3 tiers plus a handful
  // of mid-range sequences, covering every reachable branch of every
  // builder — never a statistical sample, every value here is exact.
  const sequences = [paddedRandom([], 0), paddedRandom([], 0.999999), paddedRandom([0.4, 0.2, 0.6, 0.8], 0.3)];

  for (const chestTypeId of ["silver", "gold", "diamond"] as const) {
    for (const random of sequences) {
      const results = rollChestReward(chestTypeId, random);

      for (const reward of results) {
        if (reward.category === "poke-balls") {
          assert.ok(POKE_BALL_IDS.includes(reward.itemId), `${reward.itemId} must be a real Poké Ball id`);
          assert.ok(getShopItemById(reward.itemId), `${reward.itemId} must resolve in the Shop catalog`);
        }
        if (reward.category === "potions") {
          assert.ok(POTION_IDS.includes(reward.itemId), `${reward.itemId} must be a real Potion id`);
          assert.ok(getShopItemById(reward.itemId), `${reward.itemId} must resolve in the Shop catalog`);
        }
        if (reward.category === "revive") {
          assert.ok(REVIVE_IDS.includes(reward.itemId), `${reward.itemId} must be a real Revive id`);
          assert.ok(getShopItemById(reward.itemId), `${reward.itemId} must resolve in the Shop catalog`);
        }
        if (reward.category === "incubator") {
          // Throws if the incubator type doesn't resolve — the assertion
          // IS that this call never throws.
          assert.doesNotThrow(() => getIncubatorDefinition(reward.incubatorTypeId));
        }
        if (reward.category === "evolution-item") {
          for (const item of reward.items) {
            assert.ok(isEvolutionItemId(item.itemId), `${item.itemId} must be a real EvolutionItemId`);
            assert.ok(getShopItemById(item.itemId), `${item.itemId} must resolve in the Shop catalog`);
          }
        }
      }
    }
  }
});

test("rollChestReward never touches Prisma/the database — pure, framework-free module (structural source check)", () => {
  const source = readFileSync(new URL("./chest-reward-roll.service.ts", import.meta.url), "utf8");
  assert.ok(!source.includes('import "server-only"'), "must remain a pure, framework-free module — no server-only tag");
  assert.ok(!/from ["'].*prisma/i.test(source), "must never import Prisma");
  assert.ok(!source.includes("@/lib/db"), "must never import the DB client");
  assert.ok(!/grantChest|consumeChest|grantIncubator|grantCurrencyRewards|createOwnedEgg/.test(source), "must never call any ownership/grant/consume primitive — pure reward SELECTION only");
});

test("rollChestReward is a pure function: calling it twice with the same deterministic random produces the identical result", () => {
  const first = rollChestReward("diamond", paddedRandom([], 0));
  const second = rollChestReward("diamond", paddedRandom([], 0));
  assert.deepEqual(first, second);
});
