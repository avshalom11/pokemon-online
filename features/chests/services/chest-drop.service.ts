import "server-only";

import { getChestDefinition } from "@/features/chests/data/chest-definitions";
import { rollChestDrop, rollChestType } from "@/features/chests/services/chest-drop-roll.service";
import { grantChest } from "@/features/chests/services/chest-ownership.service";
import type { ChestDropOutcome } from "@/features/chests/types/chest-drop.types";
import type { Prisma } from "@/lib/generated/prisma/client";

// CHESTS PHASE 5 — the one integration point between the pure chest-drop
// roll (chest-drop-roll.service.ts) and the existing Phase 1 chest
// ownership primitive (grantChest, chest-ownership.service.ts — never a
// second/duplicated grant path). Called from inside battle-session.
// service.ts's syncWildHp, the exact same wildDefeatRewardGranted-guarded
// transaction that already grants player XP/Pokémon XP/currency/Eggs/
// incubation progress for a confirmed wild-defeat victory:
//   - an awarded chest can never be silently lost to a crash between "the
//     roll succeeded" and "the row is actually saved" — it commits or
//     rolls back together with the rest of that turn's reward;
//   - a racing/retried call for the same kill can never award a second
//     chest — syncWildHp's own claim guard (wildDefeatRewardGranted)
//     already prevents this function from running twice for one victory,
//     so there is no separate idempotency mechanism to build here (same
//     reasoning rollAndAwardEgg's own doc comment gives, egg-drop.
//     service.ts).
//
// Only ever grants a CLOSED chest — never rolls/opens its contents at
// battle time (that's exclusively Phase 3's openChest, triggered later by
// the player's own explicit action).
export async function rollAndAwardChest(
  tx: Prisma.TransactionClient,
  playerId: string,
  randomSource?: () => number
): Promise<ChestDropOutcome> {
  if (!rollChestDrop(randomSource)) {
    return { dropped: false };
  }

  const chestTypeId = rollChestType(randomSource);
  await grantChest(tx, playerId, chestTypeId, 1);

  const definition = getChestDefinition(chestTypeId);
  return { dropped: true, chestTypeId, displayName: definition.displayName, imageUrl: definition.imageUrl };
}
