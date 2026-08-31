"use server";

import { revalidatePath } from "next/cache";

import { acknowledgeLeaguePlacementCelebration, type AcknowledgeLeaguePlacementResult } from "@/features/leagues/services/league-placement-celebration.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// LEAGUE — FINAL PLACEMENT CELEBRATION MODAL — the one Server Action the
// modal's own "אישור" button ever calls. playerId always comes from the
// authenticated session (never a client-supplied id — the client only ever
// supplies `tournamentId`, same "player can never act on another player's
// data" convention register-for-league.action.ts already established) — a
// player can never acknowledge (or even discover the existence of) another
// player's placement by supplying an arbitrary tournamentId, since
// acknowledgeLeaguePlacementCelebration itself requires a REAL
// LeagueTournamentPlacement row for (tournamentId, THIS session's own
// playerId) before it ever writes anything.
export async function acknowledgeLeaguePlacementCelebrationAction(
  tournamentId: string
): Promise<AcknowledgeLeaguePlacementResult | "unauthorized"> {
  const session = await getCurrentSession();
  if (!session) return "unauthorized";

  const profile = await getPlayerProfile(session.user.id);
  const result = await acknowledgeLeaguePlacementCelebration(profile.id, tournamentId);

  revalidatePath("/leagues");
  return result;
}
