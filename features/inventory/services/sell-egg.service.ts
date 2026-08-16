import "server-only";

import type { CurrencyType } from "@/features/currency/types/currency.types";
import { grantCurrencyRewards } from "@/features/currency/services/currency-reward.service";
import { getEggShopItem, sellUnitPriceFor } from "@/features/shop/services/shop-catalog.service";
import { inventorySellMessage } from "@/features/inventory/messages/inventory-sell-messages";
import { createNotification } from "@/features/notifications/services/notification-service";
import { prisma } from "@/lib/db/prisma";
import type { PokemonRarity } from "@/shared/types/pokemon";

export type SellEggResult =
  | { status: "success"; itemName: string; sellPrice: number; currency: CurrencyType }
  | { status: "not-sellable" };

// INVENTORY SELL — the dedicated egg-selling path, deliberately its own
// service rather than a branch inside sellInventoryItem
// (inventory-sell.service.ts): an egg is a PlayerOwnedEgg row with its own
// identity (features/eggs's own "quantity counter has no single identity a
// foreign key could reference" precedent), never a PlayerInventoryItem
// stackable quantity, so selling one is "delete exactly this row", not
// "decrement a quantity column" — a different operation entirely, same
// reasoning that already keeps egg purchase (egg-shop-purchase.service.ts)
// separate from ordinary item purchase.
//
// Price is always resolved fresh from the Shop's own live egg-product
// catalog entry for this egg's rarity (getEggShopItem) — the exact same
// price whether this specific egg was purchased or battle-dropped, since
// both share the same rarity -> same Shop product -> same price. Never a
// separate/duplicated sell-price config.
//
// The single guarded deleteMany below is what makes this safe under a
// race: `activeIncubation: null` is the same relation-null filter
// listOwnedEggs (egg-ownership.service.ts) already uses to exclude an
// actively-incubating egg, so an egg that started incubating between page
// load and this call is rejected here too, atomically — no separate
// "check then delete" that a concurrent startIncubatingEgg call could slip
// between. A zero-count result covers every rejection case uniformly
// (doesn't exist, isn't this player's, or is currently incubating) — the
// UI only ever offers a sell action for an egg it already knows is owned
// and unassigned, so a race is the only realistic way this status is ever
// reached.
export async function sellOwnedEgg(playerId: string, eggId: string): Promise<SellEggResult> {
  const egg = await prisma.playerOwnedEgg.findUnique({ where: { id: eggId } });
  if (!egg || egg.playerId !== playerId) return { status: "not-sellable" };

  const rarity = egg.rarity as PokemonRarity;
  const shopItem = getEggShopItem(rarity);
  if (!shopItem) return { status: "not-sellable" };

  const sellPrice = sellUnitPriceFor(shopItem.price);

  return prisma.$transaction(async (tx) => {
    const removed = await tx.playerOwnedEgg.deleteMany({
      where: { id: eggId, playerId, activeIncubation: null },
    });
    if (removed.count === 0) return { status: "not-sellable" };

    await grantCurrencyRewards(tx, playerId, [{ type: shopItem.currency, amount: sellPrice }]);
    await createNotification(tx, playerId, "SHOP_SELL", inventorySellMessage(shopItem.name, 1, sellPrice, shopItem.currency));

    return { status: "success", itemName: shopItem.name, sellPrice, currency: shopItem.currency };
  });
}
