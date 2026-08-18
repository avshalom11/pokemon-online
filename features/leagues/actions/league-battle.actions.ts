"use server";

import * as z from "zod";

import { submitLeagueBattleAction, switchLeagueBattleActivePokemon, type LeagueBattleActionResult, type SwitchLeagueBattleActivePokemonResult } from "@/features/leagues/services/league-battle-action.service";
import { joinLeagueMatch, type JoinLeagueMatchResult } from "@/features/leagues/services/league-battle-session.service";
import { getLeagueBattleViewData, type LeagueBattleViewResult } from "@/features/leagues/services/league-battle-view.service";
import { getCurrentSession, getCurrentSessionFast } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// GYMS & LEAGUES PHASE 6 — the Server Action surface the League match
// screen calls through. Every action derives playerId from the
// authenticated session only (never a client-supplied id); the match/
// participant/session validation happens entirely inside the service
// layer (see those files' own doc comments) — this file adds nothing
// beyond session resolution + schema validation before delegating.

const matchIdSchema = z.string().min(1);
const moveIdSchema = z.string().min(1);

export async function joinLeagueMatchAction(matchId: string): Promise<JoinLeagueMatchResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "match-not-found" };

  const parsed = matchIdSchema.safeParse(matchId);
  if (!parsed.success) return { status: "match-not-found" };

  const profile = await getPlayerProfile(session.user.id);
  return joinLeagueMatch(parsed.data, profile.id);
}

// LEAGUE PVP PERFORMANCE — uses getCurrentSessionFast, same reasoning
// executeBattleActionAction/executeGymBattleActionAction already document:
// only ever called from an already-mounted match screen, which requires
// the full getCurrentSession() self-heal to have already run moments
// earlier via app/(game)/layout.tsx and the match page itself.
export async function submitLeagueBattleActionAction(matchId: string, moveId: string): Promise<LeagueBattleActionResult> {
  const session = await getCurrentSessionFast();
  if (!session) return { status: "no-session" };

  const parsedMatchId = matchIdSchema.safeParse(matchId);
  const parsedMoveId = moveIdSchema.safeParse(moveId);
  if (!parsedMatchId.success || !parsedMoveId.success) return { status: "invalid-move", moveId };

  const profile = await getPlayerProfile(session.user.id);
  return submitLeagueBattleAction(parsedMatchId.data, profile.id, parsedMoveId.data);
}

// The match screen's own "give me the current, full display state" call —
// used after every join/action so the client never has to hand-patch a
// partial view itself, same convention getGymBattleViewDataAction already
// established.
export async function getLeagueBattleViewDataAction(matchId: string): Promise<LeagueBattleViewResult> {
  const session = await getCurrentSessionFast();
  if (!session) return { status: "match-not-found" };

  const profile = await getPlayerProfile(session.user.id);
  return getLeagueBattleViewData(matchId, profile.id, profile.displayName);
}

export async function switchLeagueBattleActivePokemonAction(matchId: string, slotId: string): Promise<SwitchLeagueBattleActivePokemonResult> {
  const session = await getCurrentSessionFast();
  if (!session) return { status: "no-session" };

  const profile = await getPlayerProfile(session.user.id);
  return switchLeagueBattleActivePokemon(matchId, profile.id, slotId);
}
