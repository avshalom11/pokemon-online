import "server-only";

import { listOwnedChests, type OwnedChestSummary } from "@/features/chests/services/chest-ownership.service";
import { listOwnedEggs } from "@/features/eggs/services/egg-ownership.service";
import { toOwnedEggView, type OwnedEggView } from "@/features/eggs/services/egg-display.service";
import { getOwnedIncubatorSummaries, type OwnedIncubatorSummary } from "@/features/eggs/services/incubator-display.service";
import { getOwnedInventoryItems } from "@/features/inventory/services/inventory.service";
import { getShopItemById, sellUnitPriceFor } from "@/features/shop/services/shop-catalog.service";
import type { InventoryItemView } from "@/features/inventory/types/inventory.types";

// Re-exported for every existing caller of this module (inventory-sell.
// service.ts in particular) — the function itself now lives in
// shop-catalog.service.ts (see that module's own doc comment for why:
// avoiding a circular import with features/eggs's own display services,
// which also need this same ratio).
export { sellUnitPriceFor };

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

// EGGS PHASE 6 — the Inventory page's own owned-eggs section. Reads
// through the exact same Phase 1 listOwnedEggs (which already excludes any
// egg with an active incubation — see that function's own doc comment), so
// an actively-incubating egg is excluded here for free, with no extra
// filtering. Never duplicates Hatchery's own functionality: this is a
// read-only ownership view, not a way to start incubation.
export async function getOwnedEggViews(playerId: string): Promise<OwnedEggView[]> {
  const eggs = await listOwnedEggs(playerId);
  return eggs.map(toOwnedEggView);
}

// INCUBATOR EXPANSION — the Inventory page's own owned-incubators section.
// A thin re-export of incubator-display.service.ts's own summary (every
// owned incubator, permanent starter included) so every Inventory data
// call goes through this one view-service module, same convention
// getOwnedEggViews above already follows for eggs.
export async function getOwnedIncubatorViews(playerId: string): Promise<OwnedIncubatorSummary[]> {
  return getOwnedIncubatorSummaries(playerId);
}

// CHESTS PHASE 4 — the Inventory page's own owned-chests section. A thin
// re-export of chest-ownership.service.ts's own listOwnedChests (Phase
// 1), same convention getOwnedIncubatorViews above already follows —
// every Inventory data call goes through this one view-service module,
// never a second ownership read path.
export async function getOwnedChestViews(playerId: string): Promise<OwnedChestSummary[]> {
  return listOwnedChests(playerId);
}
