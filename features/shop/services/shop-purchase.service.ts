import "server-only";

import { spendCurrency } from "@/features/currency/services/currency-reward.service";
import type { CurrencyType } from "@/features/currency/types/currency.types";
import { addInventoryItem } from "@/features/inventory/services/inventory.service";
import { createNotification } from "@/features/notifications/services/notification-service";
import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import { shopPurchaseMessage } from "@/features/shop/messages/shop-purchase-messages";
import { prisma } from "@/lib/db/prisma";

export type PurchaseShopItemResult =
  | { status: "success"; itemName: string; quantity: number; totalPrice: number; currency: CurrencyType }
  | { status: "insufficient-funds" }
  | { status: "invalid-item" }
  | { status: "invalid-quantity" };

// The dedicated Shop Purchase service — the only place a purchase is ever
// resolved. Item/price/currency are always looked up server-side against
// the static catalog (features/shop/data/shop-items.ts) by itemId; a
// client-sent price is never trusted, so adding a future purchasable item
// only ever needs a new catalog entry, never a code change here.
//
// Quantity/item validity is checked before opening a transaction (pure,
// no DB needed); the money-moving part — deduct currency, then add
// inventory, then notify — all happens inside one prisma.$transaction so a
// purchase can never partially apply (e.g. currency deducted but inventory
// not credited). spendCurrency's own atomic updateMany guard
// (currency-reward.service.ts) is what makes "insufficient funds" safe
// under concurrent purchase requests: if the balance check fails, nothing
// else in this transaction ever runs.
export async function purchaseShopItem(playerId: string, itemId: string, quantity: number): Promise<PurchaseShopItemResult> {
  if (!Number.isInteger(quantity) || quantity < 1) return { status: "invalid-quantity" };

  const item = getShopItemById(itemId);
  if (!item) return { status: "invalid-item" };

  const totalPrice = item.price * quantity;

  return prisma.$transaction(async (tx) => {
    const spent = await spendCurrency(tx, playerId, item.currency, totalPrice);
    if (!spent) return { status: "insufficient-funds" };

    await addInventoryItem(tx, playerId, item.id, quantity);
    await createNotification(tx, playerId, "SHOP_PURCHASE", shopPurchaseMessage(item.name, quantity));

    return { status: "success", itemName: item.name, quantity, totalPrice, currency: item.currency };
  });
}
