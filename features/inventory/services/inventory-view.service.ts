import "server-only";

import { getOwnedInventoryItems } from "@/features/inventory/services/inventory.service";
import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import type { InventoryItemView } from "@/features/inventory/types/inventory.types";

// Sell price is always exactly floor(purchase price * 0.5) — the one place
// this ratio is computed for display, mirrored exactly by
// inventory-sell.service.ts's own server-side calculation at sale time, so
// what the Inventory screen shows a player can never drift from what
// selling actually pays out.
export function sellUnitPriceFor(purchasePrice: number): number {
  return Math.floor(purchasePrice * 0.5);
}

// The Inventory screen's one data source — joins the player's owned
// quantities against the canonical Shop catalog (features/shop/data/
// shop-items.ts) by itemId, the same "static catalog is the only source of
// item identity/price/currency" rule shop-purchase.service.ts already
// follows. A row whose itemId no longer resolves in the catalog (never
// happens today — items are never removed — but cheap to guard) is simply
// skipped rather than crashing the page.
export async function getInventoryView(playerId: string): Promise<InventoryItemView[]> {
  const owned = await getOwnedInventoryItems(playerId);

  const views: InventoryItemView[] = [];
  for (const row of owned) {
    const item = getShopItemById(row.itemId);
    if (!item) continue;

    views.push({ item, quantity: row.quantity, sellUnitPrice: sellUnitPriceFor(item.price) });
  }

  return views;
}
