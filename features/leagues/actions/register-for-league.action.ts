"use server";

import { revalidatePath } from "next/cache";

import { registerForLeague, type RegisterForLeagueResult } from "@/features/leagues/services/league-tournament.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { LeagueId } from "@/features/leagues/types/league.types";

// GYMS & LEAGUES PHASE 5 — the one Server Action the /leagues page calls to
// register. playerId always comes from the authenticated session, never a
// client-supplied id; every real validation (eligibility, window, Champions
// League rejection, idempotency) happens inside registerForLeague itself.
export async function registerForLeagueAction(leagueId: LeagueId): Promise<RegisterForLeagueResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "invalid-league" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await registerForLeague(profile.id, leagueId);

  revalidatePath("/leagues");
  return result;
}
