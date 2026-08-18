// GYMS & LEAGUES PHASE 9 — focused coverage for the new tournament bracket
// view assembler (BRACKET items 15-20). Runs the REAL
// getTournamentBracketView against the in-memory fake DB, building matches/
// placements directly (same pattern league-round-advancement.service.test.ts
// already established) rather than re-running full battle resolution.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getTournamentBracketView } from "./league-bracket-view.service.ts";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const SCHEDULED_AT = new Date("2026-01-08T17:00:00Z");

beforeEach(() => {
  resetFakeDb();
});

async function createTournament(status = "generated") {
  const tournament = await prisma.leagueTournament.create({
    data: { leagueId: "league-1", weekKey: "2026-01-08", registrationClosesAt: new Date(), round1StartsAt: SCHEDULED_AT },
  });
  await prisma.leagueTournament.updateMany({ where: { id: tournament.id }, data: { status } });
  return tournament;
}

async function createParticipant(tournamentId: string, playerId: string | null, participantType: "player" | "computer" = "player") {
  return prisma.leagueTournamentParticipant.create({ data: { tournamentId, playerId, participantType } });
}

test("a tournament with no matches yet returns an empty bracket (registration-closed, Round 1 not generated)", async () => {
  const tournament = await createTournament("registration-closed");
  const view = await getTournamentBracketView(tournament.id, "p1");
  assert.ok(view);
  assert.deepEqual(view!.rounds, []);
  assert.deepEqual(view!.placements, []);
});

test("returns null for a tournament id that does not exist", async () => {
  const view = await getTournamentBracketView("does-not-exist", "p1");
  assert.equal(view, null);
});

test("a single-round (2-participant) tournament labels its only round 'גמר' and never leaks raw ids as names", async () => {
  seedPlayerProfile({ id: "p1", displayName: "Alice", level: 20, experience: 0 });
  seedPlayerProfile({ id: "p2", displayName: "Bob", level: 20, experience: 0 });
  const tournament = await createTournament();
  const pA = await createParticipant(tournament.id, "p1");
  const pB = await createParticipant(tournament.id, "p2");
  await prisma.leagueTournamentMatch.create({
    data: { tournamentId: tournament.id, roundNumber: 1, slot: 0, scheduledAt: SCHEDULED_AT, participantAId: pA.id, participantBId: pB.id },
  });

  const view = await getTournamentBracketView(tournament.id, "p1");
  assert.equal(view!.rounds.length, 1);
  assert.equal(view!.rounds[0].roundLabel, "גמר");
  const [match] = view!.rounds[0].matches;
  assert.equal(match.participantAName, "Alice");
  assert.equal(match.participantBName, "Bob");
  assert.equal(match.participantAIsViewer, true);
  assert.equal(match.participantBIsViewer, false);
  assert.doesNotMatch(JSON.stringify(match), /pA\.id|pB\.id|"cm[a-z0-9]{20,}"/i);
});

test("a 2-round bracket labels round 1 'חצי גמר' and round 2 'גמר'; a computer filler is shown as 'שחקן מחשב', never a raw id", async () => {
  seedPlayerProfile({ id: "p1", displayName: "Alice", level: 20, experience: 0 });
  seedPlayerProfile({ id: "p2", displayName: "Bob", level: 20, experience: 0 });
  const tournament = await createTournament();
  const pA = await createParticipant(tournament.id, "p1");
  const pB = await createParticipant(tournament.id, "p2");
  const pComputer = await createParticipant(tournament.id, null, "computer");

  await prisma.leagueTournamentMatch.create({
    data: { tournamentId: tournament.id, roundNumber: 1, slot: 0, scheduledAt: SCHEDULED_AT, participantAId: pA.id, participantBId: pComputer.id, involvesComputer: true },
  });
  const round2Match = await prisma.leagueTournamentMatch.create({
    data: { tournamentId: tournament.id, roundNumber: 2, slot: 0, scheduledAt: SCHEDULED_AT, participantAId: pA.id, participantBId: pB.id },
  });
  await prisma.leagueTournamentMatch.updateMany({
    where: { id: round2Match.id },
    data: { status: "completed", winnerParticipantId: pA.id, resolutionReason: "normal-battle" },
  });

  const view = await getTournamentBracketView(tournament.id, "p2");
  assert.equal(view!.rounds.length, 2);
  assert.equal(view!.rounds[0].roundLabel, "חצי גמר");
  assert.equal(view!.rounds[1].roundLabel, "גמר");

  const semifinal = view!.rounds[0].matches[0];
  assert.equal(semifinal.participantBIsComputer, true);
  assert.equal(semifinal.participantBName, "שחקן מחשב");

  const final = view!.rounds[1].matches[0];
  assert.equal(final.displayStatus, "completed");
  assert.equal(final.statusLabel, "הקרב הסתיים");
  assert.equal(final.winnerIsParticipantA, true);
  assert.equal(final.winnerName, "Alice");
});

test("match status/resolution-reason labels follow the exact spec mapping for no-show and timeout completions", async () => {
  seedPlayerProfile({ id: "p1", displayName: "Alice", level: 20, experience: 0 });
  seedPlayerProfile({ id: "p2", displayName: "Bob", level: 20, experience: 0 });
  const tournament = await createTournament();
  const pA = await createParticipant(tournament.id, "p1");
  const pB = await createParticipant(tournament.id, "p2");

  const noShowMatch = await prisma.leagueTournamentMatch.create({
    data: { tournamentId: tournament.id, roundNumber: 1, slot: 0, scheduledAt: SCHEDULED_AT, participantAId: pA.id, participantBId: pB.id },
  });
  await prisma.leagueTournamentMatch.updateMany({
    where: { id: noShowMatch.id },
    data: { status: "completed", winnerParticipantId: pA.id, resolutionReason: "opponent-no-show" },
  });

  const timeoutMatch = await prisma.leagueTournamentMatch.create({
    data: { tournamentId: tournament.id, roundNumber: 1, slot: 1, scheduledAt: SCHEDULED_AT, participantAId: pB.id, participantBId: pA.id },
  });
  await prisma.leagueTournamentMatch.updateMany({
    where: { id: timeoutMatch.id },
    data: { status: "completed", winnerParticipantId: pB.id, resolutionReason: "timeout-living-pokemon" },
  });

  const view = await getTournamentBracketView(tournament.id, "p1");
  const byId = new Map(view!.rounds[0].matches.map((m) => [m.matchId, m]));
  assert.equal(byId.get(noShowMatch.id)!.displayStatus, "no-show");
  assert.equal(byId.get(noShowMatch.id)!.statusLabel, "ניצחון עקב אי-הגעה");
  assert.equal(byId.get(noShowMatch.id)!.resolutionReasonLabel, "היריב לא הגיע לקרב בזמן");

  assert.equal(byId.get(timeoutMatch.id)!.displayStatus, "timeout");
  assert.equal(byId.get(timeoutMatch.id)!.statusLabel, "הקרב הוכרע בסיום הזמן");
});

test("a not-yet-open match shows 'not-open-yet', and canEnter is only ever true for the viewer's own unfinished match", async () => {
  seedPlayerProfile({ id: "p1", displayName: "Alice", level: 20, experience: 0 });
  seedPlayerProfile({ id: "p2", displayName: "Bob", level: 20, experience: 0 });
  seedPlayerProfile({ id: "p3", displayName: "Carol", level: 20, experience: 0 });
  seedPlayerProfile({ id: "p4", displayName: "Dave", level: 20, experience: 0 });
  const tournament = await createTournament();
  const pA = await createParticipant(tournament.id, "p1");
  const pB = await createParticipant(tournament.id, "p2");
  const pC = await createParticipant(tournament.id, "p3");
  const pD = await createParticipant(tournament.id, "p4");

  const futureAt = new Date(Date.now() + 60 * 60_000);
  await prisma.leagueTournamentMatch.create({
    data: { tournamentId: tournament.id, roundNumber: 1, slot: 0, scheduledAt: futureAt, participantAId: pA.id, participantBId: pB.id },
  });
  await prisma.leagueTournamentMatch.create({
    data: { tournamentId: tournament.id, roundNumber: 1, slot: 1, scheduledAt: futureAt, participantAId: pC.id, participantBId: pD.id },
  });

  const viewAsA = await getTournamentBracketView(tournament.id, "p1");
  const [ownMatch, otherMatch] = viewAsA!.rounds[0].matches;
  assert.equal(ownMatch.displayStatus, "not-open-yet");
  assert.equal(ownMatch.statusLabel, "הקרב עדיין לא נפתח");
  assert.equal(ownMatch.canEnter, false, "not open yet — can never enter, even for the viewer's own match");
  assert.equal(otherMatch.canEnter, false, "never true for a match the viewer isn't part of");
});

test("placements are read straight off LeagueTournamentPlacement, never inventing a missing 3rd place, and mark the viewer's own row", async () => {
  seedPlayerProfile({ id: "p1", displayName: "Alice", level: 20, experience: 0 });
  seedPlayerProfile({ id: "p2", displayName: "Bob", level: 20, experience: 0 });
  const tournament = await createTournament("completed");
  await prisma.leagueTournamentPlacement.create({ data: { tournamentId: tournament.id, place: 1, participantId: "part-1", playerId: "p1" } });
  await prisma.leagueTournamentPlacement.create({ data: { tournamentId: tournament.id, place: 2, participantId: "part-2", playerId: "p2" } });

  const view = await getTournamentBracketView(tournament.id, "p1");
  assert.equal(view!.placements.length, 2, "no 3rd place row exists — none must be invented");
  assert.deepEqual(
    view!.placements.map((p) => [p.place, p.playerName, p.isViewer]),
    [
      [1, "Alice", true],
      [2, "Bob", false],
    ]
  );
});
