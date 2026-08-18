"use server";

import { revalidatePath } from "next/cache";

import { executeBattleAction, type BattleActionResult } from "@/features/battle/services/battle-action.service";
import { executeBattleActionSchema } from "@/features/battle/validation/battle-action.schema";
import { getCurrentSessionFast } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import { toRegionId } from "@/shared/types/region";
import type { ZoneId } from "@/shared/types/zone";

// The one Server Action BattleContent calls to attack — session validation,
// schema validation, and profile resolution all happen here before the
// Battle Action Service is ever reached; ownership itself is enforced by
// always deriving playerId from the authenticated session (never a
// client-supplied id) and re-validated again inside the service against
// this player's own party (see executeBattleAction's own doc comment).
//
// FIELD BATTLE PERFORMANCE — uses getCurrentSessionFast, not the normal
// getCurrentSession: this action can only ever be called from an already-
// mounted battle screen, which requires app/(game)/layout.tsx and
// app/(game)/battle/page.tsx to have both already run the FULL
// getCurrentSession() (self-heal included) moments earlier. Re-running that
// same self-heal check on every single attack of a battle that can run for
// dozens of turns was pure repeated cost for a guarantee already satisfied
// once per page load — see getCurrentSessionFast's own doc comment
// (lib/auth/auth-session.ts) for the exact invariant this relies on.
export async function executeBattleActionAction(
  zoneId: ZoneId,
  actionType: string,
  moveId: string
): Promise<BattleActionResult> {
  const session = await getCurrentSessionFast();
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
    parsed.data.moveId,
    // FIELD BATTLE PERFORMANCE — no test-only fixed random source from this
    // production caller (see executeBattleAction's own doc comment on that
    // param); regionId is this profile's own already-read column, threaded
    // through so a kill-turn promotion never re-reads this exact row a
    // third time (see executeBattleAction's own doc comment on this param).
    undefined,
    toRegionId(profile.regionId)
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
