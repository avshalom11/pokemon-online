import "server-only";

import { REGULAR_INCUBATOR_TYPE_ID, type IncubatorTypeId } from "@/features/eggs/data/incubator-definitions";
import { prisma } from "@/lib/db/prisma";
import type { PlayerIncubator, Prisma } from "@/lib/generated/prisma/client";

// Lazy creation / ensure-on-access — the cleanest way for an EXISTING
// player to safely obtain their permanent starter Regular Incubator with no
// mass-data migration/backfill script beyond the one-time data rename this
// phase's own migration already performs. An upsert keyed by the schema's
// own `@@unique([playerId, permanentSlot])` (prisma/schema.prisma's
// PlayerIncubator) is what makes "at most one PERMANENT incubator per
// player, ever" a real database guarantee rather than an application-level
// promise — even two concurrent calls for a brand-new player can never
// create two permanent rows, the exact same idempotent-upsert shape
// incrementDailyBattleCount (features/daily-battles/services/
// daily-battle-count.service.ts) already established for its own
// create-on-first-access row. Never touches or limits how many consumable
// incubators (permanentSlot: null — see grantIncubator below) the player
// separately owns.
export async function ensureStarterIncubator(playerId: string): Promise<PlayerIncubator> {
  return prisma.playerIncubator.upsert({
    where: { playerId_permanentSlot: { playerId, permanentSlot: 1 } },
    update: {},
    create: { playerId, incubatorTypeId: REGULAR_INCUBATOR_TYPE_ID, permanentSlot: 1 },
  });
}

// "Permanent/reusable" vs. "consumable/single-use" is always derived from
// this one column, never a second redundant boolean that could drift out of
// sync with it — same "derive it, don't duplicate it" precedent
// PlayerEggIncubation's own isIncubationReady (incubation.service.ts)
// already establishes for "ready".
export function isIncubatorPermanent(incubator: Pick<PlayerIncubator, "permanentSlot">): boolean {
  return incubator.permanentSlot !== null;
}

// INCUBATOR EXPANSION — the one reusable grant primitive every source of a
// NEW consumable incubator instance calls through: the Shop
// (features/shop/services/incubator-shop-purchase.service.ts) today, and a
// future chest/reward system without any Shop dependency tomorrow, so
// ownership-creation logic is never duplicated per acquisition path — the
// same "one shared persistence primitive, every acquisition path writes
// through it" precedent createOwnedEgg (egg-ownership.service.ts) already
// establishes for eggs themselves. Always creates a brand-new, independent
// row with permanentSlot: null (a real consumable instance, never the
// permanent starter slot — that stays exclusively ensureStarterIncubator's
// job above), so granting the same type multiple times — or granting a
// type the player already owns some of — always yields one MORE instance,
// never a merged quantity and never a collision with the unique
// (playerId, permanentSlot) constraint (null never collides with null).
// Takes an explicit transaction client (never opens its own transaction),
// the same "tx-first" convention addInventoryItem (inventory.service.ts)
// already establishes, so a caller can grant an incubator atomically
// alongside whatever else that acquisition does (e.g. a Shop purchase's own
// currency deduction).
export async function grantIncubator(
  client: Prisma.TransactionClient,
  playerId: string,
  incubatorTypeId: IncubatorTypeId
): Promise<PlayerIncubator> {
  return client.playerIncubator.create({
    data: { playerId, incubatorTypeId, permanentSlot: null },
  });
}

// Every incubator instance the player currently owns — permanent starter
// included, alongside every consumable instance (including duplicates of
// the same type) — written against the real table rather than assuming any
// fixed count, so a player who has bought several incubators sees every one
// of them.
export async function listPlayerIncubators(playerId: string): Promise<PlayerIncubator[]> {
  return prisma.playerIncubator.findMany({ where: { playerId }, orderBy: { createdAt: "asc" } });
}
