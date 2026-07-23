"use server";

import { syncWildHp } from "@/features/battle-session/services/battle-session.service";
import { syncWildHpSchema } from "@/features/battle-session/validation/battle-session.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { ZoneId } from "@/shared/types/zone";

// The only place FieldBattleSession.wildCurrentHp is written after the
// session is created — mirrors syncPartyHpAction's "DB is the single
// authoritative source" rule (features/battle/actions/sync-party-hp.action.ts).
// Called fire-and-forget from BattleContent every time the wild Pokémon
// takes damage, same pattern as the party-HP sync.
export async function syncWildHpAction(zoneId: ZoneId, currentHp: number): Promise<void> {
  const session = await getCurrentSession();
  if (!session) return;

  const parsed = syncWildHpSchema.safeParse({ zoneId, currentHp });
  if (!parsed.success) return;

  const profile = await getPlayerProfile(session.user.id);
  await syncWildHp(profile.id, parsed.data.zoneId as ZoneId, parsed.data.currentHp);
}
