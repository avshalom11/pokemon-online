import "server-only";

import { STANDARD_INCUBATOR_TYPE_ID } from "@/features/eggs/data/incubator-definitions";
import { prisma } from "@/lib/db/prisma";
import type { PlayerIncubator } from "@/lib/generated/prisma/client";

// Lazy creation / ensure-on-access — the cleanest way for an EXISTING
// player (created before Phase 1 shipped) to safely obtain their permanent
// Standard Incubator with no mass-data migration/backfill script: the first
// time anything asks for it, it's created; every call after is a harmless
// no-op that just returns the same row. An upsert keyed by the schema's own
// `@@unique([playerId, incubatorTypeId])` (prisma/schema.prisma's
// PlayerIncubator) is what makes "at most one standard incubator per
// player, ever" a real database guarantee rather than an application-level
// promise — even two concurrent calls for a brand-new player can never
// create two rows, the exact same idempotent-upsert shape
// incrementDailyBattleCount (features/daily-battles/services/
// daily-battle-count.service.ts) already established for its own
// create-on-first-access row. Never treated as a consumable/purchasable
// item (no PlayerInventoryItem quantity row) — this is a standalone,
// permanent piece of equipment with its own identity, per this phase's own
// "not a shop item" requirement.
export async function ensureStandardIncubator(playerId: string): Promise<PlayerIncubator> {
  return prisma.playerIncubator.upsert({
    where: { playerId_incubatorTypeId: { playerId, incubatorTypeId: STANDARD_INCUBATOR_TYPE_ID } },
    update: {},
    create: { playerId, incubatorTypeId: STANDARD_INCUBATOR_TYPE_ID },
  });
}

// Every incubator the player currently owns — just the Standard one for
// Phase 1, but written against the real table rather than hardcoding "there
// is exactly one" anywhere, so a future purchasable incubator type needs no
// change here.
export async function listPlayerIncubators(playerId: string): Promise<PlayerIncubator[]> {
  return prisma.playerIncubator.findMany({ where: { playerId }, orderBy: { createdAt: "asc" } });
}
