import type { ShopCategory } from "@/features/shop/types/shop.types";

// The shop's left-hand category menu, in display order. Adding a new
// category is: (1) one new entry here, (2) add its id to ShopCategoryId
// (features/shop/types/shop.types.ts), (3) add a matching
// public/images/items/<id>/ folder for its items' art — nothing in
// features/shop/components ever needs to change, since ShopCategoryMenu
// and ShopContent both just map over this array.
export const SHOP_CATEGORIES: ShopCategory[] = [
  { id: "poke-balls", name: "פוכדורים", icon: "🔴" },
  { id: "potions", name: "שיקויים", icon: "🧪" },
  { id: "stones", name: "אבנים", icon: "💎" },
];
