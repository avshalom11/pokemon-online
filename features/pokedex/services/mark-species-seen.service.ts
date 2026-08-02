import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";

// The only place PlayerSeenSpecies is ever written — see that model's own
// doc comment in prisma/schema.prisma for the full "existence is seen"
// rationale. An upsert keyed by the (playerId, speciesId) unique
// constraint: creates on the first-ever encounter with this species, and is
// a harmless no-op update on every call after — this is exactly what makes
// calling it again for an already-seen species (a page refresh/reopen
// restoring the same session, or a racing duplicate request) always safe,
// with no separate "already exists" check needed by any caller.
//
// Takes a generic Prisma client (works with either the top-level `prisma`
// singleton or an interactive transaction's `tx`) so it can be called both
// from a fresh session's plain, non-transactional creation and from inside
// promoteToNextEncounter's own transaction (features/battle-session/
// services/battle-session.service.ts, the only two call sites — a
// brand-new session's wild, and a promoted wild; deliberately never the
// pre-generated nextWild*, which the player hasn't actually seen yet).
export async function markSpeciesSeen(client: Prisma.TransactionClient, playerId: string, speciesId: string): Promise<void> {
  await client.playerSeenSpecies.upsert({
    where: { playerId_speciesId: { playerId, speciesId } },
    create: { playerId, speciesId },
    update: {},
  });
}
