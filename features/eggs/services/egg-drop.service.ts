import "server-only";

import { rollEggDrop, rollEggRarity } from "@/features/eggs/services/egg-drop-roll.service";
import { createOwnedEgg } from "@/features/eggs/services/egg-ownership.service";
import type { EggDropOutcome } from "@/features/eggs/types/egg.types";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { RegionId } from "@/shared/types/region";

// EGGS PHASE 2 — the one integration point between the pure egg-drop roll
// (egg-drop-roll.service.ts) and egg persistence (egg-ownership.service.ts,
// the same PlayerOwnedEgg model Phase 1 already established — no second
// egg storage mechanism). Called from inside battle-session.service.ts's
// syncWildHp, the exact same wildDefeatRewardGranted-guarded transaction
// that already grants player XP/Pokémon XP/currency for a confirmed
// wild-defeat victory:
//   - an awarded egg can never be silently lost to a crash between "the
//     roll succeeded" and "the row is actually saved" — it commits or
//     rolls back together with the rest of that turn's reward;
//   - a racing/retried call for the same kill can never award a second egg
//     — syncWildHp's own claim guard (wildDefeatRewardGranted) already
//     prevents this function from running twice for one victory, so there
//     is no separate idempotency mechanism to build here.
//
// `regionId` is always the field battle's own region (the caller reads it
// fresh from PlayerProfile inside the same transaction) — never the zone,
// per this phase's own spec. `source` is always "battle": this is the one
// and only acquisition path Phase 2 implements.
export async function rollAndAwardEgg(
  tx: Prisma.TransactionClient,
  playerId: string,
  regionId: RegionId,
  randomSource?: () => number
): Promise<EggDropOutcome> {
  if (!rollEggDrop(randomSource)) {
    return { dropped: false };
  }

  const rarity = rollEggRarity(randomSource);
  const egg = await createOwnedEgg(tx, playerId, rarity, regionId, "battle");

  return { dropped: true, ownedEggId: egg.id, rarity, regionId };
}
