import "server-only";

import { grantCurrencyRewards } from "@/features/currency/services/currency-reward.service";
import type { CurrencyType } from "@/features/currency/types/currency.types";
import { removeInventoryItem } from "@/features/inventory/services/inventory.service";
import { sellUnitPriceFor } from "@/features/inventory/services/inventory-view.service";
import { inventorySellMessage } from "@/features/inventory/messages/inventory-sell-messages";
import { createNotification } from "@/features/notifications/services/notification-service";
import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import { prisma } from "@/lib/db/prisma";

export type SellInventoryItemResult =
  | { status: "success"; itemName: string; quantity: number; totalReturn: number; currency: CurrencyType }
  | { status: "invalid-item" }
  | { status: "invalid-quantity" }
  | { status: "insufficient-quantity" };

// The dedicated Inventory Sell service — the only place a sale is ever
// resolved, mirroring shop-purchase.service.ts's own shape exactly (the
// purchase and sell paths are deliberately kept as separate operations —
// see this feature's own architecture notes — but share the same
// validate-then-transact structure and the same inventory/currency/
// notification building blocks).
//
// Price/currency are always resolved server-side against the static Shop
// catalog by itemId (features/shop/data/shop-items.ts) — a client-sent
// price is never trusted, and the sell price is always exactly
// floor(purchase price * 0.5), computed fresh here every time rather than
// read from any client input.
//
// Quantity/item validity is checked before opening a transaction (pure, no
// DB needed); the state-changing part — remove inventory, then grant
// currency, then notify — all happens inside one prisma.$transaction so a
// sale can never partially apply. removeInventoryItem's own atomic
// updateMany guard (inventory.service.ts) is what makes "insufficient
// quantity" safe under concurrent/repeated sell requests: if the owned-
// quantity check fails, nothing else in this transaction ever runs.
export async function sellInventoryItem(
  playerId: string,
  itemId: string,
  quantity: number
): Promise<SellInventoryItemResult> {
  if (!Number.isInteger(quantity) || quantity < 1) return { status: "invalid-quantity" };

  const item = getShopItemById(itemId);
  if (!item) return { status: "invalid-item" };

  const totalReturn = sellUnitPriceFor(item.price) * quantity;

  return prisma.$transaction(async (tx) => {
    const removed = await removeInventoryItem(tx, playerId, itemId, quantity);
    if (!removed) return { status: "insufficient-quantity" };

    await grantCurrencyRewards(tx, playerId, [{ type: item.currency, amount: totalReturn }]);
    await createNotification(tx, playerId, "SHOP_SELL", inventorySellMessage(item.name, quantity, totalReturn, item.currency));

    return { status: "success", itemName: item.name, quantity, totalReturn, currency: item.currency };
  });
}
