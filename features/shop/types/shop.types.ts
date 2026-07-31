// The shop's own domain types — deliberately separate from every other
// feature's types (never reuses e.g. shared/types/player-pokemon.ts),
// since a shop item and an owned Pokémon are unrelated concepts. Adding a
// new category is the one place this file needs a one-line edit (the
// ShopCategoryId union); every future item under an existing category
// needs no code change at all, only a new data entry — see
// features/shop/data/shop-items.ts.
import type { CurrencyType } from "@/features/currency/types/currency.types";

export type ShopCategoryId = "poke-balls" | "potions" | "stones";

export interface ShopCategory {
  id: ShopCategoryId;
  // Hebrew display label, matching every other in-game menu's language.
  name: string;
  // Emoji glyph shown next to the category name — same lightweight-icon
  // convention NavigationGrid already uses for the Home menu, so the shop
  // never needs a real icon asset just for its own category list.
  icon: string;
}

export interface ShopItem {
  id: string;
  categoryId: ShopCategoryId;
  name: string;
  // Whole-unit price, denominated in `currency` below (money -> coins,
  // gold -> gold — CurrencyType's own doc comment). Every item is priced
  // in exactly one currency, never split across both.
  price: number;
  currency: CurrencyType;
  description: string;
  imageUrl: string;
}
