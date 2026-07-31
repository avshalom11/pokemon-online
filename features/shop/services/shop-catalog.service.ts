import { SHOP_CATEGORIES } from "@/features/shop/data/shop-categories";
import { SHOP_ITEMS } from "@/features/shop/data/shop-items";
import type { ShopCategory, ShopCategoryId, ShopItem } from "@/features/shop/types/shop.types";

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
