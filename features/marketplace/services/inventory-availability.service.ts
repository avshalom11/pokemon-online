import "server-only";

import { prisma } from "@/lib/db/prisma";

// MARKETPLACE PHASE 1 — the ONE place "how much of this stackable item can
// the player actually spend/use/list right now" is computed. Every existing
// reader of PlayerInventoryItem.quantity (removeInventoryItem, battle item
// use, evolution stones, selling) still reads raw `quantity` today —
// retrofitting them to go through this helper is later hardening work, out
// of this phase's scope (this phase only introduces the column and this
// primitive; lockedQuantity is inert/always 0 until a create/edit listing
// service exists to write it).
//
// Deliberately a plain arithmetic helper, not a DB read itself, so it works
// equally on a row already fetched for another reason (no extra query) and
// is trivially unit-testable without a database.
export function getAvailableQuantity(item: { quantity: number; lockedQuantity: number }): number {
  return item.quantity - item.lockedQuantity;
}

// Convenience wrapper for the common case of "I only have the ids, fetch and
// compute" — returns 0 (never negative, never null) for an item the player
// doesn't own at all, matching removeInventoryItem's own "quantity hitting
// zero deletes the row" convention (a missing row IS zero, not a distinct
// state a caller needs to branch on).
export async function getAvailableInventoryQuantity(playerId: string, itemId: string): Promise<number> {
  const row = await prisma.playerInventoryItem.findUnique({
    where: { playerId_itemId: { playerId, itemId } },
    select: { quantity: true, lockedQuantity: true },
  });

  if (!row) return 0;

  return getAvailableQuantity(row);
}
