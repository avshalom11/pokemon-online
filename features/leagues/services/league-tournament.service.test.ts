// GYMS & LEAGUES PHASE 5 — focused coverage for League registration and
// Round-1 generation persistence (sections 4/5/6/8/9/11 — REGISTRATION
// items 6-11, PAIRING integration). Runs the REAL registerForLeague/
// generateRound1ForTournament unmodified against the in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import {
  generateRound1ForTournament,
  getCurrentTournamentForLeague,
  registerForLeague,
} from "./league-tournament.service.ts";
import { markGymBattleCompleted, markRegionalChampionDefeated } from "@/features/gyms/services/gym-progression.service";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedPlayerProfile,
  getLeagueTournamentRow,
  getLeagueTournamentParticipantRows,
  getLeagueTournamentMatchRows,
} from "../../../test/support/fakes/prisma.fake.ts";

// LEAGUE CYCLE ALIGNMENT FIX (later task) — NOW must resolve to League I's
// own week under the current cycle anchor (league-cycle.ts's
// CYCLE_ANCHOR_WEEK_KEY = "2026-08-06"); 2026-08-03 is the Monday whose
// upcoming Thursday is that anchor week.
const NOW = new Date("2026-08-03T08:00:00Z"); // Monday — registration open

beforeEach(() => {
  resetFakeDb();
});

async function makeEligiblePlayer(playerId: string, regionIds: readonly string[] = ["kanto", "johto", "hoenn"]) {
  seedPlayerProfile({ id: playerId, level: 50, experience: 0 });
  await prisma.$transaction(async (tx) => {
    for (const regionId of regionIds) {
      await markGymBattleCompleted(tx, playerId, regionId as never, 1, "leader");
      await markGymBattleCompleted(tx, playerId, regionId as never, 2, "leader");
      await markGymBattleCompleted(tx, playerId, regionId as never, 3, "leader");
      await markRegionalChampionDefeated(tx, playerId, regionId as never);
    }
  });
}

test("Champions League manual registration is always rejected", async () => {
  seedPlayerProfile({ id: "p1", level: 50, experience: 0 });
  const result = await registerForLeague("p1", "champions-league", NOW);
  assert.deepEqual(result, { status: "champions-league-not-registerable" });
});

test("an eligible player can register while registration is open", async () => {
  await makeEligiblePlayer("p1");
  const result = await registerForLeague("p1", "league-1", NOW);
  assert.equal(result.status, "registered");
});

// GYMS & LEAGUES PHASE 8 — the 4-week rotation gate (section 1/2). NOW
// (2026-08-03, resolving to Thursday 2026-08-06) is League I's own week.
test("during League I's week, League II registration is rejected as league-not-active-this-week", async () => {
  await makeEligiblePlayer("p2", ["sinnoh", "unova", "kalos"]);
  const result = await registerForLeague("p2", "league-2", NOW);
  assert.deepEqual(result, { status: "league-not-active-this-week" });
});

test("during League I's week, League III registration is rejected as league-not-active-this-week", async () => {
  await makeEligiblePlayer("p3", ["alola", "galar", "paldea"]);
  const result = await registerForLeague("p3", "league-3", NOW);
  assert.deepEqual(result, { status: "league-not-active-this-week" });
});

test("during Champions League week, no regional League accepts registration at all", async () => {
  const championsWeekNow = new Date("2026-08-24T08:00:00Z"); // resolves to Thursday 2026-08-27 (Champions week)
  await makeEligiblePlayer("p4", ["kanto", "johto", "hoenn"]);
  const result = await registerForLeague("p4", "league-1", championsWeekNow);
  assert.deepEqual(result, { status: "league-not-active-this-week" });
});

test("an ineligible player is rejected regardless of registration window", async () => {
  seedPlayerProfile({ id: "p1", level: 50, experience: 0 });
  const result = await registerForLeague("p1", "league-1", NOW);
  assert.equal(result.status, "ineligible");
});

test("registration after Thursday 18:30 (Jerusalem) is rejected", async () => {
  await makeEligiblePlayer("p1");
  const { getCurrentLeagueTournamentOccurrenceWindow } = await import("../utils/jerusalem-schedule.ts");
  const window = getCurrentLeagueTournamentOccurrenceWindow(NOW);
  const afterClose = new Date(window.registrationClosesAt.getTime() + 60_000);

  const result = await registerForLeague("p1", "league-1", afterClose);
  assert.deepEqual(result, { status: "registration-closed" });
});

test("duplicate registration is idempotent — returns already-registered, no second participant row", async () => {
  await makeEligiblePlayer("p1");
  const first = await registerForLeague("p1", "league-1", NOW);
  assert.equal(first.status, "registered");

  const second = await registerForLeague("p1", "league-1", NOW);
  assert.deepEqual(second, { status: "already-registered", tournamentId: (first as { tournamentId: string }).tournamentId });

  const tournament = await getCurrentTournamentForLeague("league-1", NOW);
  const participants = getLeagueTournamentParticipantRows(tournament!.id);
  assert.equal(participants.filter((p) => p.playerId === "p1").length, 1);
});

test("registration uses the Asia/Jerusalem schedule — the created tournament's weekKey/times match getCurrentLeagueTournamentOccurrenceWindow", async () => {
  await makeEligiblePlayer("p1");
  await registerForLeague("p1", "league-1", NOW);

  const { getCurrentLeagueTournamentOccurrenceWindow, getLeagueTournamentWeekKey } = await import("../utils/jerusalem-schedule.ts");
  const window = getCurrentLeagueTournamentOccurrenceWindow(NOW);
  const weekKey = getLeagueTournamentWeekKey(window.registrationClosesAt);

  const row = getLeagueTournamentRow("league-1", weekKey);
  assert.ok(row);
  assert.equal(row!.registrationClosesAt.getTime(), window.registrationClosesAt.getTime());
  assert.equal(row!.round1StartsAt.getTime(), window.round1StartsAt.getTime());
});

test("the same weekly tournament occurrence cannot be created twice — two players registering both land on the same tournament row", async () => {
  await makeEligiblePlayer("p1");
  await makeEligiblePlayer("p2");

  const first = await registerForLeague("p1", "league-1", NOW);
  const second = await registerForLeague("p2", "league-1", NOW);

  assert.equal(first.status, "registered");
  assert.equal(second.status, "registered");
  assert.equal((first as { tournamentId: string }).tournamentId, (second as { tournamentId: string }).tournamentId);
});

test("Round-1 generation: 10 registered real players -> 5 matches, no filler", async () => {
  for (let i = 1; i <= 10; i++) {
    await makeEligiblePlayer(`p${i}`);
    await registerForLeague(`p${i}`, "league-1", NOW);
  }

  const tournament = await getCurrentTournamentForLeague("league-1", NOW);
  const result = await generateRound1ForTournament(tournament!.id, () => 0.5);
  assert.deepEqual(result, { status: "generated", matchCount: 5 });

  const matches = getLeagueTournamentMatchRows(tournament!.id, 1);
  assert.equal(matches.length, 5);
  assert.ok(matches.every((m) => !m.involvesComputer));

  const updatedTournament = getLeagueTournamentRow("league-1", tournament!.weekKey);
  assert.equal(updatedTournament!.status, "generated");
});

test("Round-1 generation: 5 registered real players -> one computer filler participant + 3 matches", async () => {
  for (let i = 1; i <= 5; i++) {
    await makeEligiblePlayer(`p${i}`);
    await registerForLeague(`p${i}`, "league-1", NOW);
  }

  const tournament = await getCurrentTournamentForLeague("league-1", NOW);
  const result = await generateRound1ForTournament(tournament!.id, () => 0.5);
  assert.deepEqual(result, { status: "generated", matchCount: 3 });

  const participants = getLeagueTournamentParticipantRows(tournament!.id);
  const computerParticipants = participants.filter((p) => p.participantType === "computer");
  assert.equal(computerParticipants.length, 1);
  assert.equal(computerParticipants[0].playerId, null);

  const matches = getLeagueTournamentMatchRows(tournament!.id, 1);
  assert.equal(matches.filter((m) => m.involvesComputer).length, 1);
});

test("fewer than 2 registered real players at generation time returns not-enough-participants, no matches created", async () => {
  await makeEligiblePlayer("p1");
  await registerForLeague("p1", "league-1", NOW);

  const tournament = await getCurrentTournamentForLeague("league-1", NOW);
  const result = await generateRound1ForTournament(tournament!.id, () => 0.5);
  assert.deepEqual(result, { status: "not-enough-participants" });

  const matches = getLeagueTournamentMatchRows(tournament!.id);
  assert.equal(matches.length, 0);
});

test("Round-1 matches are scheduled at the tournament's own round1StartsAt", async () => {
  for (let i = 1; i <= 2; i++) {
    await makeEligiblePlayer(`p${i}`);
    await registerForLeague(`p${i}`, "league-1", NOW);
  }

  const tournament = await getCurrentTournamentForLeague("league-1", NOW);
  await generateRound1ForTournament(tournament!.id, () => 0.5);

  const matches = getLeagueTournamentMatchRows(tournament!.id, 1);
  assert.equal(matches[0].scheduledAt.getTime(), tournament!.round1StartsAt.getTime());
});
