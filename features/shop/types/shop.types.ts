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
  // Optional short informational banner shown while this category is
  // selected (features/shop/components/ShopItemGrid.tsx) — purely
  // flavor/guidance text, never gameplay logic. Omitted entirely for a
  // category with nothing to say, which is why every consumer must treat
  // this as optional rather than assuming every category has one.
  tip?: string;
}

// A Medicine item's in-battle effect (features/battle/services/
// use-medicine.service.ts, the only place this is ever read). "heal" adds
// healPercent × the target's max HP to its current HP, clamped at max, and
// can never target a fainted Pokémon; "revive" restores a *fainted*
// Pokémon's HP to healPercent × max HP outright (never added to current
// HP, since a fainted Pokémon's current HP is always 0). Undefined on
// every non-Medicine item (Poké Balls, Stones) — those have no in-battle
// use of this kind.
export type MedicineEffectKind = "heal" | "revive";

export interface ShopItem {
  id: string;
  categoryId: ShopCategoryId;
  name: string;
  // Whole-unit price, denominated in `currency` below (money -> coins,
  // gold -> gold — CurrencyType's own doc comment). Every item is priced
  // in exactly one currency, never split across both. Price never
  // determines any gameplay effect (e.g. healing amount) — see
  // medicineEffectKind/healPercent below, which are the only source of
  // truth for a Medicine item's actual in-battle effect.
  price: number;
  currency: CurrencyType;
  description: string;
  imageUrl: string;
  // Medicine-only battle effect — see MedicineEffectKind's own doc comment.
  // Both fields are always set together (a Medicine item always has both,
  // every other category has neither) — see shop-items.ts's own data.
  medicineEffectKind?: MedicineEffectKind;
  // Fraction of max HP (0..1) this item's effect is based on — e.g. 0.2 for
  // a 20%-of-max-HP Potion. Never a flat HP amount: the same item always
  // scales with whichever Pokémon it's used on.
  healPercent?: number;
}
