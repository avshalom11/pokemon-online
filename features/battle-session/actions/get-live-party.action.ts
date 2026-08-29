"use server";

import { getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

// FIELD BATTLE STALE-HP / FORCED-REPLACEMENT FIX — the one place
// BattleContent re-reads the player's party straight from the database when
// it can no longer trust its own client-side partyHpMap mirror: an
// "invalid-active-pokemon" rejection from executeBattleAction, or an attack
// request that threw/failed after the server may already have durably
// persisted that turn's fatal blow (see executeBattleAction's own
// persist-the-HP-write-then-still-await-more-code ordering — a later
// throw there never rolls back the HP write). Reuses the exact same
// getPlayerParty read every other authoritative party fetch in this project
// already uses (e.g. app/(game)/battle/page.tsx's own initial load) — never
// a second, parallel party query, and never a client-trusted value.
//
// Returns an empty array only when there is no authenticated session/profile
// to read against (should not happen mid-battle, but is a safe, honest
// signal rather than throwing) — a real mid-battle party is never actually
// empty.
export async function getLivePartyAction(): Promise<OwnedPokemon[]> {
  const session = await getCurrentSession();
  if (!session) return [];

  const profile = await getPlayerProfile(session.user.id);
  return getPlayerParty(profile.id);
}
