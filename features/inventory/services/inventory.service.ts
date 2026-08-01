import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

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

// Every inventory row the player currently owns at least one of — quantity
// 0 rows are excluded here rather than by a caller, since "owned" is
// meaningfully defined as quantity > 0 everywhere this is read (the
// Inventory screen must never show a zero-quantity item — see
// inventory-view.service.ts). Plain read, not part of a transaction: safe
// to call directly from a Server Component/page.
export async function getOwnedInventoryItems(
  playerId: string
): Promise<{ itemId: string; quantity: number }[]> {
  const rows = await prisma.playerInventoryItem.findMany({
    where: { playerId, quantity: { gt: 0 } },
  });

  return rows.map((row) => ({ itemId: row.itemId, quantity: row.quantity }));
}

// Removes `quantity` of one item from the player's inventory, deleting the
// row entirely once it reaches zero (never leaving a zero-quantity row
// behind — see PlayerInventoryItem's own doc comment on why this table has
// no separate "owned but 0" concept). Returns false, touching nothing, if
// the player doesn't own at least `quantity` units — same atomic
// updateMany-with-a-`gte`-precondition idiom currency-reward.service.ts's
// spendCurrency already established for "check and mutate in one step",
// which is what makes this safe against two racing/retried sell requests
// for the same stack (the second can never also see "enough owned" once the
// first has already decremented past it). Always takes an existing
// transaction client — every caller removes inventory atomically alongside
// crediting the returned currency (inventory-sell.service.ts).
export async function removeInventoryItem(
  tx: Prisma.TransactionClient,
  playerId: string,
  itemId: string,
  quantity: number
): Promise<boolean> {
  const updated = await tx.playerInventoryItem.updateMany({
    where: { playerId, itemId, quantity: { gte: quantity } },
    data: { quantity: { decrement: quantity } },
  });

  if (updated.count === 0) return false;

  await tx.playerInventoryItem.deleteMany({ where: { playerId, itemId, quantity: 0 } });

  return true;
}

// The quantity actually remaining right now, read inside the same
// transaction as a preceding removeInventoryItem call — callers that need
// to report a precise post-decrement count back to the client (e.g. "2
// Poké Balls left") use this instead of computing it themselves, since
// removeInventoryItem's own return value is only a success boolean, and the
// row may have just been deleted entirely (reads back as 0, never throws).
export async function getInventoryItemQuantity(
  tx: Prisma.TransactionClient,
  playerId: string,
  itemId: string
): Promise<number> {
  const row = await tx.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId, itemId } } });
  return row?.quantity ?? 0;
}
