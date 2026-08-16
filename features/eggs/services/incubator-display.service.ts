import "server-only";

import { INCUBATOR_DEFINITIONS, getIncubatorDefinition, type IncubatorTypeId } from "@/features/eggs/data/incubator-definitions";
import { isIncubatorPermanent, listPlayerIncubators } from "@/features/eggs/services/incubator.service";
import { getIncubatorShopItem, sellUnitPriceFor } from "@/features/shop/services/shop-catalog.service";
import type { CurrencyType } from "@/features/currency/types/currency.types";

export interface OwnedIncubatorSummary {
  incubatorTypeId: IncubatorTypeId;
  displayName: string;
  imageUrl: string;
  speedMultiplier: number;
  // True only for the player's one permanent starter incubator — the
  // Inventory card renders a "permanent/reusable" badge instead of a
  // quantity count for this entry (never sellable/consumable, per the
  // spec). Every other entry is a grouped count of consumable instances.
  isPermanent: boolean;
  // Always 1 for the permanent entry (there is only ever one); the grouped
  // count of consumable instances for every other entry.
  quantity: number;
  // INVENTORY SELL — always exactly floor(this type's CURRENT Shop price *
  // 0.5), resolved live against the Shop catalog (features/shop/services/
  // shop-catalog.service.ts's getIncubatorShopItem) — never a separate/
  // duplicated price config. Present on the permanent entry too (for type
  // uniformity), but the UI never offers a sell action for it — see
  // isPermanent above and InventoryIncubatorCard's own doc comment.
  sellPrice: number;
  sellCurrency: CurrencyType;
}

// INCUBATOR EXPANSION — the Inventory screen's own owned-incubators
// section (app/(game)/inventory's own data call). Shows EVERY incubator the
// player owns, permanent starter included — see this phase's own explicit
// "the player MUST be able to see the permanent starter incubator; do not
// hide it just because it is not consumable" requirement. It's marked
// isPermanent so the card can render it as reusable/non-sellable instead of
// a quantity, rather than being excluded outright.
//
// Consumable instances are grouped by type (the spec's own "may group them
// by type where sensible" allowance) — this is a read-only summary, never
// an identity a hatch/incubation action could target, so collapsing several
// PlayerIncubator rows into one { type, quantity } entry loses nothing a
// consumer of this view needs; starting an incubation still always
// resolves to one real, specific PlayerIncubator row via the Hatchery's own
// per-instance UI (features/hatchery), never through this summary.
// Every incubator type always has a matching Shop product (features/shop/
// data/shop-items.ts's INCUBATOR_SHOP_ITEMS, built 1:1 from
// INCUBATOR_DEFINITIONS) — same "unreachable under a real invariant, but
// cheap to guard with a descriptive throw" posture getIncubatorDefinition
// itself already establishes.
function resolveSellInfo(incubatorTypeId: IncubatorTypeId): { sellPrice: number; sellCurrency: CurrencyType } {
  const shopItem = getIncubatorShopItem(incubatorTypeId);
  if (!shopItem) throw new Error(`No Shop item exists for incubator type "${incubatorTypeId}"`);
  return { sellPrice: sellUnitPriceFor(shopItem.price), sellCurrency: shopItem.currency };
}

export async function getOwnedIncubatorSummaries(playerId: string): Promise<OwnedIncubatorSummary[]> {
  const rows = await listPlayerIncubators(playerId);

  const summaries: OwnedIncubatorSummary[] = [];

  // The permanent starter incubator, listed first — same "permanent before
  // consumables" ordering the Hatchery's own incubator list already uses
  // (features/hatchery/services/hatchery-view.service.ts). A brand-new
  // player who has never loaded /hatchery yet (so ensureStarterIncubator
  // has never run) simply has no rows yet — nothing to show here until
  // that lazy-creation happens, same as any other lazy-init read.
  const permanentRow = rows.find((row) => isIncubatorPermanent(row));
  if (permanentRow) {
    const definition = getIncubatorDefinition(permanentRow.incubatorTypeId);
    summaries.push({
      incubatorTypeId: definition.id,
      displayName: definition.displayName,
      imageUrl: definition.imageUrl,
      speedMultiplier: definition.speedMultiplier,
      isPermanent: true,
      quantity: 1,
      ...resolveSellInfo(definition.id),
    });
  }

  const quantityByType = new Map<string, number>();
  for (const row of rows) {
    if (isIncubatorPermanent(row)) continue;
    quantityByType.set(row.incubatorTypeId, (quantityByType.get(row.incubatorTypeId) ?? 0) + 1);
  }

  // Ordered by the canonical catalog order (features/eggs/data/
  // incubator-definitions.ts), never by acquisition order — a stable,
  // predictable display order regardless of purchase history.
  for (const definition of INCUBATOR_DEFINITIONS) {
    const quantity = quantityByType.get(definition.id);
    if (!quantity) continue;

    const resolved = getIncubatorDefinition(definition.id);
    summaries.push({
      incubatorTypeId: resolved.id,
      displayName: resolved.displayName,
      imageUrl: resolved.imageUrl,
      speedMultiplier: resolved.speedMultiplier,
      isPermanent: false,
      quantity,
      ...resolveSellInfo(resolved.id),
    });
  }

  return summaries;
}
