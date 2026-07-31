import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";

// Player-owned, non-Pokémon item quantities (PlayerInventoryItem — see
// prisma/schema.prisma). Deliberately its own feature rather than nested
// inside features/shop: the Shop is only one way items can ever enter this
// table (a future battle-reward or quest-reward source would reuse this
// same function), and other systems (e.g. using a Potion mid-battle) will
// need to read/write a player's item quantities independently of shop
// browsing/purchasing — the same reasoning that keeps features/pokemon
// separate from features/shop.
//
// itemId is a static-catalog reference (features/shop/data/shop-items.ts
// today), never validated here — same precedent as every other *Id column
// in this schema that references a static data catalog instead of a DB
// table (PlayerPokemon.speciesId, PlayerKnownMove.moveId, ...).

// Adds `quantity` of one item to the player's inventory, creating the row
// on first purchase. Always takes an existing transaction client, same
// "never opens its own transaction" convention grantCurrencyRewards
// already established — every caller adds inventory atomically alongside
// a currency deduction.
export async function addInventoryItem(
  tx: Prisma.TransactionClient,
  playerId: string,
  itemId: string,
  quantity: number
): Promise<void> {
  await tx.playerInventoryItem.upsert({
    where: { playerId_itemId: { playerId, itemId } },
    create: { playerId, itemId, quantity },
    update: { quantity: { increment: quantity } },
  });
}
