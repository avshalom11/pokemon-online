import "server-only";

import { getChestDefinition, type ChestTypeId } from "@/features/chests/data/chest-definitions";
import { chestOpenedMessage } from "@/features/chests/messages/chest-opened-messages";
import { consumeChest } from "@/features/chests/services/chest-ownership.service";
import { rollChestReward } from "@/features/chests/services/chest-reward-roll.service";
import type { ChestRewardResult } from "@/features/chests/types/chest-reward.types";
import type { OpenChestResult, OpenChestRewardView } from "@/features/chests/types/chest-open.types";
import { grantCurrencyRewards } from "@/features/currency/services/currency-reward.service";
import { getEggDefinition } from "@/features/eggs/data/egg-definitions";
import { getIncubatorDefinition } from "@/features/eggs/data/incubator-definitions";
import { createOwnedEgg } from "@/features/eggs/services/egg-ownership.service";
import { grantIncubator } from "@/features/eggs/services/incubator.service";
import { addInventoryItem } from "@/features/inventory/services/inventory.service";
import { createNotification } from "@/features/notifications/services/notification-service";
import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { toRegionId } from "@/shared/types/region";

export interface OpenChestOptions {
  // Threaded straight into Phase 2's own rollChestReward — defaults to
  // Math.random for real gameplay, always overridden by tests (same
  // trailing-optional-randomSource convention hatchIncubation, features/
  // eggs/services/hatch.service.ts, already establishes).
  randomSource?: () => number;
  // TEST-ONLY seam: when provided, this exact list is granted instead of
  // rolling one via rollChestReward — the "inject a pre-rolled reward
  // result" lever this phase's own testability requirement asks for. Lets
  // a test construct a reward list containing a deliberately-invalid entry
  // (e.g. an unrecognized itemId) to prove that a failure partway through
  // granting rolls back every reward already granted earlier in the same
  // list, not just the chest consumption — a real rollChestReward result
  // can never contain an invalid id, so this is the only way to exercise
  // that failure path deterministically without relying on a live DB
  // error.
  rewardsOverride?: readonly ChestRewardResult[];
}

// CHESTS PHASE 3 — the one server-side chest-OPENING entry point. Runs
// entirely inside a single prisma.$transaction: ownership verification and
// consumption are unified into ONE atomic step (consumeChest's own
// gte-guarded updateMany, features/chests/services/chest-ownership.
// service.ts — the same "check and mutate in one step" idiom
// removeInventoryItem/spendCurrency already establish elsewhere in this
// project), so two racing opens against a player's last remaining chest
// can never both succeed: the loser's own consumeChest call sees zero
// matching rows and this function returns "not-enough-chests" immediately,
// having touched nothing. Every reward is then granted through the exact
// existing ownership primitive each reward kind already has (never a
// duplicated write path) — if ANY of them throws, prisma.$transaction's
// own standard rollback-on-throw behavior (identical to every other
// multi-step service in this project — hatch.service.ts, shop-purchase.
// service.ts, ...) undoes the consumed chest AND every reward already
// granted earlier in this same call, atomically. No manual try/catch is
// needed for that guarantee; it's the transaction wrapper itself.
export async function openChest(
  playerId: string,
  chestTypeId: ChestTypeId,
  options: OpenChestOptions = {}
): Promise<OpenChestResult> {
  const { randomSource = Math.random, rewardsOverride } = options;

  return prisma.$transaction(async (tx) => {
    const consumed = await consumeChest(tx, playerId, chestTypeId, 1);
    if (!consumed) return { status: "not-enough-chests" };

    // The player's CURRENT region, read inside this same transaction — an
    // egg reward's own regionId must reflect where the player is at the
    // moment the chest is opened, never a stale/cached value (the exact
    // same "region at the moment of acquisition" rule egg-shop-purchase.
    // service.ts's own purchaseEggShopItem already follows for
    // Shop-bought eggs).
    const profile = await tx.playerProfile.findUniqueOrThrow({ where: { id: playerId } });
    const regionId = toRegionId(profile.regionId);

    const rolledRewards = rewardsOverride ?? rollChestReward(chestTypeId, randomSource);

    const rewards: OpenChestRewardView[] = [];
    for (const reward of rolledRewards) {
      rewards.push(await grantOneReward(tx, playerId, regionId, reward));
    }

    const chestDefinition = getChestDefinition(chestTypeId);
    await createNotification(tx, playerId, "CHEST_OPENED", chestOpenedMessage(chestDefinition.displayName));

    return { status: "success", chestTypeId, rewards };
  });
}

// Grants exactly ONE already-rolled reward through the existing ownership
// primitive that category already has (never a chest-specific duplicate):
//   - egg          -> createOwnedEgg (features/eggs/services/
//                     egg-ownership.service.ts), source "chest"
//   - money/gold   -> grantCurrencyRewards (features/currency/services/
//                     currency-reward.service.ts)
//   - poke-balls/
//     potions/
//     revive       -> addInventoryItem (features/inventory/services/
//                     inventory.service.ts), the exact rolled itemId/
//                     quantity, never collapsed/renamed
//   - incubator    -> grantIncubator (features/eggs/services/incubator.
//                     service.ts) — always a fresh consumable instance
//                     (permanentSlot: null is that function's own
//                     unconditional behavior — see its own doc comment),
//                     never the permanent starter slot
//   - evolution-item -> addInventoryItem once per DISTINCT item in the
//                     bundle, never collapsed into one fake combined entry
//
// Every item id is re-validated against the real Shop catalog
// (getShopItemById) before granting, throwing if it doesn't resolve — this
// can never happen for a genuine rollChestReward result (Phase 2 only ever
// produces real catalog ids), but IS how a test's own deliberately-invalid
// `rewardsOverride` entry (openChest's own doc comment) proves the
// whole-transaction rollback guarantee.
async function grantOneReward(
  tx: Prisma.TransactionClient,
  playerId: string,
  regionId: string,
  reward: ChestRewardResult
): Promise<OpenChestRewardView> {
  switch (reward.category) {
    case "egg": {
      const definition = getEggDefinition(reward.rarity);
      const egg = await createOwnedEgg(tx, playerId, reward.rarity, regionId, "chest");
      return { category: "egg", ownedEggId: egg.id, rarity: reward.rarity, regionId, displayName: definition.displayName, imageUrl: definition.imageUrl };
    }

    case "money": {
      await grantCurrencyRewards(tx, playerId, [{ type: "money", amount: reward.amount }]);
      return { category: "money", amount: reward.amount };
    }

    case "gold": {
      await grantCurrencyRewards(tx, playerId, [{ type: "gold", amount: reward.amount }]);
      return { category: "gold", amount: reward.amount };
    }

    case "poke-balls":
    case "potions":
    case "revive": {
      const shopItem = getShopItemById(reward.itemId);
      if (!shopItem) throw new Error(`Chest reward references an unknown item id "${reward.itemId}"`);
      await addInventoryItem(tx, playerId, reward.itemId, reward.quantity);
      return { category: reward.category, itemId: reward.itemId, displayName: shopItem.name, imageUrl: shopItem.imageUrl, quantity: reward.quantity };
    }

    case "incubator": {
      const definition = getIncubatorDefinition(reward.incubatorTypeId);
      const incubator = await grantIncubator(tx, playerId, reward.incubatorTypeId);
      return { category: "incubator", playerIncubatorId: incubator.id, incubatorTypeId: reward.incubatorTypeId, displayName: definition.displayName, imageUrl: definition.imageUrl };
    }

    case "evolution-item": {
      const items = [];
      for (const item of reward.items) {
        const shopItem = getShopItemById(item.itemId);
        if (!shopItem) throw new Error(`Chest reward references an unknown evolution item id "${item.itemId}"`);
        await addInventoryItem(tx, playerId, item.itemId, item.quantity);
        items.push({ itemId: item.itemId, displayName: shopItem.name, imageUrl: shopItem.imageUrl, quantity: item.quantity });
      }
      return { category: "evolution-item", items };
    }
  }
}
