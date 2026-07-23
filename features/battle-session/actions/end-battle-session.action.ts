"use server";

import { endBattleSession } from "@/features/battle-session/services/battle-session.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// Ends (deletes) the caller's own active battle session — used for escape
// and full-party-defeat, the two battle-ending flows that don't otherwise
// touch the database. Successful capture ends its session as part of the
// same transaction that creates the captured Pokémon
// (features/battle/services/capture.service.ts), so it never calls this.
export async function endBattleSessionAction(): Promise<void> {
  const session = await getCurrentSession();
  if (!session) return;

  const profile = await getPlayerProfile(session.user.id);
  await endBattleSession(profile.id);
}
