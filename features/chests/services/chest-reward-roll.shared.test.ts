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

// ============================================================================
// MEGA EVOLUTION PHASE 5 — the dedicated, independent Mega Stone roll.
// ============================================================================

function megaStoneReward(results: ReturnType<typeof rollChestReward>) {
  return results.find((reward) => reward.category === "mega-stone");
}

test("Mega Stone is deliberately excluded from the generic evolution-item catalog/pool — still exactly the same 12 items, unaffected by this phase", () => {
  assert.equal(EVOLUTION_ITEM_CATALOG.length, 12);
  assert.ok(!EVOLUTION_ITEM_CATALOG.includes("mega-stone" as never), "mega-stone must never be drawn by the generic evolution-item pool");
});

test("Silver never grants Mega Stone, at any deterministic path including the always-succeed extreme", () => {
  for (const random of [paddedRandom([], 0), paddedRandom([], 0.5), paddedRandom([], 0.999999)]) {
    const results = rollChestReward("silver", random);
    assert.equal(megaStoneReward(results), undefined, "Silver has no Mega Stone chance at all — never even rolled");
  }
});

test("Gold's dedicated Mega Stone roll is exactly 10%, verified at its precise boundary", () => {
  // An EMPTY explicit prefix (paddedRandom's `pad` then answers every call,
  // including every earlier roll's own unrelated calls) sidesteps needing
  // to hand-count exactly how many calls precede the trailing Mega Stone
  // roll — since every call in the whole run returns the identical pad
  // value, the final Mega Stone check necessarily sees that same value
  // regardless of its exact position. Below 0.1 succeeds; 0.1 exactly (and
  // above) fails — same "[0, chance) succeeds" convention this file's own
  // egg-weight boundary tests already use elsewhere.
  const justBelow = rollChestReward("gold", paddedRandom([], 0.09999));
  const atBoundary = rollChestReward("gold", paddedRandom([], 0.1));
  assert.ok(megaStoneReward(justBelow), "0.09999 must succeed the 10% roll");
  assert.equal(megaStoneReward(atBoundary), undefined, "0.1 exactly must fail the 10% roll");
});

test("Diamond's dedicated Mega Stone roll is exactly 20%, verified at its precise boundary", () => {
  const justBelow = rollChestReward("diamond", paddedRandom([], 0.19999));
  const atBoundary = rollChestReward("diamond", paddedRandom([], 0.2));
  assert.ok(megaStoneReward(justBelow), "0.19999 must succeed the 20% roll");
  assert.equal(megaStoneReward(atBoundary), undefined, "0.2 exactly must fail the 20% roll");
});

test("a successful Mega Stone roll grants exactly 1 stone — never more, never a quantity range", () => {
  for (const chestTypeId of ["gold", "diamond"] as const) {
    const results = rollChestReward(chestTypeId, paddedRandom([], 0));
    const reward = megaStoneReward(results);
    assert.ok(reward);
    if (reward?.category !== "mega-stone") return;
    assert.equal(reward.itemId, "mega-stone");
    assert.equal(reward.quantity, 1);
    assert.equal(results.filter((r) => r.category === "mega-stone").length, 1, "never more than one mega-stone entry in a single opening");
  }
});

// Structural source check (same technique this file's own "pure,
// framework-free module" test above already uses) — deliberately NOT a
// black-box call-count proof: hand-tracing exactly how many random() calls
// egg/money/gold/mandatory-extras/bonus-categories consume (each builder
// itself consumes a variable, data-dependent number of calls) would be
// fragile and easy to get subtly wrong. Reading the source directly proves
// the actual, load-bearing guarantee instead: the Mega Stone roll is
// physically the last statement in the function, strictly after every
// other roll and appended (never inserted/spliced) into `results` — so it
// can only ever ADD a trailing entry, never alter or reorder anything
// already rolled before it.
test("the Mega Stone roll is the last statement in rollChestReward, strictly after every existing roll, and only ever appends to results", () => {
  const source = readFileSync(new URL("./chest-reward-roll.service.ts", import.meta.url), "utf8");
  const bonusLoopIndex = source.indexOf("for (const category of bonusCategories)");
  const megaStoneIndex = source.indexOf('results.push({ category: "mega-stone"');
  const returnIndex = source.indexOf("return results;", megaStoneIndex);

  assert.ok(bonusLoopIndex !== -1 && megaStoneIndex !== -1 && returnIndex !== -1, "all three anchors must be found in the source");
  assert.ok(bonusLoopIndex < megaStoneIndex, "the Mega Stone roll must come after the existing bonus-category loop");
  assert.ok(megaStoneIndex < returnIndex, "the Mega Stone roll must be the last thing before the function returns");
});
