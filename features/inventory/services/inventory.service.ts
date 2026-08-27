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
//
// MARKETPLACE PHASE 7 (hardening) — also returns `lockedQuantity` alongside
// the existing `quantity`, so callers that need to show/bound how much is
// actually AVAILABLE (quantity - lockedQuantity) — e.g. the Inventory
// screen's own sell-quantity stepper — can do so without a second query.
// Purely additive: every existing caller that only reads `itemId`/
// `quantity` is unaffected.
export async function getOwnedInventoryItems(
  playerId: string
): Promise<{ itemId: string; quantity: number; lockedQuantity: number }[]> {
  const rows = await prisma.playerInventoryItem.findMany({
    where: { playerId, quantity: { gt: 0 } },
  });

  return rows.map((row) => ({ itemId: row.itemId, quantity: row.quantity, lockedQuantity: row.lockedQuantity }));
}

// Removes `quantity` of one item from the player's inventory, deleting the
// row entirely once it reaches zero (never leaving a zero-quantity row
// behind — see PlayerInventoryItem's own doc comment on why this table has
// no separate "owned but 0" concept). Returns false, touching nothing, if
// the player doesn't have at least `quantity` units AVAILABLE — this is
// every real consumption path in the game (Poké Ball throws, field/Gym
// battle potions, evolution items, chests, Shop sell-back — every one of
// them calls this single function), so "available" here means `quantity -
// lockedQuantity`, never raw `quantity`: an item stack currently
// (partially or fully) committed to a Marketplace listing must never be
// consumed past what's actually still free, exactly like create-listing/
// save-edit-listing's own availability checks already enforce on the
// LOCKING side (features/marketplace/services/inventory-availability.service.ts's
// getAvailableQuantity — not imported here on purpose, to avoid a
// backwards features/inventory -> features/marketplace dependency; the
// arithmetic itself is one line and owned by this table's own module).
//
// Race-safe WITHOUT raw SQL, same reasoning lockInventoryQuantity's own doc
// comment gives: Prisma's `where` can't compare `quantity` against
// `lockedQuantity` on the same row directly, so this reads the row once,
// computes availability from that snapshot, then re-applies BOTH the exact
// `quantity` and `lockedQuantity` values just read as the updateMany's own
// compare-and-swap guard — either one changing concurrently (another
// consumption, or a Marketplace lock/unlock) makes the guard miss (count:
// 0) and this returns false rather than over-consuming. Always takes an
// existing transaction client — every caller removes inventory atomically
// alongside its own other effects (crediting currency on a sell, applying
// a potion's heal, etc.).
export async function removeInventoryItem(
  tx: Prisma.TransactionClient,
  playerId: string,
  itemId: string,
  quantity: number
): Promise<boolean> {
  const row = await tx.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId, itemId } } });
  if (!row) return false;

  const available = row.quantity - row.lockedQuantity;
  if (available < quantity) return false;

  const updated = await tx.playerInventoryItem.updateMany({
    where: { playerId, itemId, quantity: row.quantity, lockedQuantity: row.lockedQuantity },
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
