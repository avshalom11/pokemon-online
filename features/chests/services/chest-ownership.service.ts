import "server-only";

import { CHEST_DEFINITIONS, type ChestTypeId } from "@/features/chests/data/chest-definitions";
import { addInventoryItem, getOwnedInventoryItems, removeInventoryItem } from "@/features/inventory/services/inventory.service";
import { getChestShopItem, sellUnitPriceFor } from "@/features/shop/services/shop-catalog.service";
import type { CurrencyType } from "@/features/currency/types/currency.types";
import type { Prisma } from "@/lib/generated/prisma/client";

// CHESTS PHASE 1 — the itemId convention this feature stores chest
// ownership under in the EXISTING generic PlayerInventoryItem table
// (prisma/schema.prisma) — same "${type}-${category}" naming precedent
// egg/incubator Shop products already establish (features/shop/data/
// shop-items.ts's `${rarity}-egg` / `${definition.id}-incubator`), so a
// chest's own itemId can never collide with an unrelated catalog entry.
// Exported so any future caller that needs to resolve a chest's own
// PlayerInventoryItem row directly (rather than through this service's own
// grant/consume/list functions) uses the exact same key, never a
// re-templated string of its own.
export function chestInventoryItemId(chestTypeId: ChestTypeId): string {
  return `${chestTypeId}-chest`;
}

// A chest is a pure fungible stackable count with no per-instance identity
// anything else needs to reference — unlike an owned egg or incubator,
// which need a real row identity for PlayerEggIncubation to point at (see
// that model's own doc comment in prisma/schema.prisma). The existing
// (playerId, itemId) -> quantity model (PlayerInventoryItem, already used
// by Poké Balls/Potions/Stones) already fits this exactly, so this whole
// feature reuses it as-is rather than adding a new table — see this
// phase's own Final Report for the fuller rationale.

// CHESTS PHASE 1 — the one reusable grant primitive every future
// chest-acquisition source (battle rewards, events, admin tools, ...) will
// call through, so ownership-creation logic is never duplicated per
// acquisition path — same "one shared persistence primitive, every
// acquisition path writes through it" precedent grantIncubator
// (features/eggs/services/incubator.service.ts) already establishes for
// incubators. Always takes an existing transaction client, never opens its
// own (addInventoryItem's own convention) — a future caller grants chests
// atomically alongside whatever else that acquisition does. Deliberately
// generic over chestTypeId/quantity, with no opinion at all about WHY a
// chest is being granted — that's entirely the caller's concern, per this
// phase's own "never tied to Shop or any one acquisition system"
// requirement.
export async function grantChest(
  tx: Prisma.TransactionClient,
  playerId: string,
  chestTypeId: ChestTypeId,
  quantity: number = 1
): Promise<void> {
  await addInventoryItem(tx, playerId, chestInventoryItemId(chestTypeId), quantity);
}

// CHESTS PHASE 1 — the minimal ownership primitive a future chest-opening
// action (Phase 4+) will need to safely consume exactly one chest: atomic,
// guarded by removeInventoryItem's own gte-precondition updateMany (never
// allows quantity to go negative, exactly like every other consumable
// item in this project — Poké Balls, egg-shop purchases, etc.), returns
// false rather than throwing when the player doesn't own enough.
// Deliberately does nothing else — no reward roll, no Pokémon/currency
// grant, no notification: this is ownership bookkeeping only, opening
// semantics belong to a later phase entirely.
export async function consumeChest(
  tx: Prisma.TransactionClient,
  playerId: string,
  chestTypeId: ChestTypeId,
  quantity: number = 1
): Promise<boolean> {
  return removeInventoryItem(tx, playerId, chestInventoryItemId(chestTypeId), quantity);
}

export interface OwnedChestSummary {
  chestTypeId: ChestTypeId;
  // SITE CRASH FIX — the PlayerInventoryItem key for this chest type,
  // computed here (server-only) via chestInventoryItemId so client
  // components never need to import that function themselves — importing
  // it directly would pull this whole server-only-tagged module into the
  // client bundle and violate the server/client boundary.
  itemId: string;
  displayName: string;
  imageUrl: string;
  quantity: number;
  // CHESTS — SELL FROM INVENTORY — always derived from the live Shop
  // catalog entry for this chest type (never a separate constant), same
  // "sell price can never drift from the Shop's own price" precedent
  // OwnedEggView/OwnedIncubatorSummary already establish for eggs/
  // incubators. Undefined only if a chest type has no Shop product (never
  // true today — every CHEST_DEFINITIONS entry has one, see
  // shop-items.chests.test.ts).
  sellPrice: number;
  sellCurrency: CurrencyType;
}

// A read-only ownership summary, one entry per chest type the player owns
// at least one of, ordered by the canonical catalog order (features/
// chests/data/chest-definitions.ts) — same shape/ordering precedent
// getOwnedConsumableIncubatorSummaries (features/eggs/services/
// incubator-display.service.ts) already establishes for its own grouped
// summary. Not wired into any UI yet (that's a later phase's job — see
// this phase's own scope) — exists now so the data layer is ready the
// moment a Hatchery-equivalent Inventory section needs it.
export async function listOwnedChests(playerId: string): Promise<OwnedChestSummary[]> {
  const owned = await getOwnedInventoryItems(playerId);
  const ownedByItemId = new Map(owned.map((row) => [row.itemId, row.quantity]));

  const summaries: OwnedChestSummary[] = [];
  for (const definition of CHEST_DEFINITIONS) {
    const quantity = ownedByItemId.get(chestInventoryItemId(definition.id));
    if (!quantity) continue;

    const shopItem = getChestShopItem(definition.id);

    summaries.push({
      chestTypeId: definition.id,
      itemId: chestInventoryItemId(definition.id),
      displayName: definition.displayName,
      imageUrl: definition.imageUrl,
      quantity,
      sellPrice: shopItem ? sellUnitPriceFor(shopItem.price) : 0,
      sellCurrency: shopItem?.currency ?? "money",
    });
  }

  return summaries;
}
