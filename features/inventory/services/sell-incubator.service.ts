import "server-only";

import type { IncubatorTypeId } from "@/features/eggs/data/incubator-definitions";
import type { CurrencyType } from "@/features/currency/types/currency.types";
import { grantCurrencyRewards } from "@/features/currency/services/currency-reward.service";
import { getIncubatorShopItem, sellUnitPriceFor } from "@/features/shop/services/shop-catalog.service";
import { inventorySellMessage } from "@/features/inventory/messages/inventory-sell-messages";
import { createNotification } from "@/features/notifications/services/notification-service";
import { prisma } from "@/lib/db/prisma";

export type SellIncubatorResult =
  | { status: "success"; itemName: string; sellPrice: number; currency: CurrencyType }
  | { status: "not-sellable" };

// INVENTORY SELL — the dedicated incubator-selling path, deliberately its
// own service, same "an incubator instance has its own identity, never a
// stackable PlayerInventoryItem quantity" reasoning sell-egg.service.ts's
// own doc comment already gives for eggs.
//
// Sells ONE instance of the given type — never a specific incubatorId — to
// match the Inventory's own grouped-by-type display (features/eggs/
// services/incubator-display.service.ts's OwnedIncubatorSummary): every
// consumable instance of the same type is fungible (same speed, same
// price), so "sell one Ultra Incubator" needs no per-instance identity in
// the UI, only a type. This function itself still picks one REAL, specific
// PlayerIncubator row to delete — it never operates on the grouped count
// directly.
//
// Two protections, both enforced by the one guarded delete below (never a
// separate "check then delete" a race could slip between):
//   - permanentSlot: null — the player's one permanent starter incubator
//     can never be selected or sold, no matter its type.
//   - activeIncubation: null — an incubator currently holding an egg can
//     never be sold out from under that incubation (same relation-null
//     filter listActiveIncubations/listOwnedEggs already use elsewhere).
//
// Price is always resolved fresh from the Shop's own live incubator-
// product catalog entry for this type (getIncubatorShopItem) — never a
// separate/duplicated sell-price config.
export async function sellOwnedIncubator(playerId: string, incubatorTypeId: IncubatorTypeId): Promise<SellIncubatorResult> {
  const shopItem = getIncubatorShopItem(incubatorTypeId);
  if (!shopItem) return { status: "not-sellable" };

  const sellPrice = sellUnitPriceFor(shopItem.price);

  return prisma.$transaction(async (tx) => {
    const candidate = await tx.playerIncubator.findFirst({
      where: { playerId, incubatorTypeId, permanentSlot: null, activeIncubation: null },
    });
    if (!candidate) return { status: "not-sellable" };

    // The exact-id guarded delete: a racing concurrent sell (or a
    // just-started incubation) targeting this SAME candidate row finds
    // zero rows here and safely aborts — the same "exact-value WHERE,
    // count === 0 means someone else already claimed it" idiom hatch.
    // service.ts's own race guard already establishes.
    const removed = await tx.playerIncubator.deleteMany({
      where: { id: candidate.id, playerId, permanentSlot: null, activeIncubation: null },
    });
    if (removed.count === 0) return { status: "not-sellable" };

    await grantCurrencyRewards(tx, playerId, [{ type: shopItem.currency, amount: sellPrice }]);
    await createNotification(tx, playerId, "SHOP_SELL", inventorySellMessage(shopItem.name, 1, sellPrice, shopItem.currency));

    return { status: "success", itemName: shopItem.name, sellPrice, currency: shopItem.currency };
  });
}
