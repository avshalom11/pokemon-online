import type { ShopCategory } from "@/features/shop/types/shop.types";

// The shop's left-hand category menu, in display order. Adding a new
// category is: (1) one new entry here, (2) add its id to ShopCategoryId
// (features/shop/types/shop.types.ts), (3) add a matching
// public/images/items/<id>/ folder for its items' art — nothing in
// features/shop/components ever needs to change, since ShopCategoryMenu
// and ShopContent both just map over this array.
export const SHOP_CATEGORIES: ShopCategory[] = [
  { id: "poke-balls", name: "פוכדורים", icon: "🔴" },
  {
    id: "potions",
    name: "שיקויים",
    icon: "🧪",
    tip: "💡 טיפ למאמן:\nשיקויים מתקדמים עולים יותר, אך חוסכים תורות יקרים בקרב ומאפשרים לחזור ללחימה מהר יותר.",
  },
  { id: "stones", name: "אבנים", icon: "💎" },
  // EGGS PHASE 6 — for now holds only the 4 egg products
  // (features/shop/data/shop-items.ts); a future purchasable incubator is
  // simply another item added under this same category id, never a second
  // category. `tip` is the one explicit, required-by-spec explanation of
  // how an egg's eventual region is decided — shown automatically by
  // ShopItemGrid (the same generic per-category banner every other tip
  // already uses), never a bespoke UI element of its own.
  {
    id: "eggs",
    name: "ביצים ואינקובטורים",
    icon: "🥚",
    tip: "ביצה שנקנתה בחנות תכיל פוקימון רק מהמחוז שבו השחקן נמצא בזמן הקנייה, וביצה שנפלה בקרב תכיל פוקימון רק מהמחוז שבו נערך הקרב.",
  },
];
