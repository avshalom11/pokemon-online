"use server";

import { revalidatePath } from "next/cache";

import {
  cancelLeagueRegistration,
  registerForLeague,
  type CancelLeagueRegistrationResult,
  type RegisterForLeagueResult,
} from "@/features/leagues/services/league-tournament.service";
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

// LEAGUE REGISTRATION — CANCEL (later task) — the Server Action behind the
// "ביטול הרשמה" confirmation flow. playerId always comes from the
// authenticated session (never a client-supplied id, exactly like
// registerForLeagueAction above), so this can only ever cancel the CALLING
// player's own registration — every real rule (open-window, Round 1 not
// yet generated, idempotency) lives entirely inside cancelLeagueRegistration.
export async function cancelLeagueRegistrationAction(leagueId: LeagueId): Promise<CancelLeagueRegistrationResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "invalid-league" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await cancelLeagueRegistration(profile.id, leagueId);

  revalidatePath("/leagues");
  return result;
}
