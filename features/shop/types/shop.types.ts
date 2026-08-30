// The shop's own domain types — deliberately separate from every other
// feature's types (never reuses e.g. shared/types/player-pokemon.ts),
// since a shop item and an owned Pokémon are unrelated concepts. Adding a
// new category is the one place this file needs a one-line edit (the
// ShopCategoryId union); every future item under an existing category
// needs no code change at all, only a new data entry — see
// features/shop/data/shop-items.ts.
import type { ChestTypeId } from "@/features/chests/data/chest-definitions";
import type { CurrencyType } from "@/features/currency/types/currency.types";
import type { IncubatorTypeId } from "@/features/eggs/data/incubator-definitions";
import type { MajorStatus } from "@/features/battle/status/major-status";
import type { PokemonRarity } from "@/shared/types/pokemon";

// EGGS PHASE 6 — "eggs" deliberately named for the whole category rather
// than "eggs-and-incubators": ShopCategoryId is a route/data key, not the
// user-facing label (that's ShopCategory.name below) — a future
// purchasable incubator item is simply a second item under this same
// category id, never a second category.
//
// CHESTS PHASE 1 — "chests" is its own category, deliberately never placed
// under "eggs": chests are not tied to the egg/incubator acquisition
// system at all (see features/chests/services/chest-ownership.service.ts's
// own doc comment). This category id is shared infrastructure between the
// Shop and Inventory screens (both already read from the same
// SHOP_CATEGORIES list — see features/shop/data/shop-categories.ts's own
// doc comment) purely so Inventory's existing category/filter UI has
// somewhere to group owned chests; no ShopItem is added under "chests" in
// this phase (no chest acquisition method exists yet), so it renders
// correctly empty on the Shop screen for now.
// TM SYSTEM PHASE 2 — "tms" is its own category, holding the 54 TM products
// (features/shop/data/shop-items.ts's TM_SHOP_ITEMS, built from
// features/tm-system/data/tm-catalog.ts's TM_CATALOG). Deliberately never
// merged into "potions" or any existing category: TMs are their own kind of
// purchasable, and this id is also what a later phase's Inventory "use this
// TM" panel keys its category check on (same "selectedView.item.categoryId
// === X" pattern EvolutionItemPanel already establishes for "stones").
export type ShopCategoryId = "poke-balls" | "potions" | "stones" | "eggs" | "chests" | "tms";

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
// STATUS-HEALING ITEMS — "cure-status" added alongside the original "heal"/
// "revive". Every Medicine item still sets exactly the fields its own kind
// needs and no others: heal/revive keep using healPercent (curesStatus stays
// undefined for both); cure-status items set curesStatus instead
// (healPercent stays undefined for them) — see ShopItem.curesStatus below.
export type MedicineEffectKind = "heal" | "revive" | "cure-status";

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
  // STATUS-HEALING ITEMS — set only on Medicine items whose
  // medicineEffectKind is "cure-status" (Antidote/Burn Heal/Paralyze Heal/
  // Awakening/Ice Heal/Full Heal), never alongside healPercent on the same
  // item. A single MajorStatus for the five single-status items, or "all"
  // for Full Heal — features/battle/services/use-medicine.service.ts and
  // features/battle/services/medicine-status-eligibility.ts are the only
  // two places this is ever read, both driven entirely by this field
  // rather than any hardcoded item id.
  curesStatus?: MajorStatus | "all";
  // EGGS PHASE 6 — set only on the 4 egg products (categoryId "eggs"),
  // never on any other item. This is the ONE pointer into the existing
  // Phase 1 egg catalog (features/eggs/data/egg-definitions.ts) a purchase
  // needs to know which rarity of PlayerOwnedEgg to create — see
  // features/shop/services/egg-shop-purchase.service.ts. Name/imageUrl are
  // never duplicated here; shop-items.ts derives them straight from
  // getEggDefinition(eggRarity) instead of typing them out by hand.
  eggRarity?: PokemonRarity;
  // INCUBATOR EXPANSION — set only on the 4 incubator products (also
  // categoryId "eggs", per the spec's own "same category" requirement —
  // see shop-categories.ts), never alongside eggRarity on the same item.
  // The one pointer into the incubator catalog (features/eggs/data/
  // incubator-definitions.ts) a purchase needs to know which type of
  // consumable PlayerIncubator to grant — see features/shop/services/
  // incubator-shop-purchase.service.ts's own grantIncubator call. Also what
  // ShopContent.tsx's own purchase-action branch uses to route an incubator
  // product to its dedicated action, the same way eggRarity already routes
  // egg products.
  incubatorTypeId?: IncubatorTypeId;
  // CHESTS PHASE 5 — set only on the 3 chest products (categoryId
  // "chests", the same category id CHESTS PHASE 1 already reserved for
  // Inventory display — see shop-categories.ts). The one pointer into the
  // chest catalog (features/chests/data/chest-definitions.ts) a purchase
  // needs to know which type of chest to grant — see features/shop/
  // services/chest-shop-purchase.service.ts's own grantChest call. Also
  // what ShopContent.tsx's own purchase-action branch uses to route a
  // chest product to its dedicated action, the same way eggRarity/
  // incubatorTypeId already route their own products.
  chestTypeId?: ChestTypeId;
  // TM SYSTEM PHASE 2 — set only on the 54 TM products (categoryId "tms"),
  // never on any other item. The one pointer into the TM catalog
  // (features/tm-system/data/tm-catalog.ts) a purchase/use flow needs to
  // know which move this TM teaches — resolved from TM_CATALOG by itemId,
  // never re-parsed out of the id string itself. Name/imageUrl are still
  // derived once here in shop-items.ts (from the move registry and the
  // catalog entry's own imagePath, respectively), never re-typed by hand —
  // same "definition module owns the facts, Shop only adds price/currency/
  // description" split EGG_PRICES/INCUBATOR_PRICES/CHEST_PRICES already
  // establish. TM usage (teaching the move to an owned Pokémon) is a later
  // phase — this field only exists so a future Inventory "use this TM"
  // panel can resolve the move without parsing itemId.
  tmMoveId?: string;
}
