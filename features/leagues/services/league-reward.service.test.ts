// GYMS & LEAGUES PHASE 8 — focused coverage for reward granting (REWARD
// SAFETY items 29-42). Runs the REAL grantCompletedLeagueTournamentRewards
// unmodified against the in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { calculateLeagueRewardXp, grantCompletedLeagueTournamentRewards } from "./league-reward.service.ts";
import { getXpRequiredForNextLevel } from "@/features/player-progression/progression-calculations";
import { chestInventoryItemId } from "@/features/chests/services/chest-ownership.service";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedPlayerProfile,
  getPlayerProfileRow,
  getInventoryItemRow,
  getOwnedEggRowsForPlayer,
} from "../../../test/support/fakes/prisma.fake.ts";

const FIRST = "first-place";
const SECOND = "second-place";
const THIRD = "third-place";
const FOURTH = "fourth-place";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: FIRST, level: 20, experience: 0 });
  seedPlayerProfile({ id: SECOND, level: 20, experience: 0 });
  seedPlayerProfile({ id: THIRD, level: 20, experience: 0 });
  seedPlayerProfile({ id: FOURTH, level: 20, experience: 0 });
});

async function createCompletedTournament(leagueId: string) {
  const tournament = await prisma.leagueTournament.create({
    data: { leagueId, weekKey: "2026-01-08", registrationClosesAt: new Date(), round1StartsAt: new Date(), status: "completed" },
  });
  const p1 = await prisma.leagueTournamentParticipant.create({ data: { tournamentId: tournament.id, playerId: FIRST, participantType: "player" } });
  const p2 = await prisma.leagueTournamentParticipant.create({ data: { tournamentId: tournament.id, playerId: SECOND, participantType: "player" } });
  const p3 = await prisma.leagueTournamentParticipant.create({ data: { tournamentId: tournament.id, playerId: THIRD, participantType: "player" } });
  const p4 = await prisma.leagueTournamentParticipant.create({ data: { tournamentId: tournament.id, playerId: FOURTH, participantType: "player" } });
  const computer = await prisma.leagueTournamentParticipant.create({ data: { tournamentId: tournament.id, playerId: null, participantType: "computer" } });

  await prisma.leagueTournamentPlacement.create({ data: { tournamentId: tournament.id, place: 1, participantId: p1.id, playerId: FIRST } });
  await prisma.leagueTournamentPlacement.create({ data: { tournamentId: tournament.id, place: 2, participantId: p2.id, playerId: SECOND } });
  await prisma.leagueTournamentPlacement.create({ data: { tournamentId: tournament.id, place: 3, participantId: p3.id, playerId: THIRD } });

  return { tournament, p1, p2, p3, p4, computer };
}

test("1st/2nd/3rd receive ONLY their placement reward — never also Participation", async () => {
  const { tournament } = await createCompletedTournament("league-1");
  const result = await grantCompletedLeagueTournamentRewards(tournament.id);
  assert.equal(result.status, "granted");
  if (result.status !== "granted") return;

  const first = result.results.find((r) => r.playerId === FIRST)!;
  const second = result.results.find((r) => r.playerId === SECOND)!;
  const third = result.results.find((r) => r.playerId === THIRD)!;
  assert.equal(first.kind, "placement");
  assert.equal(second.kind, "placement");
  assert.equal(third.kind, "placement");

  assert.equal(result.results.filter((r) => r.playerId === FIRST).length, 1, "no double-reward for 1st");
  assert.equal(result.results.filter((r) => r.playerId === SECOND).length, 1, "no double-reward for 2nd");
  assert.equal(result.results.filter((r) => r.playerId === THIRD).length, 1, "no double-reward for 3rd");
});

test("4th place / outside Top 3 receives ONLY the Participation Reward", async () => {
  const { tournament } = await createCompletedTournament("league-1");
  const result = await grantCompletedLeagueTournamentRewards(tournament.id);
  assert.equal(result.status, "granted");
  if (result.status !== "granted") return;

  const fourth = result.results.find((r) => r.playerId === FOURTH)!;
  assert.equal(fourth.kind, "participation");
  assert.equal(fourth.money, 1_000);
  assert.deepEqual(fourth.eggRewards, [{ rarity: "common", quantity: 1 }]);
});

test("the computer participant receives nothing", async () => {
  const { tournament, computer } = await createCompletedTournament("league-1");
  const result = await grantCompletedLeagueTournamentRewards(tournament.id);
  assert.equal(result.status, "granted");
  if (result.status !== "granted") return;

  assert.ok(!result.results.some((r) => r.playerId === computer.playerId));
  assert.equal(result.results.length, 4, "exactly the 4 real participants, never the computer");
});

test("Money is granted exactly as the registry specifies for each place", async () => {
  const beforeFirst = getPlayerProfileRow(FIRST)!.coins;
  const beforeSecond = getPlayerProfileRow(SECOND)!.coins;
  const beforeThird = getPlayerProfileRow(THIRD)!.coins;
  const { tournament } = await createCompletedTournament("league-1");
  await grantCompletedLeagueTournamentRewards(tournament.id);

  assert.equal(getPlayerProfileRow(FIRST)!.coins, beforeFirst + 10_000);
  assert.equal(getPlayerProfileRow(SECOND)!.coins, beforeSecond + 7_000);
  assert.equal(getPlayerProfileRow(THIRD)!.coins, beforeThird + 4_000);
});

test("Gold currency is granted exactly as the registry specifies (never confused with Gold Chest)", async () => {
  const beforeGold = getPlayerProfileRow(FIRST)!.gold;
  const { tournament } = await createCompletedTournament("league-1");
  await grantCompletedLeagueTournamentRewards(tournament.id);

  assert.equal(getPlayerProfileRow(FIRST)!.gold, beforeGold + 100);
});

test("Chest quantities are granted exactly as the registry specifies", async () => {
  const { tournament } = await createCompletedTournament("league-3");
  await grantCompletedLeagueTournamentRewards(tournament.id);

  // League III 1st: Diamond Chest x1.
  assert.equal(getInventoryItemRow(FIRST, chestInventoryItemId("diamond"))?.quantity, 1);
  // League III 3rd: Silver Chest x2.
  assert.equal(getInventoryItemRow(THIRD, chestInventoryItemId("silver"))?.quantity, 2);
});

test("Egg quantities/rarities are granted exactly as the registry specifies", async () => {
  const { tournament } = await createCompletedTournament("league-3");
  await grantCompletedLeagueTournamentRewards(tournament.id);

  // League III participation (4th place, FOURTH): Rare Egg x1.
  const eggs = getOwnedEggRowsForPlayer(FOURTH);
  assert.equal(eggs.length, 1);
  assert.equal(eggs[0].rarity, "rare");
  assert.equal(eggs[0].source, "league");
});

test("XP uses the current-level -> next-level curve, computed at grant time", async () => {
  seedPlayerProfile({ id: FIRST, level: 30, experience: 0 });
  const required = getXpRequiredForNextLevel(30);
  const expectedXp = calculateLeagueRewardXp(30, 50); // League I 1st: 50%
  assert.equal(expectedXp, Math.floor(required * 0.5));

  const { tournament } = await createCompletedTournament("league-1");
  const result = await grantCompletedLeagueTournamentRewards(tournament.id);
  assert.equal(result.status, "granted");
  if (result.status !== "granted") return;
  const first = result.results.find((r) => r.playerId === FIRST)!;
  assert.equal(first.xpAmount, expectedXp);
});

test("a duplicate reward invocation grants nothing twice", async () => {
  const { tournament } = await createCompletedTournament("league-1");
  const first = await grantCompletedLeagueTournamentRewards(tournament.id);
  assert.equal(first.status, "granted");

  const coinsAfterFirst = getPlayerProfileRow(FIRST)!.coins;
  const second = await grantCompletedLeagueTournamentRewards(tournament.id);
  assert.deepEqual(second, { status: "already-granted" });
  assert.equal(getPlayerProfileRow(FIRST)!.coins, coinsAfterFirst, "no second money grant");
});

test("concurrent reward attempts are safe — only one actually grants", async () => {
  const { tournament } = await createCompletedTournament("league-1");
  const [a, b] = await Promise.all([grantCompletedLeagueTournamentRewards(tournament.id), grantCompletedLeagueTournamentRewards(tournament.id)]);
  const statuses = [a.status, b.status].sort();
  assert.deepEqual(statuses, ["already-granted", "granted"]);
});

test("a not-yet-completed tournament is rejected outright", async () => {
  const tournament = await prisma.leagueTournament.create({
    data: { leagueId: "league-1", weekKey: "2026-01-08", registrationClosesAt: new Date(), round1StartsAt: new Date(), status: "generated" },
  });
  const result = await grantCompletedLeagueTournamentRewards(tournament.id);
  assert.deepEqual(result, { status: "not-completed" });
});
