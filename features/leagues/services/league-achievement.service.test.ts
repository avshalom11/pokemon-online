// GYMS & LEAGUES PHASE 8 — focused coverage for Trophy/Medal history and
// current-champion queries (REWARD SAFETY items 41-42, CURRENT CHAMPION
// section 21). Runs the REAL getCurrentLeagueChampion/
// getPlayerLeagueAchievements against the in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getCurrentLeagueChampion, getPlayerLeagueAchievements } from "./league-achievement.service.ts";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER = "champion-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER, level: 20, experience: 0 });
});

async function createCompletedTournamentWithWinner(leagueId: string, weekKey: string, playerId: string, place: 1 | 2 | 3 = 1) {
  const tournament = await prisma.leagueTournament.create({
    data: { leagueId, weekKey, registrationClosesAt: new Date(), round1StartsAt: new Date(), status: "completed" },
  });
  const participant = await prisma.leagueTournamentParticipant.create({ data: { tournamentId: tournament.id, playerId, participantType: "player" } });
  await prisma.leagueTournamentPlacement.create({ data: { tournamentId: tournament.id, place, participantId: participant.id, playerId } });
  return tournament;
}

test("trophies/medals persist correctly and are queryable by player", async () => {
  await createCompletedTournamentWithWinner("league-1", "2026-01-08", PLAYER, 1);
  const achievements = await getPlayerLeagueAchievements(PLAYER);
  assert.equal(achievements.length, 1);
  assert.equal(achievements[0].leagueId, "league-1");
  assert.equal(achievements[0].place, 1);
  assert.equal(achievements[0].achievementLabel, "League I Trophy");
});

test("a player's achievement history can contain multiple tournament-cycle wins, never overwritten", async () => {
  await createCompletedTournamentWithWinner("league-1", "2026-01-08", PLAYER, 1);
  await createCompletedTournamentWithWinner("league-1", "2026-02-05", PLAYER, 1); // the SAME League, a later cycle
  await createCompletedTournamentWithWinner("league-2", "2026-01-15", PLAYER, 2);

  const achievements = await getPlayerLeagueAchievements(PLAYER);
  assert.equal(achievements.length, 3, "every placement is preserved — never a single overwriting boolean");

  const leagueIWins = achievements.filter((a) => a.leagueId === "league-1" && a.place === 1);
  assert.equal(leagueIWins.length, 2, "winning the same League twice across cycles must record BOTH wins");
});

test("getCurrentLeagueChampion resolves the newest completed tournament's own winner", async () => {
  seedPlayerProfile({ id: "older-champion", level: 20, experience: 0 });
  await createCompletedTournamentWithWinner("league-1", "2026-01-08", "older-champion", 1);
  await createCompletedTournamentWithWinner("league-1", "2026-02-05", PLAYER, 1);

  const current = await getCurrentLeagueChampion("league-1");
  assert.equal(current?.playerId, PLAYER, "the MOST RECENT tournament's winner is the current champion, not an older one");
});

test("getCurrentLeagueChampion returns null when no tournament for that League has completed yet", async () => {
  const current = await getCurrentLeagueChampion("league-3");
  assert.equal(current, null);
});
