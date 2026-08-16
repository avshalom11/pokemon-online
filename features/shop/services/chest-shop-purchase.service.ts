import "server-only";

import { grantChest } from "@/features/chests/services/chest-ownership.service";
import { spendCurrency } from "@/features/currency/services/currency-reward.service";
import type { CurrencyType } from "@/features/currency/types/currency.types";
import { createNotification } from "@/features/notifications/services/notification-service";
import { shopPurchaseMessage } from "@/features/shop/messages/shop-purchase-messages";
import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import { prisma } from "@/lib/db/prisma";

export type PurchaseChestShopItemResult =
  | { status: "success"; itemName: string; quantity: number; totalPrice: number; currency: CurrencyType }
  | { status: "insufficient-funds" }
  | { status: "invalid-item" }
  | { status: "invalid-quantity" };

// CHESTS PHASE 5 — the Shop's own chest-purchase path. Mirrors
// incubator-shop-purchase.service.ts's purchaseIncubatorShopItem exactly
// for the parts that ARE shared (item/price/currency looked up
// server-side by itemId, spendCurrency's own atomic gte-guarded balance
// check, one prisma.$transaction so a purchase can never partially apply)
// — never a duplicated payment mechanism.
//
// The one real difference: a chest is a pure stackable quantity (Phase
// 1's own PlayerInventoryItem-backed ownership model — see
// chest-ownership.service.ts's own doc comment on why, unlike an egg or
// incubator, a chest needs no per-instance row identity), so this calls
// grantChest ONCE with the full purchased `quantity` rather than looping —
// grantChest's own addInventoryItem-backed upsert already stacks correctly
// against any chests of the same type the player already owns.
export async function purchaseChestShopItem(playerId: string, itemId: string, quantity: number): Promise<PurchaseChestShopItemResult> {
  if (!Number.isInteger(quantity) || quantity < 1) return { status: "invalid-quantity" };

  const item = getShopItemById(itemId);
  if (!item || item.categoryId !== "chests" || !item.chestTypeId) return { status: "invalid-item" };

  const chestTypeId = item.chestTypeId;
  const totalPrice = item.price * quantity;

  return prisma.$transaction(async (tx) => {
    const spent = await spendCurrency(tx, playerId, item.currency, totalPrice);
    if (!spent) return { status: "insufficient-funds" };

    await grantChest(tx, playerId, chestTypeId, quantity);

    await createNotification(tx, playerId, "SHOP_PURCHASE", shopPurchaseMessage(item.name, quantity));

    return { status: "success", itemName: item.name, quantity, totalPrice, currency: item.currency };
  });
}
