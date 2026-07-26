"use server";

import { revalidatePath } from "next/cache";

import { executeBattleAction, type BattleActionResult } from "@/features/battle/services/battle-action.service";
import { executeBattleActionSchema } from "@/features/battle/validation/battle-action.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { ZoneId } from "@/shared/types/zone";

// The one Server Action BattleContent calls to attack — session validation,
// schema validation, and profile resolution all happen here before the
// Battle Action Service is ever reached; ownership itself is enforced by
// always deriving playerId from the authenticated session (never a
// client-supplied id) and re-validated again inside the service against
// this player's own party (see executeBattleAction's own doc comment).
export async function executeBattleActionAction(
  zoneId: ZoneId,
  actionType: string,
  moveId: string
): Promise<BattleActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { status: "no-session" };
  }

  const parsed = executeBattleActionSchema.safeParse({ zoneId, actionType, moveId });
  if (!parsed.success) {
    return { status: "invalid-action" };
  }

  const profile = await getPlayerProfile(session.user.id);
  const result = await executeBattleAction(
    profile.id,
    parsed.data.zoneId as ZoneId,
    parsed.data.actionType,
    parsed.data.moveId
  );

  if (result.status === "success" && (result.wildFainted || result.partyPokemonFainted)) {
    // Same revalidation sync-party-hp.action.ts / sync-wild-hp.action.ts
    // already do whenever HP or a reward actually changed something a
    // pre-battle-cached route displays.
    revalidatePath("/home");
    revalidatePath("/my-pokemon");
    revalidatePath("/pokemon-center");
  }

  return result;
}
