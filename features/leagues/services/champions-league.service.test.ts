// GYMS & LEAGUES PHASE 8 — focused coverage for Champions League
// qualification/creation/execution (QUALIFICATION items 9-18, CHAMPIONS
// EXECUTION items 43-49). Runs the REAL resolveChampionsQualifiers/
// createChampionsLeagueTournamentForCycle unmodified against the in-memory
// fake DB, and reuses Phase 6/7's own join/action/resolution primitives
// unmodified to prove Champions matches never need a separate battle path.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { createChampionsLeagueTournamentForCycle, resolveChampionsQualifiers } from "./champions-league.service.ts";
import { getCycleKey, getWeekKeyForLeagueInCycle } from "../utils/league-cycle.ts";
import { joinLeagueMatch } from "./league-battle-session.service.ts";
import { advanceCompletedLeagueRound, finalizeLeagueTournamentIfComplete } from "./league-round-advancement.service.ts";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
  getLeagueTournamentMatchRows,
  getLeagueTournamentPlacementRows,
} from "../../../test/support/fakes/prisma.fake.ts";

const CYCLE_KEY = getCycleKey("2026-01-08"); // League I's own week for this cycle
const LEAGUE_I_WEEK = getWeekKeyForLeagueInCycle("league-1", CYCLE_KEY);
const LEAGUE_II_WEEK = getWeekKeyForLeagueInCycle("league-2", CYCLE_KEY);
const LEAGUE_III_WEEK = getWeekKeyForLeagueInCycle("league-3", CYCLE_KEY);

beforeEach(() => {
  resetFakeDb();
});

async function completeRegionalTournament(leagueId: string, weekKey: string, winnerPlayerId: string, runnerUpPlayerId?: string) {
  const tournament = await prisma.leagueTournament.create({
    data: { leagueId, weekKey, registrationClosesAt: new Date(), round1StartsAt: new Date(), status: "completed" },
  });
  const winner = await prisma.leagueTournamentParticipant.create({ data: { tournamentId: tournament.id, playerId: winnerPlayerId, participantType: "player" } });
  await prisma.leagueTournamentPlacement.create({ data: { tournamentId: tournament.id, place: 1, participantId: winner.id, playerId: winnerPlayerId } });
  if (runnerUpPlayerId) {
    const runnerUp = await prisma.leagueTournamentParticipant.create({ data: { tournamentId: tournament.id, playerId: runnerUpPlayerId, participantType: "player" } });
    await prisma.leagueTournamentPlacement.create({ data: { tournamentId: tournament.id, place: 2, participantId: runnerUp.id, playerId: runnerUpPlayerId } });
  }
  return tournament;
}

test("League I/II/III winners (and League III's runner-up) are selected as the 4 qualifiers", async () => {
  await completeRegionalTournament("league-1", LEAGUE_I_WEEK, "champ-1");
  await completeRegionalTournament("league-2", LEAGUE_II_WEEK, "champ-2");
  await completeRegionalTournament("league-3", LEAGUE_III_WEEK, "champ-3", "runner-up-3");

  const result = await resolveChampionsQualifiers(CYCLE_KEY);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;

  assert.deepEqual(
    result.qualifiers.map((q) => [q.leagueId, q.place, q.playerId]),
    [
      ["league-1", 1, "champ-1"],
      ["league-2", 1, "champ-2"],
      ["league-3", 1, "champ-3"],
      ["league-3", 2, "runner-up-3"],
    ]
  );
});

test("exactly 4 qualifier sources — never more, never fewer", async () => {
  await completeRegionalTournament("league-1", LEAGUE_I_WEEK, "champ-1");
  await completeRegionalTournament("league-2", LEAGUE_II_WEEK, "champ-2");
  await completeRegionalTournament("league-3", LEAGUE_III_WEEK, "champ-3", "runner-up-3");

  const result = await resolveChampionsQualifiers(CYCLE_KEY);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.qualifiers.length, 4);
});

test("a missing source tournament/placement -> qualifiers-not-ready", async () => {
  await completeRegionalTournament("league-1", LEAGUE_I_WEEK, "champ-1");
  await completeRegionalTournament("league-2", LEAGUE_II_WEEK, "champ-2");
  // League III never completed for this cycle.

  const result = await resolveChampionsQualifiers(CYCLE_KEY);
  assert.deepEqual(result, { status: "qualifiers-not-ready" });
});

test("a League III tournament missing its own runner-up placement -> qualifiers-not-ready", async () => {
  await completeRegionalTournament("league-1", LEAGUE_I_WEEK, "champ-1");
  await completeRegionalTournament("league-2", LEAGUE_II_WEEK, "champ-2");
  await completeRegionalTournament("league-3", LEAGUE_III_WEEK, "champ-3"); // no runner-up

  const result = await resolveChampionsQualifiers(CYCLE_KEY);
  assert.deepEqual(result, { status: "qualifiers-not-ready" });
});

// DUPLICATE-QUALIFIER AUDIT (section 26) — confirmed possible: the same
// real player CAN legitimately win two different regional Leagues across
// the different weeks of one cycle (eligibility for each League is
// independent). This must surface, never silently substitute a
// replacement.
test("the same player winning two different regional Leagues in one cycle surfaces as duplicate-qualifier, never silently resolved", async () => {
  await completeRegionalTournament("league-1", LEAGUE_I_WEEK, "overachiever");
  await completeRegionalTournament("league-2", LEAGUE_II_WEEK, "champ-2");
  await completeRegionalTournament("league-3", LEAGUE_III_WEEK, "overachiever", "runner-up-3");

  const result = await resolveChampionsQualifiers(CYCLE_KEY);
  assert.deepEqual(result, { status: "duplicate-qualifier", playerId: "overachiever" });
});

test("Champions tournament creation requires all qualifiers ready", async () => {
  const result = await createChampionsLeagueTournamentForCycle(CYCLE_KEY);
  assert.deepEqual(result, { status: "qualifiers-not-ready" });
});

test("Champions tournament creates exactly 4 real participants, 2 semifinal matches, no computer filler", async () => {
  await completeRegionalTournament("league-1", LEAGUE_I_WEEK, "champ-1");
  await completeRegionalTournament("league-2", LEAGUE_II_WEEK, "champ-2");
  await completeRegionalTournament("league-3", LEAGUE_III_WEEK, "champ-3", "runner-up-3");

  const result = await createChampionsLeagueTournamentForCycle(CYCLE_KEY, () => 0.5);
  assert.equal(result.status, "created");
  if (result.status !== "created") return;

  const matches = getLeagueTournamentMatchRows(result.tournamentId, 1);
  assert.equal(matches.length, 2);
  assert.ok(matches.every((m) => !m.involvesComputer));

  const participants = await prisma.leagueTournamentParticipant.findMany({ where: { tournamentId: result.tournamentId } });
  assert.equal(participants.length, 4);
  assert.ok(participants.every((p) => p.participantType === "player"), "no computer must ever be inserted into the initial Champions bracket");
});

test("Champions tournament cannot be created twice for the same cycle", async () => {
  await completeRegionalTournament("league-1", LEAGUE_I_WEEK, "champ-1");
  await completeRegionalTournament("league-2", LEAGUE_II_WEEK, "champ-2");
  await completeRegionalTournament("league-3", LEAGUE_III_WEEK, "champ-3", "runner-up-3");

  const first = await createChampionsLeagueTournamentForCycle(CYCLE_KEY, () => 0.1);
  assert.equal(first.status, "created");
  const second = await createChampionsLeagueTournamentForCycle(CYCLE_KEY, () => 0.9);
  assert.deepEqual(second, { status: "already-exists", tournamentId: (first as { tournamentId: string }).tournamentId });
});

test("a full Champions run uses the EXISTING League PvP infrastructure end to end — semifinals, Final, placements", async () => {
  await completeRegionalTournament("league-1", LEAGUE_I_WEEK, "champ-1");
  await completeRegionalTournament("league-2", LEAGUE_II_WEEK, "champ-2");
  await completeRegionalTournament("league-3", LEAGUE_III_WEEK, "champ-3", "runner-up-3");

  for (const playerId of ["champ-1", "champ-2", "champ-3", "runner-up-3"]) {
    seedPlayerProfile({ id: playerId, level: 20, experience: 0 });
    seedPlayerPokemon({ id: `${playerId}-p1`, playerId, speciesId: "charmander", level: 20, currentHp: 100, partySlot: 1 });
    seedKnownMove({ playerPokemonId: `${playerId}-p1`, moveId: "scratch", slot: 1 });
  }

  const created = await createChampionsLeagueTournamentForCycle(CYCLE_KEY, () => 0.5);
  assert.equal(created.status, "created");
  if (created.status !== "created") return;

  const semifinals = getLeagueTournamentMatchRows(created.tournamentId, 1);
  assert.equal(semifinals.length, 2);

  // Resolve both semifinals via the plain no-show resolver (only the
  // intended winner ever joins) — the exact same primitive Phase 7 tests
  // already exercise for regional Leagues, unmodified.
  const { resolveExpiredLeagueMatch } = await import("./league-match-resolution.service.ts");
  async function forceWin(matchId: string, winnerPlayerId: string) {
    const match = await prisma.leagueTournamentMatch.findUnique({ where: { id: matchId } });
    const inWindow = new Date(match!.scheduledAt.getTime() + 60_000);
    const expired = new Date(match!.scheduledAt.getTime() + 21 * 60_000);
    await joinLeagueMatch(matchId, winnerPlayerId, inWindow);
    const result = await resolveExpiredLeagueMatch(matchId, expired);
    assert.equal(result.status, "resolved");
  }

  // Semifinal winners: whichever participant is playerId "champ-1" or
  // "champ-3" in each match (pairing is random-but-deterministic here).
  const participants = await prisma.leagueTournamentParticipant.findMany({ where: { tournamentId: created.tournamentId } });
  const playerIdFor = (participantId: string) => participants.find((p) => p.id === participantId)!.playerId!;

  for (const match of semifinals) {
    const aPlayer = playerIdFor(match.participantAId);
    await forceWin(match.id, aPlayer);
  }

  const advance = await advanceCompletedLeagueRound(created.tournamentId, 1, new Date(Date.now() + 60 * 60_000));
  assert.equal(advance.status, "generated");
  if (advance.status !== "generated") return;
  assert.equal(advance.matchCount, 1, "exactly one Final match");

  const final = getLeagueTournamentMatchRows(created.tournamentId, 2)[0];
  const finalWinnerPlayerId = playerIdFor(final.participantAId);
  await forceWin(final.id, finalWinnerPlayerId);

  const finalAdvance = await advanceCompletedLeagueRound(created.tournamentId, 2, new Date(Date.now() + 60 * 60_000));
  assert.deepEqual(finalAdvance, { status: "tournament-complete" });

  const finalize = await finalizeLeagueTournamentIfComplete(created.tournamentId);
  assert.equal(finalize.status, "completed");
  if (finalize.status !== "completed") return;
  assert.equal(finalize.placements[0].playerId, finalWinnerPlayerId);

  // Placements persisted using the exact same Phase 7 system/table.
  const persisted = getLeagueTournamentPlacementRows(created.tournamentId);
  assert.ok(persisted.length >= 2);
});

test("Champions battle execution never needs a separate battle path — no Champions-specific PvP code exists", async () => {
  const fs = await import("node:fs");
  const files = ["features/leagues/services/champions-league.service.ts"];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    for (const forbidden of ["resolveChampionsBattleTurn", "ChampionsBattleSession", "champions-battle-action", "new PvPEngine"]) {
      assert.ok(!src.includes(forbidden), `${file} must never reference a Champions-specific battle system (${forbidden})`);
    }
  }
});
