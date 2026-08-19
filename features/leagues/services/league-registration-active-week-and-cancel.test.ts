// LEAGUE REGISTRATION — ACTIVE-WEEK ONLY + CANCEL REGISTRATION — focused
// coverage. Runs the REAL registerForLeague/cancelLeagueRegistration
// against the in-memory fake DB, same convention every other League
// service test already establishes.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import {
  cancelLeagueRegistration,
  generateRound1ForTournament,
  getCurrentTournamentForLeague,
  registerForLeague,
} from "./league-tournament.service.ts";
import { getCurrentLeagueTournamentOccurrenceWindow } from "../utils/jerusalem-schedule.ts";
import { markGymBattleCompleted, markRegionalChampionDefeated } from "@/features/gyms/services/gym-progression.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile, getLeagueTournamentParticipantRows } from "../../../test/support/fakes/prisma.fake.ts";

// League I's own week under the current cycle anchor (league-cycle.ts's
// CYCLE_ANCHOR_WEEK_KEY = "2026-08-06").
const NOW = new Date("2026-08-03T08:00:00Z"); // Monday — registration open, resolves to Thursday 2026-08-06 (League I)
const WINDOW = getCurrentLeagueTournamentOccurrenceWindow(NOW);
const AFTER_CLOSE = new Date(WINDOW.registrationClosesAt.getTime() + 60_000);

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

const ALL_REGIONS = ["kanto", "johto", "hoenn", "sinnoh", "unova", "kalos", "alola", "galar", "paldea"] as const;

// ============================================================
// ACTIVE-WEEK ONLY
// ============================================================

// 1. Inactive League cannot register.
test("1: during League I's week, League II and League III registration are both rejected as league-not-active-this-week", async () => {
  await makeEligiblePlayer("p1", ["sinnoh", "unova", "kalos"]);
  await makeEligiblePlayer("p2", ["alola", "galar", "paldea"]);

  const r2 = await registerForLeague("p1", "league-2", NOW);
  assert.deepEqual(r2, { status: "league-not-active-this-week" });

  const r3 = await registerForLeague("p2", "league-3", NOW);
  assert.deepEqual(r3, { status: "league-not-active-this-week" });
});

// 2. Active League can register if eligible.
test("2: during League I's week, an eligible player CAN register for League I", async () => {
  await makeEligiblePlayer("p1", ["kanto", "johto", "hoenn"]);
  const result = await registerForLeague("p1", "league-1", NOW);
  assert.equal(result.status, "registered");
});

// 3. Eligible-for-all still can register only the currently-active League.
test("3: a player eligible for ALL 3 regional Leagues can still only register for the ONE currently-active League (League I this week)", async () => {
  await makeEligiblePlayer("polymath", ALL_REGIONS);

  const league1 = await registerForLeague("polymath", "league-1", NOW);
  assert.equal(league1.status, "registered", "the currently-active League must succeed");

  const league2 = await registerForLeague("polymath", "league-2", NOW);
  assert.deepEqual(league2, { status: "league-not-active-this-week" });

  const league3 = await registerForLeague("polymath", "league-3", NOW);
  assert.deepEqual(league3, { status: "league-not-active-this-week" });
});

// Champions League still has no manual registration, even during its own
// active week.
test("Champions League still has no manual registration at all", async () => {
  seedPlayerProfile({ id: "p1", level: 50, experience: 0 });
  const result = await registerForLeague("p1", "champions-league", NOW);
  assert.deepEqual(result, { status: "champions-league-not-registerable" });
});

// ============================================================
// CANCEL REGISTRATION
// ============================================================

// 4. Registered player can cancel while open.
test("4: a registered player can cancel their own registration while registration is still open", async () => {
  await makeEligiblePlayer("p1");
  await registerForLeague("p1", "league-1", NOW);

  const result = await cancelLeagueRegistration("p1", "league-1", NOW);
  assert.deepEqual(result, { status: "cancelled" });

  const tournament = await getCurrentTournamentForLeague("league-1", NOW);
  const participants = getLeagueTournamentParticipantRows(tournament!.id);
  assert.ok(!participants.some((p) => p.playerId === "p1"), "the participant row must actually be gone");
});

// 5. Cancel after 18:30 rejected.
test("5: cancelling after Thursday 18:30 (registration closed) is rejected", async () => {
  await makeEligiblePlayer("p1");
  await registerForLeague("p1", "league-1", NOW);

  const result = await cancelLeagueRegistration("p1", "league-1", AFTER_CLOSE);
  assert.deepEqual(result, { status: "registration-closed" });

  // The registration must still exist — a rejected cancel must not
  // silently remove it anyway.
  const tournament = await getCurrentTournamentForLeague("league-1", NOW);
  const participants = getLeagueTournamentParticipantRows(tournament!.id);
  assert.ok(participants.some((p) => p.playerId === "p1"));
});

// 6. Cancel after Round 1 generation rejected.
test("6: cancelling once Round 1 has already been generated is rejected, even if the clock still shows 'open'", async () => {
  await makeEligiblePlayer("p1");
  await makeEligiblePlayer("p2");
  await registerForLeague("p1", "league-1", NOW);
  await registerForLeague("p2", "league-1", NOW);

  const tournament = await getCurrentTournamentForLeague("league-1", NOW);
  const generated = await generateRound1ForTournament(tournament!.id, () => 0.5);
  assert.equal(generated.status, "generated");

  // Still well within the registration window per the clock (NOW), but the
  // tournament has already moved past "registration-open".
  const result = await cancelLeagueRegistration("p1", "league-1", NOW);
  assert.deepEqual(result, { status: "round1-already-generated" });

  const participants = getLeagueTournamentParticipantRows(tournament!.id);
  assert.ok(participants.some((p) => p.playerId === "p1"), "the participant row must survive a rejected cancel");
});

// 7. Player cannot cancel another player's registration.
test("7: cancelling only ever removes the CALLING player's own row — another player's registration is untouched", async () => {
  await makeEligiblePlayer("p1");
  await makeEligiblePlayer("p2");
  await registerForLeague("p1", "league-1", NOW);
  await registerForLeague("p2", "league-1", NOW);

  const result = await cancelLeagueRegistration("p1", "league-1", NOW);
  assert.deepEqual(result, { status: "cancelled" });

  const tournament = await getCurrentTournamentForLeague("league-1", NOW);
  const participants = getLeagueTournamentParticipantRows(tournament!.id);
  assert.ok(!participants.some((p) => p.playerId === "p1"), "p1's own row must be gone");
  assert.ok(participants.some((p) => p.playerId === "p2"), "p2's row must be completely untouched");
});

// 8. Cancellation removes only that participant row (never the tournament,
// never any other player's row — the second half is covered by test 7
// above; this proves the tournament row itself survives).
test("8: cancellation removes only the participant row — the tournament row itself is never deleted", async () => {
  await makeEligiblePlayer("p1");
  await registerForLeague("p1", "league-1", NOW);

  const beforeTournament = await getCurrentTournamentForLeague("league-1", NOW);
  await cancelLeagueRegistration("p1", "league-1", NOW);
  const afterTournament = await getCurrentTournamentForLeague("league-1", NOW);

  assert.ok(afterTournament, "the tournament row must still exist after a cancel");
  assert.equal(afterTournament!.id, beforeTournament!.id);
});

// 9. Repeated cancellation is safe.
test("9: cancelling twice is safe/idempotent — the second call reports not-registered rather than throwing", async () => {
  await makeEligiblePlayer("p1");
  await registerForLeague("p1", "league-1", NOW);

  const first = await cancelLeagueRegistration("p1", "league-1", NOW);
  assert.deepEqual(first, { status: "cancelled" });

  const second = await cancelLeagueRegistration("p1", "league-1", NOW);
  assert.deepEqual(second, { status: "not-registered" });

  // Cancelling a League a player was never even registered for at all
  // (no tournament instance exists yet this week) is equally safe.
  await makeEligiblePlayer("p2");
  const neverRegistered = await cancelLeagueRegistration("p2", "league-1", NOW);
  assert.deepEqual(neverRegistered, { status: "not-registered" });
});

// 10. Champions League manual register/cancel remains unavailable.
test("10: Champions League has no manual cancel flow either", async () => {
  const result = await cancelLeagueRegistration("p1", "champions-league", NOW);
  assert.deepEqual(result, { status: "champions-league-not-cancellable" });
});

// Additional explicit boundary checks the ticket calls out by name.
test("cancellation never affects Gym progression or League eligibility — cancelLeagueRegistration only ever touches LeagueTournamentParticipant", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("features/leagues/services/league-tournament.service.ts", "utf8");
  const fnBody = src.slice(src.indexOf("export async function cancelLeagueRegistration"), src.indexOf("export async function isPlayerRegistered"));
  assert.ok(!fnBody.includes("markGymBattleCompleted") && !fnBody.includes("markRegionalChampionDefeated") && !fnBody.includes("gym-progression"), "must never touch Gym progression");
  assert.ok(fnBody.includes("leagueTournamentParticipant.deleteMany"), "must use the existing LeagueTournamentParticipant table — never a second registration table");
  assert.ok(!fnBody.includes("leagueTournament.delete"), "must never delete the tournament row itself");
});

test("only the authenticated player's own id can ever be passed to cancelLeagueRegistration — the Server Action always derives playerId from the session", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("features/leagues/actions/register-for-league.action.ts", "utf8");
  assert.ok(src.includes("export async function cancelLeagueRegistrationAction"));
  const fnBody = src.slice(src.indexOf("export async function cancelLeagueRegistrationAction"));
  assert.ok(fnBody.includes("getCurrentSession()"));
  assert.ok(fnBody.includes("cancelLeagueRegistration(profile.id, leagueId)"), "playerId must come from the resolved session profile, never a client-supplied id");
});
