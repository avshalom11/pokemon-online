import type { ChestTypeId } from "@/features/chests/data/chest-definitions";
import type { IncubatorTypeId } from "@/features/eggs/data/incubator-definitions";
import { SHOP_CATEGORIES } from "@/features/shop/data/shop-categories";
import { SHOP_ITEMS } from "@/features/shop/data/shop-items";
import type { ShopCategory, ShopCategoryId, ShopItem } from "@/features/shop/types/shop.types";
import type { PokemonRarity } from "@/shared/types/pokemon";

// Pure catalog lookups — no I/O, safe to call from a Client Component
// (ShopContent renders this client-side today since the catalog is still
// static placeholder data; the moment it needs to come from the database
// instead, only this file's internals change to a real query, never its
// callers' call sites).
export function getShopCategories(): ShopCategory[] {
  return SHOP_CATEGORIES;
}

export function getDefaultShopCategoryId(): ShopCategoryId | undefined {
  return SHOP_CATEGORIES[0]?.id;
}

export function getShopItemsByCategory(categoryId: ShopCategoryId): ShopItem[] {
  return SHOP_ITEMS.filter((item) => item.categoryId === categoryId);
}

export function getShopItemById(itemId: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.id === itemId);
}

// INVENTORY SELL (eggs/incubators) — the one place a battle-dropped egg or
// a consumable incubator resolves its own current market price for
// selling, always through the exact same live catalog entry the Shop
// itself sells that rarity/type for (item.eggRarity/item.incubatorTypeId,
// never a re-templated id string) — so a sell price can never drift from
// the Shop's own price, and never needs a second, duplicated price config.
export function getEggShopItem(eggRarity: PokemonRarity): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.eggRarity === eggRarity);
}

export function getIncubatorShopItem(incubatorTypeId: IncubatorTypeId): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.incubatorTypeId === incubatorTypeId);
}

// CHESTS — SELL FROM INVENTORY — same live-catalog-lookup precedent as
// getEggShopItem/getIncubatorShopItem above, so a chest's sell price is
// always derived from the exact same Shop entry the Shop itself sells that
// type for, never a re-templated id string or a second price config.
export function getChestShopItem(chestTypeId: ChestTypeId): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.chestTypeId === chestTypeId);
}

// Sell price is always exactly floor(purchase price * 0.5) — the project's
// one existing sell-rounding convention (originally established in
// features/inventory/services/inventory-view.service.ts, which re-exports
// this same function for its own existing callers). Lives here, in the
// Shop catalog service, rather than in features/inventory, so every
// sellable domain (ordinary Shop items, eggs, incubators) can derive a
// sell price straight from the Shop catalog without importing
// features/inventory — inventory-view.service.ts already imports FROM
// features/eggs (toOwnedEggView), so the reverse direction would be a
// circular import.
export function sellUnitPriceFor(purchasePrice: number): number {
  return Math.floor(purchasePrice * 0.5);
}
