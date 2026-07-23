"use server";

import type { EncounterResult } from "@/engine/encounter/pokemon-encounter-engine";
import { advanceToNextEncounter } from "@/features/battle-session/services/battle-session.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { ZoneId } from "@/shared/types/zone";

// Continuing in the same zone after defeating a wild Pokémon reuses the
// existing FieldBattleSession row (advanceToNextEncounter overwrites only
// the wild* fields) rather than ending and recreating it — party HP and the
// active Pokémon stay exactly as they are. Returns null both when there's
// no session left to advance (a stale/duplicate call after the battle
// already ended some other way) and when the session doesn't exist, so
// BattleContent's existing "no encounter -> return to map" fallback also
// covers that case.
export async function getNextEncounterAction(zoneId: ZoneId): Promise<EncounterResult | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  const profile = await getPlayerProfile(session.user.id);
  return advanceToNextEncounter(profile.id, zoneId);
}
