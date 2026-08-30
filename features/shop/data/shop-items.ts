import { CHEST_DEFINITIONS, type ChestTypeId } from "@/features/chests/data/chest-definitions";
import { EGG_DEFINITIONS } from "@/features/eggs/data/egg-definitions";
import { INCUBATOR_DEFINITIONS, type IncubatorTypeId } from "@/features/eggs/data/incubator-definitions";
import { getShopItemImagePath } from "@/features/shop/media/shop-item-media-paths";
import type { ShopItem } from "@/features/shop/types/shop.types";
import { TM_CATALOG } from "@/features/tm-system/data/tm-catalog";
import { getMoveById } from "@/engine/moves";
import type { PokemonRarity } from "@/shared/types/pokemon";
import { POKEMON_RARITY_LABELS } from "@/shared/types/pokemon-labels";

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
// EGGS PHASE 6 — initial placeholder prices, explicitly chosen for later
// rebalancing (see this phase's own Final Report): Common/Rare in Coins
// (relatively cheap → noticeably more expensive), Very Rare/Legendary in
// Gold (Legendary significantly above Very Rare) — per this phase's own
// pricing rules, weighed against the existing economy (Coins items top out
// around 2700 for Max Revive; Gold items are a flat 70-100 for stones/
// Master Ball today).
const EGG_PRICES: Record<PokemonRarity, { price: number; currency: "money" | "gold" }> = {
  common: { price: 750, currency: "money" },
  rare: { price: 2500, currency: "money" },
  "very-rare": { price: 100, currency: "gold" },
  legendary: { price: 200, currency: "gold" },
};

// Built directly from EGG_DEFINITIONS (features/eggs/data/egg-definitions.ts)
// — displayName/imageUrl/rarity are never re-typed here, only the two
// shop-specific facts (price/currency) and a short description are new.
// `id` is deliberately `${rarity}-egg` (e.g. "rare-egg"), a plain string
// distinct from the rarity value itself, so a future non-rarity-keyed egg
// product never collides with this naming.
const EGG_SHOP_ITEMS: ShopItem[] = EGG_DEFINITIONS.map((definition) => ({
  id: `${definition.id}-egg`,
  categoryId: "eggs",
  name: definition.displayName,
  price: EGG_PRICES[definition.rarity].price,
  currency: EGG_PRICES[definition.rarity].currency,
  description: `ביצה שעשויה להכיל פוקימון ${POKEMON_RARITY_LABELS[definition.rarity]} מהאזור שבו תירכש.`,
  imageUrl: definition.imageUrl,
  eggRarity: definition.rarity,
}));

// INCUBATOR EXPANSION — the spec's own explicit prices, one per incubator
// type. Deliberately its own map here rather than a field on
// IncubatorDefinition (features/eggs/data/incubator-definitions.ts), same
// "price is a Shop-domain fact, not an incubator-domain one" split
// EGG_PRICES already establishes for egg products above.
const INCUBATOR_PRICES: Record<IncubatorTypeId, { price: number; currency: "money" | "gold" }> = {
  regular: { price: 700, currency: "money" },
  advanced: { price: 1500, currency: "money" },
  ultra: { price: 50, currency: "gold" },
  master: { price: 80, currency: "gold" },
};

// Built directly from INCUBATOR_DEFINITIONS — displayName/imageUrl/
// speedMultiplier are never re-typed here, only the shop-specific facts
// (price/currency) and a short description are new. Every purchase always
// grants ONE consumable (single-use) incubator instance, never the
// player's permanent starter incubator — see
// features/shop/services/incubator-shop-purchase.service.ts's own
// grantIncubator call.
const INCUBATOR_SHOP_ITEMS: ShopItem[] = INCUBATOR_DEFINITIONS.map((definition) => ({
  id: `${definition.id}-incubator`,
  categoryId: "eggs",
  name: definition.displayName,
  price: INCUBATOR_PRICES[definition.id].price,
  currency: INCUBATOR_PRICES[definition.id].currency,
  description: `אינקובטור חד-פעמי במהירות דגירה של ×${definition.speedMultiplier}.`,
  imageUrl: definition.imageUrl,
  incubatorTypeId: definition.id,
}));

// CHESTS PHASE 5 — the spec's own explicit prices, one per chest type.
// Deliberately its own map here rather than a field on ChestDefinition
// (features/chests/data/chest-definitions.ts), same "price is a
// Shop-domain fact, not an item-domain one" split EGG_PRICES/
// INCUBATOR_PRICES already establish above.
const CHEST_PRICES: Record<ChestTypeId, { price: number; currency: "money" | "gold" }> = {
  silver: { price: 2500, currency: "money" },
  gold: { price: 150, currency: "gold" },
  diamond: { price: 250, currency: "gold" },
};

// Built directly from CHEST_DEFINITIONS — displayName/imageUrl are never
// re-typed here, only the shop-specific facts (price/currency) and a short
// description are new. Every purchase always grants exactly one closed,
// unopened chest — see features/shop/services/chest-shop-purchase.
// service.ts's own grantChest call; opening stays exclusively an
// Inventory/Phase 3 action.
const CHEST_SHOP_ITEMS: ShopItem[] = CHEST_DEFINITIONS.map((definition) => ({
  id: `${definition.id}-chest`,
  categoryId: "chests",
  name: definition.displayName,
  price: CHEST_PRICES[definition.id].price,
  currency: CHEST_PRICES[definition.id].currency,
  description: `תיבה סגורה שמכילה ביצה, כסף, זהב ופרסים נוספים בעת פתיחתה.`,
  imageUrl: definition.imageUrl,
  chestTypeId: definition.id,
}));

// TM SYSTEM PHASE 2 — the spec's own explicit four-tier pricing, one price
// per moveId. Deliberately its own map here rather than a field on
// TmCatalogEntry (features/tm-system/data/tm-catalog.ts), same "price is a
// Shop-domain fact, not a catalog-domain one" split EGG_PRICES/
// INCUBATOR_PRICES/CHEST_PRICES already establish above. Every TM uses
// Money (never Gold) and has no player-level requirement, per this
// feature's own product rules — the Shop has no level-gating mechanism at
// all today, so there's nothing to bypass for that second rule.
const TM_PRICES: Record<string, number> = {
  // Basic — 1,000
  "fire-punch": 1000,
  "thunder-punch": 1000,
  "ice-punch": 1000,
  "zen-headbutt": 1000,
  hex: 1000,
  "draining-kiss": 1000,
  bulldoze: 1000,
  "rock-tomb": 1000,
  "brick-break": 1000,
  venoshock: 1000,
  "steel-wing": 1000,
  "aerial-ace": 1000,
  facade: 1000,

  // Advanced — 2,500
  waterfall: 2500,
  "giga-drain": 2500,
  psyshock: 2500,
  "shadow-claw": 2500,
  "dark-pulse": 2500,
  "dragon-claw": 2500,
  "dazzling-gleam": 2500,
  dig: 2500,
  "rock-slide": 2500,
  "drain-punch": 2500,
  "poison-jab": 2500,
  "x-scissor": 2500,
  "air-slash": 2500,
  "body-slam": 2500,

  // Premium — 4,000
  flamethrower: 4000,
  surf: 4000,
  liquidation: 4000,
  thunderbolt: 4000,
  "energy-ball": 4000,
  "ice-beam": 4000,
  psychic: 4000,
  "shadow-ball": 4000,
  crunch: 4000,
  "dragon-pulse": 4000,
  "play-rough": 4000,
  "sludge-bomb": 4000,
  "bug-buzz": 4000,
  "flash-cannon": 4000,

  // Elite — 5,500
  "fire-blast": 5500,
  thunder: 5500,
  "solar-beam": 5500,
  blizzard: 5500,
  "foul-play": 5500,
  "draco-meteor": 5500,
  earthquake: 5500,
  "stone-edge": 5500,
  "close-combat": 5500,
  "u-turn": 5500,
  "iron-head": 5500,
  hurricane: 5500,
  "hyper-beam": 5500,
};

// Built directly from TM_CATALOG (features/tm-system/data/tm-catalog.ts) —
// moveId/type/imagePath are never re-typed here, only the Shop-specific
// facts (price, description) and the display name (always derived live from
// the move registry, per this feature's own "TM – <Move Name>" naming rule
// — never hand-typed, so it can never drift from the move it teaches).
// itemId is reused as-is from the catalog ("tm-<moveId>", never a
// generation-specific TM number). Every TM uses Money (decision: "Regular
// TMs use Money, not Gold") and is stackable purely by virtue of going
// through the exact same PlayerInventoryItem path every other Shop item
// uses — nothing TM-specific is needed for that.
const TM_SHOP_ITEMS: ShopItem[] = TM_CATALOG.map((entry) => {
  const move = getMoveById(entry.moveId);
  if (!move) {
    throw new Error(`TM shop item "${entry.itemId}" references moveId "${entry.moveId}", which does not exist in the move registry`);
  }

  const price = TM_PRICES[entry.moveId];
  if (price === undefined) {
    throw new Error(`TM shop item "${entry.itemId}" has no price defined in TM_PRICES`);
  }

  return {
    id: entry.itemId,
    categoryId: "tms",
    name: `TM – ${move.name}`,
    price,
    currency: "money",
    description: `דיסקית טכנית (TM) שמלמדת פוקימון תואם את התנועה ${move.name}.`,
    imageUrl: entry.imagePath,
    tmMoveId: entry.moveId,
  };
});

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
  // Shop UI Redesign phase — every evolution product's description below is
  // a short thematic sentence (never a Pokémon list, never derived from
  // Pokémon names) that replaces the previous permanent inline "Evolves:"
  // list under the product card; the actual Pokémon that evolve using each
  // item are still shown, but only on demand, via the small "?" info
  // button on the card (EvolutionItemInfoDialog), always live-derived from
  // data/pokemon/pokemon-evolutions.ts — never hardcoded here or anywhere
  // in features/shop.
  {
    id: "fire-stone",
    categoryId: "stones",
    name: "אבן אש",
    price: 70,
    currency: "gold",
    description: "אבן אש לוהטת שמפתחת פוקימונים בעלי זיקה לאש.",
    imageUrl: getShopItemImagePath("stones", "fire-stone"),
  },
  {
    id: "water-stone",
    categoryId: "stones",
    name: "אבן מים",
    price: 70,
    currency: "gold",
    description: "אבן מים מיוחדת שמפתחת פוקימונים בעלי זיקה למים.",
    imageUrl: getShopItemImagePath("stones", "water-stone"),
  },
  {
    id: "thunder-stone",
    categoryId: "stones",
    name: "אבן רעם",
    price: 70,
    currency: "gold",
    description: "אבן ברק נדירה שמפתחת פוקימונים בעלי זיקה לחשמל.",
    imageUrl: getShopItemImagePath("stones", "thunder-stone"),
  },
  {
    id: "leaf-stone",
    categoryId: "stones",
    name: "אבן עלים",
    price: 70,
    currency: "gold",
    description: "אבן טבע ירוקה שמפתחת פוקימונים בעלי זיקה לצומח.",
    imageUrl: getShopItemImagePath("stones", "leaf-stone"),
  },
  {
    id: "sun-stone",
    categoryId: "stones",
    name: "אבן שמש",
    price: 70,
    currency: "gold",
    description: "אבן שמש זוהרת שמעוררת התפתחות הקשורה לאור ולצמיחה.",
    imageUrl: getShopItemImagePath("stones", "sun-stone"),
  },
  {
    id: "kings-rock",
    categoryId: "stones",
    name: "אבן המלך",
    price: 70,
    currency: "gold",
    description: "חפץ מלכותי עתיק שמאפשר לפוקימונים מסוימים להתפתח.",
    imageUrl: getShopItemImagePath("stones", "kings-rock"),
  },
  {
    id: "metal-coat",
    categoryId: "stones",
    name: "ציפוי מתכת",
    price: 70,
    currency: "gold",
    description: "ציפוי מתכתי מיוחד שמאפשר לפוקימונים מסוימים להגיע לצורה מתקדמת.",
    imageUrl: getShopItemImagePath("stones", "metal-coat"),
  },
  {
    id: "upgrade",
    categoryId: "stones",
    name: "שדרוג",
    price: 70,
    currency: "gold",
    description: "רכיב טכנולוגי מתקדם שמשדרג פוקימונים דיגיטליים.",
    imageUrl: getShopItemImagePath("stones", "upgrade"),
  },
  {
    id: "moon-stone",
    categoryId: "stones",
    name: "אבן ירח",
    price: 70,
    currency: "gold",
    description: "אבן ירח מסתורית שמפתחת פוקימונים בעלי זיקה לאנרגיית הירח.",
    imageUrl: getShopItemImagePath("stones", "moon-stone"),
  },
  {
    id: "ice-stone",
    categoryId: "stones",
    name: "אבן קרח",
    price: 70,
    currency: "gold",
    description: "אבן קרח צוננת שמפתחת פוקימונים בעלי זיקה לקור.",
    imageUrl: getShopItemImagePath("stones", "ice-stone"),
  },
  {
    id: "dusk-stone",
    categoryId: "stones",
    name: "אבן דמדומים",
    price: 70,
    currency: "gold",
    description: "אבן דמדומים אפלה שמעוררת התפתחות הקשורה לצללים.",
    imageUrl: getShopItemImagePath("stones", "dusk-stone"),
  },
  {
    id: "shiny-stone",
    categoryId: "stones",
    name: "אבן נוצצת",
    price: 70,
    currency: "gold",
    description: "אבן נוצצת ומבריקה שמעוררת התפתחות מרהיבה.",
    imageUrl: getShopItemImagePath("stones", "shiny-stone"),
  },
  ...EGG_SHOP_ITEMS,
  ...INCUBATOR_SHOP_ITEMS,
  ...CHEST_SHOP_ITEMS,
  ...TM_SHOP_ITEMS,
];
