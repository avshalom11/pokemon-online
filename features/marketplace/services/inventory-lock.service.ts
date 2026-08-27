import "server-only";

import { getAvailableQuantity } from "@/features/marketplace/services/inventory-availability.service";
import type { Prisma } from "@/lib/generated/prisma/client";

// MARKETPLACE PHASE 2 — commits `quantity` of one stackable item to a
// listing: increments PlayerInventoryItem.lockedQuantity, never touches raw
// `quantity` (the item is still owned by the seller, just unavailable — see
// that column's own schema doc comment). Always takes an existing
// transaction client, same "never opens its own transaction" convention
// currency-reward.service.ts's spendCurrency/removeInventoryItem already
// establish.
//
// Race-safe WITHOUT raw SQL: Prisma's `where` can only compare a column
// against a literal, never against another column on the same row, so
// "lock only if quantity - lockedQuantity >= requested" can't be expressed
// as a single guarded updateMany the way spendCurrency's `{ gte: amount }`
// can. Instead this reads the row once, computes availability from that
// snapshot, and then re-applies the exact `lockedQuantity` value just read
// as the updateMany's own guard (a compare-and-swap) — if any concurrent
// request changed lockedQuantity in between, the guard misses (count: 0)
// and this returns false rather than over-locking, exactly like
// LeagueBattleSession.turnNumber's own "updateMany whose WHERE clause
// includes the value it read" concurrency guard (see that column's own
// schema doc comment) and gym-battle-session.service.ts's updatedAt CAS
// guard — same idiom, different field.
export async function lockInventoryQuantity(
  tx: Prisma.TransactionClient,
  playerId: string,
  itemId: string,
  quantity: number
): Promise<boolean> {
  if (quantity <= 0) return false;

  const row = await tx.playerInventoryItem.findUnique({ where: { playerId_itemId: { playerId, itemId } } });
  const available = row ? getAvailableQuantity(row) : 0;

  if (available < quantity) return false;

  const guardLockedQuantity = row?.lockedQuantity ?? 0;

  const updated = await tx.playerInventoryItem.updateMany({
    where: { playerId, itemId, lockedQuantity: guardLockedQuantity },
    data: { lockedQuantity: { increment: quantity } },
  });

  return updated.count > 0;
}

// MARKETPLACE PHASE 5/6 — the mirror of lockInventoryQuantity: releases
// `quantity` back from PlayerInventoryItem.lockedQuantity (cancelling a
// listing, or an edit that removes/reduces an item stack). Never touches
// raw `quantity` — the seller never lost it. Guarded with a plain `{gte}`
// precondition (never a CAS against a just-read snapshot, unlike the
// locking side): releasing can only ever be safe to do more of, never
// less, so there is no "someone else already released past me" race to
// guard against the way over-locking needs one — the guard here exists
// only to make "release more than is currently locked" impossible, same
// defensive-backstop role every `{gte}`-guarded updateMany in this
// codebase already plays.
export async function releaseInventoryQuantity(
  tx: Prisma.TransactionClient,
  playerId: string,
  itemId: string,
  quantity: number
): Promise<boolean> {
  if (quantity <= 0) return false;

  const released = await tx.playerInventoryItem.updateMany({
    where: { playerId, itemId, lockedQuantity: { gte: quantity } },
    data: { lockedQuantity: { decrement: quantity } },
  });

  return released.count > 0;
}
