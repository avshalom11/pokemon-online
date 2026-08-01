import { getShopItemImagePath } from "@/features/shop/media/shop-item-media-paths";
import type { ShopItem } from "@/features/shop/types/shop.types";

// The shop's static catalog — adding a new item under an existing category
// is just a new entry here (no code change anywhere else: shop-purchase.
// service.ts resolves price/currency straight off the matching entry).
// imageUrl is always derived via getShopItemImagePath, never typed out by
// hand, so a typo in one place can't silently point at the wrong category
// folder.
//
// Every image file this now points at (public/images/items/) is named in
// the same lowercase-kebab convention as its item id — the potions folder
// originally arrived Title-Cased (e.g. "Potion.png") and was renamed to
// match poke-balls/stones rather than special-casing this file's lookups.
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "poke-ball",
    categoryId: "poke-balls",
    name: "פוכדור",
    price: 100,
    currency: "money",
    description: "פוכדור בסיסי ללכידת פוקימונים פראיים.",
    imageUrl: getShopItemImagePath("poke-balls", "poke-ball"),
  },
  {
    id: "great-ball",
    categoryId: "poke-balls",
    name: "פוכדור-על",
    price: 200,
    currency: "money",
    description: "פוכדור משופר עם סיכוי לכידה כפול.",
    imageUrl: getShopItemImagePath("poke-balls", "great-ball"),
  },
  {
    id: "ultra-ball",
    categoryId: "poke-balls",
    name: "פוכדור-אולטרה",
    price: 400,
    currency: "money",
    description: "פוכדור משופר עם סיכוי לכידה משולש.",
    imageUrl: getShopItemImagePath("poke-balls", "ultra-ball"),
  },
  {
    id: "master-ball",
    categoryId: "poke-balls",
    name: "פוכדור-מאסטר",
    price: 100,
    currency: "gold",
    description: "פוכדור עם 100% סיכויי לכידה.",
    imageUrl: getShopItemImagePath("poke-balls", "master-ball"),
  },
  {
    id: "potion",
    categoryId: "potions",
    name: "שיקוי",
    price: 100,
    currency: "money",
    description: "מרפא 20% מנקודות החיים המקסימליות של פוקימון אחד.",
    imageUrl: getShopItemImagePath("potions", "potion"),
    medicineEffectKind: "heal",
    healPercent: 0.2,
  },
  {
    id: "super-potion",
    categoryId: "potions",
    name: "שיקוי-על",
    price: 300,
    currency: "money",
    description: "מרפא 50% מנקודות החיים המקסימליות של פוקימון אחד.",
    imageUrl: getShopItemImagePath("potions", "super-potion"),
    medicineEffectKind: "heal",
    healPercent: 0.5,
  },
  {
    id: "hyper-potion",
    categoryId: "potions",
    name: "שיקוי-היפר",
    price: 800,
    currency: "money",
    description: "מרפא 70% מנקודות החיים המקסימליות של פוקימון אחד.",
    imageUrl: getShopItemImagePath("potions", "hyper-potion"),
    medicineEffectKind: "heal",
    healPercent: 0.7,
  },
  {
    id: "max-potion",
    categoryId: "potions",
    name: "שיקוי-פלא",
    price: 1300,
    currency: "money",
    description: "מרפא את מלוא החיים של פוקימון אחד.",
    imageUrl: getShopItemImagePath("potions", "max-potion"),
    medicineEffectKind: "heal",
    healPercent: 1,
  },
  {
    id: "revive",
    categoryId: "potions",
    name: "תחייה",
    price: 2000,
    currency: "money",
    description: "מחזיר פוקימון שהתעלף לחיים ומאפשר לו להמשיך להילחם.",
    imageUrl: getShopItemImagePath("potions", "revive"),
    medicineEffectKind: "revive",
    healPercent: 0.5,
  },
  {
    id: "max-revive",
    categoryId: "potions",
    name: "תחייה מלאה",
    price: 2700,
    currency: "money",
    description: "מחזיר פוקימון שהתעלף לחיים עם מלוא נקודות החיים.",
    imageUrl: getShopItemImagePath("potions", "max-revive"),
    medicineEffectKind: "revive",
    healPercent: 1,
  },
  {
    id: "fire-stone",
    categoryId: "stones",
    name: "אבן אש",
    price: 70,
    currency: "gold",
    description: "אבן אבולוציה הטעונה באנרגיית אש.",
    imageUrl: getShopItemImagePath("stones", "fire-stone"),
  },
  {
    id: "water-stone",
    categoryId: "stones",
    name: "אבן מים",
    price: 70,
    currency: "gold",
    description: "אבן אבולוציה הטעונה באנרגיית מים.",
    imageUrl: getShopItemImagePath("stones", "water-stone"),
  },
  {
    id: "thunder-stone",
    categoryId: "stones",
    name: "אבן רעם",
    price: 70,
    currency: "gold",
    description: "אבן אבולוציה הטעונה באנרגיה חשמלית.",
    imageUrl: getShopItemImagePath("stones", "thunder-stone"),
  },
  {
    id: "leaf-stone",
    categoryId: "stones",
    name: "אבן עלים",
    price: 70,
    currency: "gold",
    description: "אבן אבולוציה הטעונה באנרגיית טבע.",
    imageUrl: getShopItemImagePath("stones", "leaf-stone"),
  },
];
