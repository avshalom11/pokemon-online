// LEAGUE — FINAL PLACEMENT CELEBRATION MODAL. Focused coverage for the
// service layer: pending-celebration derivation, acknowledgement
// persistence/idempotency, ownership enforcement, and "never grants
// rewards" — runs the REAL functions against the in-memory fake DB, same
// precedent league-achievement.service.test.ts's own
// createCompletedTournamentWithWinner helper already establishes.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import {
  acknowledgeLeaguePlacementCelebration,
  getPendingLeaguePlacementCelebrations,
} from "./league-placement-celebration.service.ts";
import { getLeaguePlacementRewardDefinition } from "../data/league-reward-registry.ts";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile, getNotificationsFor, getPlayerProfileRow } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER = "player-1";
const OTHER_PLAYER = "player-2";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER, level: 10, experience: 0, coins: 1000, gold: 50 });
  seedPlayerProfile({ id: OTHER_PLAYER, level: 10, experience: 0, coins: 1000, gold: 50 });
});

async function createCompletedTournamentWithPlacement(leagueId: string, weekKey: string, playerId: string, place: 1 | 2 | 3) {
  const tournament = await prisma.leagueTournament.create({
    data: { leagueId, weekKey, registrationClosesAt: new Date(), round1StartsAt: new Date(), status: "completed" },
  });
  const participant = await prisma.leagueTournamentParticipant.create({
    data: { tournamentId: tournament.id, playerId, participantType: "player" },
  });
  await prisma.leagueTournamentPlacement.create({ data: { tournamentId: tournament.id, place, participantId: participant.id, playerId } });
  return tournament;
}

test("participation-only player (no LeagueTournamentPlacement rows) never gets a pending celebration", async () => {
  const pending = await getPendingLeaguePlacementCelebrations(PLAYER);
  assert.deepEqual(pending, []);
});

test("1st place resolves the correct trophy title, League name, and gold award image for that League", async () => {
  await createCompletedTournamentWithPlacement("league-2", "2026-01-08", PLAYER, 1);

  const [celebration] = await getPendingLeaguePlacementCelebrations(PLAYER);
  assert.equal(celebration.place, 1);
  assert.equal(celebration.placementTitle, "מקום ראשון!");
  assert.equal(celebration.leagueDisplayName, "ליגה II");
  assert.equal(celebration.imageUrl, "/images/leagues/awards/gold-2.png");
});

test("2nd place resolves the correct silver award image", async () => {
  await createCompletedTournamentWithPlacement("league-3", "2026-01-08", PLAYER, 2);

  const [celebration] = await getPendingLeaguePlacementCelebrations(PLAYER);
  assert.equal(celebration.place, 2);
  assert.equal(celebration.placementTitle, "מקום שני!");
  assert.equal(celebration.imageUrl, "/images/leagues/awards/silver-3.png");
});

test("3rd place resolves the correct arad award image (never bronze)", async () => {
  await createCompletedTournamentWithPlacement("champions-league", "2026-01-29", PLAYER, 3);

  const [celebration] = await getPendingLeaguePlacementCelebrations(PLAYER);
  assert.equal(celebration.place, 3);
  assert.equal(celebration.placementTitle, "מקום שלישי!");
  assert.equal(celebration.imageUrl, "/images/leagues/awards/arad-4.png");
});

test("the reward summary is the REAL canonical LeaguePlacementRewardDefinition, never a second/duplicated table", async () => {
  await createCompletedTournamentWithPlacement("league-1", "2026-01-08", PLAYER, 1);

  const [celebration] = await getPendingLeaguePlacementCelebrations(PLAYER);
  assert.deepEqual(celebration.reward, getLeaguePlacementRewardDefinition("league-1", 1));
});

test("acknowledging a real placement persists server-side (a real Notification row is created)", async () => {
  const tournament = await createCompletedTournamentWithPlacement("league-1", "2026-01-08", PLAYER, 1);

  const result = await acknowledgeLeaguePlacementCelebration(PLAYER, tournament.id);
  assert.equal(result, "acknowledged");

  const notifications = getNotificationsFor(PLAYER).filter((n) => n.type === "LEAGUE_PLACEMENT_ACHIEVED");
  assert.equal(notifications.length, 1);
  assert.deepEqual(notifications[0]!.metadata, { tournamentId: tournament.id, leagueId: "league-1", place: 1 });
});

test("an acknowledged placement never appears again in getPendingLeaguePlacementCelebrations — refresh does not resurrect it", async () => {
  const tournament = await createCompletedTournamentWithPlacement("league-1", "2026-01-08", PLAYER, 1);
  await acknowledgeLeaguePlacementCelebration(PLAYER, tournament.id);

  const pendingAfter = await getPendingLeaguePlacementCelebrations(PLAYER);
  assert.deepEqual(pendingAfter, []);

  // "refresh" — calling the read path again must still show nothing.
  const pendingAgain = await getPendingLeaguePlacementCelebrations(PLAYER);
  assert.deepEqual(pendingAgain, []);
});

test("duplicate acknowledgement submissions are rejected — a second call returns 'already-acknowledged' and creates no second notification", async () => {
  const tournament = await createCompletedTournamentWithPlacement("league-1", "2026-01-08", PLAYER, 1);

  const first = await acknowledgeLeaguePlacementCelebration(PLAYER, tournament.id);
  const second = await acknowledgeLeaguePlacementCelebration(PLAYER, tournament.id);

  assert.equal(first, "acknowledged");
  assert.equal(second, "already-acknowledged");

  const notifications = getNotificationsFor(PLAYER).filter((n) => n.type === "LEAGUE_PLACEMENT_ACHIEVED");
  assert.equal(notifications.length, 1, "exactly one acknowledgement record must exist, never a duplicate");
});

test("a player can never acknowledge another player's placement by supplying an arbitrary tournamentId — ownership is validated server-side", async () => {
  const tournament = await createCompletedTournamentWithPlacement("league-1", "2026-01-08", PLAYER, 1);

  const result = await acknowledgeLeaguePlacementCelebration(OTHER_PLAYER, tournament.id);
  assert.equal(result, "not-found", "the OTHER player has no placement row for this tournament, so this must never succeed");

  // The real placement's own owner must still see it as pending — the
  // failed cross-player attempt must never have marked it acknowledged.
  const stillPendingForOwner = await getPendingLeaguePlacementCelebrations(PLAYER);
  assert.equal(stillPendingForOwner.length, 1);

  const otherPlayerNotifications = getNotificationsFor(OTHER_PLAYER).filter((n) => n.type === "LEAGUE_PLACEMENT_ACHIEVED");
  assert.deepEqual(otherPlayerNotifications, [], "the other player must never receive an acknowledgement record for a placement that isn't theirs");
});

test("acknowledging an unknown/nonexistent tournamentId returns 'not-found'", async () => {
  const result = await acknowledgeLeaguePlacementCelebration(PLAYER, "nonexistent-tournament-id");
  assert.equal(result, "not-found");
});

test("acknowledgement never grants rewards — the player's currency/gold/XP are completely unchanged by acknowledging", async () => {
  const tournament = await createCompletedTournamentWithPlacement("league-1", "2026-01-08", PLAYER, 1);
  const before = getPlayerProfileRow(PLAYER)!;

  await acknowledgeLeaguePlacementCelebration(PLAYER, tournament.id);

  const after = getPlayerProfileRow(PLAYER)!;
  assert.equal(after.coins, before.coins, "acknowledging must never grant money — that stays exclusively grantCompletedLeagueTournamentRewards's job");
  assert.equal(after.gold, before.gold, "acknowledging must never grant gold");
  assert.equal(after.experience, before.experience, "acknowledging must never grant XP");
  assert.equal(after.level, before.level);
});

// ============================================================================
// MULTIPLE UNSEEN PLACEMENTS (section 8) — presented one at a time, in
// deterministic order; acknowledging one never acknowledges the others.
// ============================================================================

test("multiple pending placements are returned in deterministic order (oldest tournament first, then place ascending) — never by insertion order", async () => {
  const t3 = await createCompletedTournamentWithPlacement("champions-league", "2026-01-29", PLAYER, 3);
  const t1 = await createCompletedTournamentWithPlacement("league-2", "2026-01-15", PLAYER, 1);
  const t2b = await createCompletedTournamentWithPlacement("league-1", "2026-02-05", PLAYER, 2);
  const t2a = await createCompletedTournamentWithPlacement("league-1", "2026-01-08", PLAYER, 1);

  const pending = await getPendingLeaguePlacementCelebrations(PLAYER);

  // weekKey ascending: t2a (2026-01-08) < t1 (2026-01-15) < t3 (2026-01-29) < t2b (2026-02-05).
  assert.deepEqual(
    pending.map((c) => c.tournamentId),
    [t2a.id, t1.id, t3.id, t2b.id]
  );
});

test("acknowledging one pending placement removes only that one — the other pending placements remain untouched and still pending", async () => {
  const t1 = await createCompletedTournamentWithPlacement("league-1", "2026-01-08", PLAYER, 1);
  const t2 = await createCompletedTournamentWithPlacement("league-2", "2026-01-15", PLAYER, 2);
  const t3 = await createCompletedTournamentWithPlacement("league-3", "2026-01-22", PLAYER, 3);

  await acknowledgeLeaguePlacementCelebration(PLAYER, t2.id);

  const pending = await getPendingLeaguePlacementCelebrations(PLAYER);
  assert.deepEqual(
    pending.map((c) => c.tournamentId).sort(),
    [t1.id, t3.id].sort(),
    "only the acknowledged tournament (t2) must be gone — t1 and t3 must still be pending"
  );
});

test("acknowledging every pending placement one at a time, in order, eventually empties the queue", async () => {
  const t1 = await createCompletedTournamentWithPlacement("league-1", "2026-01-08", PLAYER, 1);
  const t2 = await createCompletedTournamentWithPlacement("league-2", "2026-01-15", PLAYER, 2);

  let pending = await getPendingLeaguePlacementCelebrations(PLAYER);
  assert.equal(pending.length, 2);
  assert.equal(pending[0]!.tournamentId, t1.id, "the first (oldest) pending placement must be shown first");

  await acknowledgeLeaguePlacementCelebration(PLAYER, pending[0]!.tournamentId);
  pending = await getPendingLeaguePlacementCelebrations(PLAYER);
  assert.equal(pending.length, 1);
  assert.equal(pending[0]!.tournamentId, t2.id, "the next pending placement must now be first");

  await acknowledgeLeaguePlacementCelebration(PLAYER, pending[0]!.tournamentId);
  pending = await getPendingLeaguePlacementCelebrations(PLAYER);
  assert.deepEqual(pending, []);
});

test("different players' pending placements never interfere with each other", async () => {
  const t1 = await createCompletedTournamentWithPlacement("league-1", "2026-01-08", PLAYER, 1);
  await createCompletedTournamentWithPlacement("league-1", "2026-02-05", OTHER_PLAYER, 2);

  const pendingForPlayer = await getPendingLeaguePlacementCelebrations(PLAYER);
  assert.equal(pendingForPlayer.length, 1);
  assert.equal(pendingForPlayer[0]!.tournamentId, t1.id);
  assert.equal(pendingForPlayer[0]!.place, 1);

  const pendingForOther = await getPendingLeaguePlacementCelebrations(OTHER_PLAYER);
  assert.equal(pendingForOther.length, 1);
  assert.equal(pendingForOther[0]!.place, 2);
});
