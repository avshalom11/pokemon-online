"use server";

import { revalidatePath } from "next/cache";

import type { BattleVictoryReward } from "@/features/battle-session/services/battle-session.service";
import { syncWildHp } from "@/features/battle-session/services/battle-session.service";
import { syncWildHpSchema } from "@/features/battle-session/validation/battle-session.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { ZoneId } from "@/shared/types/zone";

// The only place FieldBattleSession.wildCurrentHp is written after the
// session is created — mirrors syncPartyHpAction's "DB is the single
// authoritative source" rule (features/battle/actions/sync-party-hp.action.ts).
// Called from BattleContent every time the wild Pokémon takes damage (fire-
// and-forget for non-lethal hits, awaited for the lethal one so the caller
// can show both the player-XP and Pokémon-XP rewards — see syncWildHp's own
// doc comment for how both are granted exactly once, atomically, together).
export async function syncWildHpAction(zoneId: ZoneId, currentHp: number): Promise<BattleVictoryReward | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  const parsed = syncWildHpSchema.safeParse({ zoneId, currentHp });
  if (!parsed.success) return null;

  const profile = await getPlayerProfile(session.user.id);
  const reward = await syncWildHp(profile.id, parsed.data.zoneId as ZoneId, parsed.data.currentHp);

  if (reward) {
    // A victory just changed one or more owned Pokémon's level/XP — mark
    // every route that displays that data stale for its *next* navigation,
    // exactly like syncPartyHpAction already does for HP (see that file's
    // own doc comment for why this is necessary at all: the Router Cache
    // would otherwise keep serving the pre-battle RSC payload). Never
    // awaited by anything the battle loop depends on — this only affects
    // future navigations, never the current battle screen.
    revalidatePath("/home");
    revalidatePath("/my-pokemon");
    revalidatePath("/pokemon-center");
  }

  return reward;
}
