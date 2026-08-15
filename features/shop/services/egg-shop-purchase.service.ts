import "server-only";

import { spendCurrency } from "@/features/currency/services/currency-reward.service";
import type { CurrencyType } from "@/features/currency/types/currency.types";
import { createOwnedEgg } from "@/features/eggs/services/egg-ownership.service";
import { createNotification } from "@/features/notifications/services/notification-service";
import { shopPurchaseMessage } from "@/features/shop/messages/shop-purchase-messages";
import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import { prisma } from "@/lib/db/prisma";
import { toRegionId } from "@/shared/types/region";

export type PurchaseEggShopItemResult =
  | { status: "success"; itemName: string; quantity: number; totalPrice: number; currency: CurrencyType; eggIds: string[] }
  | { status: "insufficient-funds" }
  | { status: "invalid-item" }
  | { status: "invalid-quantity" };

// EGGS PHASE 6 — the Shop's own egg-purchase path. Mirrors shop-purchase.
// service.ts's purchaseShopItem exactly for the parts that ARE shared (item/
// price/currency looked up server-side by itemId, spendCurrency's own
// atomic gte-guarded balance check, one prisma.$transaction so a purchase
// can never partially apply) — never a duplicated payment mechanism.
//
// The one real difference: an egg is never handed to addInventoryItem (a
// stackable quantity row would lose its own region/source identity).
// Instead this creates `quantity` independent PlayerOwnedEgg rows through
// the exact same Phase 1 createOwnedEgg primitive battle drops already use
// — same model, same "source: shop" vs. "source: battle" distinction, no
// second egg storage mechanism.
//
// regionId is always the player's CURRENT PlayerProfile.regionId, read
// fresh inside this same transaction (never a client-supplied value, never
// a fixed/default region) — the exact "region at the moment of purchase"
// rule this phase's own spec requires. If a player somehow buys more than
// one egg in the same request, every one of them gets that same
// snapshot-in-time region, which is correct: they were all bought in the
// same instant.
export async function purchaseEggShopItem(
  playerId: string,
  itemId: string,
  quantity: number
): Promise<PurchaseEggShopItemResult> {
  if (!Number.isInteger(quantity) || quantity < 1) return { status: "invalid-quantity" };

  const item = getShopItemById(itemId);
  if (!item || item.categoryId !== "eggs" || !item.eggRarity) return { status: "invalid-item" };

  const rarity = item.eggRarity;
  const totalPrice = item.price * quantity;

  return prisma.$transaction(async (tx) => {
    const spent = await spendCurrency(tx, playerId, item.currency, totalPrice);
    if (!spent) return { status: "insufficient-funds" };

    const profile = await tx.playerProfile.findUniqueOrThrow({ where: { id: playerId } });
    const regionId = toRegionId(profile.regionId);

    const eggIds: string[] = [];
    for (let i = 0; i < quantity; i += 1) {
      const egg = await createOwnedEgg(tx, playerId, rarity, regionId, "shop");
      eggIds.push(egg.id);
    }

    await createNotification(tx, playerId, "SHOP_PURCHASE", shopPurchaseMessage(item.name, quantity));

    return { status: "success", itemName: item.name, quantity, totalPrice, currency: item.currency, eggIds };
  });
}
