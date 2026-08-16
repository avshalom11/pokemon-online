import { getEggDefinition } from "@/features/eggs/data/egg-definitions";
import type { EggAcquisitionSource } from "@/features/eggs/types/egg.types";
import { getEggShopItem, sellUnitPriceFor } from "@/features/shop/services/shop-catalog.service";
import type { CurrencyType } from "@/features/currency/types/currency.types";
import type { PokemonRarity } from "@/shared/types/pokemon";
import { toRegionId } from "@/shared/types/region";
import { REGION_LABELS } from "@/shared/types/region-labels";

export interface OwnedEggView {
  id: string;
  rarity: PokemonRarity;
  displayName: string;
  imageUrl: string;
  regionLabel: string;
  source: EggAcquisitionSource | null;
  // INVENTORY SELL — always exactly floor(the equivalent Shop egg
  // product's CURRENT price * 0.5), resolved live against the Shop catalog
  // (features/shop/services/shop-catalog.service.ts's getEggShopItem) —
  // never a separate/duplicated price config, and applies identically
  // regardless of whether this specific egg was purchased or battle-
  // dropped (both share the same rarity -> same Shop product -> same
  // price). Mirrors sellUnitPriceFor's own ratio for every other sellable
  // item (features/inventory/services/inventory-view.service.ts).
  sellPrice: number;
  sellCurrency: CurrencyType;
}

// EGGS PHASE 6 — a shared "raw PlayerOwnedEgg row -> display view" mapping
// for any read-only surface that shows an owned egg (today: /inventory's
// own egg section). Never re-types an egg's own displayName/imageUrl —
// always through getEggDefinition (Phase 1) — and never re-derives its
// region label — always through REGION_LABELS, the same map the rest of
// the app already uses. Pure and framework-free (no "server-only"): safe
// to call from either a server-only view service or, if a future surface
// needs it, directly.
export function toOwnedEggView(egg: { id: string; rarity: string; regionId: string; source: string | null }): OwnedEggView {
  const rarity = egg.rarity as PokemonRarity;
  const definition = getEggDefinition(rarity);

  // Every one of the 4 egg rarities always has a matching Shop product
  // (features/shop/data/shop-items.ts's EGG_SHOP_ITEMS, built 1:1 from
  // EGG_DEFINITIONS) — same "unreachable under a real invariant, but cheap
  // to guard with a descriptive throw" posture getEggDefinition/
  // getIncubatorDefinition already establish for their own lookups.
  const shopItem = getEggShopItem(rarity);
  if (!shopItem) throw new Error(`No Shop item exists for egg rarity "${rarity}"`);

  return {
    id: egg.id,
    rarity,
    displayName: definition.displayName,
    imageUrl: definition.imageUrl,
    regionLabel: REGION_LABELS[toRegionId(egg.regionId)],
    source: egg.source as EggAcquisitionSource | null,
    sellPrice: sellUnitPriceFor(shopItem.price),
    sellCurrency: shopItem.currency,
  };
}
