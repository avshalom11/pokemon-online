import "server-only";

import { spendCurrency } from "@/features/currency/services/currency-reward.service";
import type { CurrencyType } from "@/features/currency/types/currency.types";
import { grantIncubator } from "@/features/eggs/services/incubator.service";
import { createNotification } from "@/features/notifications/services/notification-service";
import { shopPurchaseMessage } from "@/features/shop/messages/shop-purchase-messages";
import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import { prisma } from "@/lib/db/prisma";

export type PurchaseIncubatorShopItemResult =
  | { status: "success"; itemName: string; quantity: number; totalPrice: number; currency: CurrencyType }
  | { status: "insufficient-funds" }
  | { status: "invalid-item" }
  | { status: "invalid-quantity" };

// INCUBATOR EXPANSION — the Shop's own incubator-purchase path. Mirrors
// egg-shop-purchase.service.ts's purchaseEggShopItem exactly for the parts
// that ARE shared (item/price/currency looked up server-side by itemId,
// spendCurrency's own atomic gte-guarded balance check, one
// prisma.$transaction so a purchase can never partially apply) — never a
// duplicated payment mechanism.
//
// The one real difference: an incubator is never handed to
// addInventoryItem either (same reasoning as eggs — see
// PlayerIncubator's own doc comment in prisma/schema.prisma on why an
// incubator instance needs its own identity, not a stackable quantity
// row). Instead this calls grantIncubator (features/eggs/services/
// incubator.service.ts) `quantity` times — the exact same reusable grant
// primitive a future chest/reward system will call, so ownership-creation
// logic is never duplicated per acquisition path. Every granted instance is
// always a brand-new, independent consumable (single-use) incubator, never
// the player's permanent starter slot — buying "Regular Incubator" three
// times yields three separate single-use rows, never three merged into one
// and never confused with the one permanent Regular Incubator every player
// already owns.
export async function purchaseIncubatorShopItem(
  playerId: string,
  itemId: string,
  quantity: number
): Promise<PurchaseIncubatorShopItemResult> {
  if (!Number.isInteger(quantity) || quantity < 1) return { status: "invalid-quantity" };

  const item = getShopItemById(itemId);
  if (!item || item.categoryId !== "eggs" || !item.incubatorTypeId) return { status: "invalid-item" };

  const incubatorTypeId = item.incubatorTypeId;
  const totalPrice = item.price * quantity;

  return prisma.$transaction(async (tx) => {
    const spent = await spendCurrency(tx, playerId, item.currency, totalPrice);
    if (!spent) return { status: "insufficient-funds" };

    for (let i = 0; i < quantity; i += 1) {
      await grantIncubator(tx, playerId, incubatorTypeId);
    }

    await createNotification(tx, playerId, "SHOP_PURCHASE", shopPurchaseMessage(item.name, quantity));

    return { status: "success", itemName: item.name, quantity, totalPrice, currency: item.currency };
  });
}
