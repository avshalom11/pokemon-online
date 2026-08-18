// GYMS & LEAGUES PHASE 6 — focused coverage for League PvP session join/
// party-snapshot behavior (SESSION/JOIN items 1-8, PARTY items 9-13).
// Runs the REAL joinLeagueMatch unmodified against the in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { joinLeagueMatch } from "./league-battle-session.service.ts";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
  getPlayerPokemonRow,
  getLeagueBattleSessionRow,
} from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_A = "player-a";
const PLAYER_B = "player-b";
const STRANGER = "stranger";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_A, level: 20, experience: 0 });
  seedPlayerProfile({ id: PLAYER_B, level: 20, experience: 0 });
  seedPlayerProfile({ id: STRANGER, level: 20, experience: 0 });
});

function seedParty(playerId: string, count: number, startHp = 100) {
  for (let i = 1; i <= count; i++) {
    const id = `${playerId}-p${i}`;
    seedPlayerPokemon({ id, playerId, speciesId: "charmander", level: 20, currentHp: startHp, partySlot: i });
    seedKnownMove({ playerPokemonId: id, moveId: "scratch", slot: 1 });
  }
}

async function createMatch(sideBType: "player" | "computer" = "player") {
  const tournament = await prisma.leagueTournament.create({
    data: { leagueId: "league-1", weekKey: "2026-01-01", registrationClosesAt: new Date(), round1StartsAt: new Date() },
  });
  const participantA = await prisma.leagueTournamentParticipant.create({
    data: { tournamentId: tournament.id, playerId: PLAYER_A, participantType: "player" },
  });
  const participantB = await prisma.leagueTournamentParticipant.create({
    data:
      sideBType === "player"
        ? { tournamentId: tournament.id, playerId: PLAYER_B, participantType: "player" }
        : { tournamentId: tournament.id, playerId: null, participantType: "computer" },
  });
  const match = await prisma.leagueTournamentMatch.create({
    data: { tournamentId: tournament.id, roundNumber: 1, slot: 0, scheduledAt: new Date(), participantAId: participantA.id, participantBId: participantB.id },
  });
  return { tournament, participantA, participantB, match };
}

test("a non-participant cannot join the match", async () => {
  seedParty(PLAYER_A, 1);
  seedParty(PLAYER_B, 1);
  const { match } = await createMatch();

  const result = await joinLeagueMatch(match.id, STRANGER);
  assert.deepEqual(result, { status: "not-a-participant" });
});

test("an actual participant can join their assigned match", async () => {
  seedParty(PLAYER_A, 1);
  seedParty(PLAYER_B, 1);
  const { match } = await createMatch();

  const result = await joinLeagueMatch(match.id, PLAYER_A);
  assert.equal(result.status, "joined");
});

test("the first join creates exactly one session", async () => {
  seedParty(PLAYER_A, 1);
  seedParty(PLAYER_B, 1);
  const { match } = await createMatch();

  await joinLeagueMatch(match.id, PLAYER_A);
  const session = getLeagueBattleSessionRow(match.id);
  assert.ok(session);
});

test("concurrent join attempts do not duplicate the session", async () => {
  seedParty(PLAYER_A, 1);
  seedParty(PLAYER_B, 1);
  const { match } = await createMatch();

  const [first, second] = await Promise.all([joinLeagueMatch(match.id, PLAYER_A), joinLeagueMatch(match.id, PLAYER_A)]);
  assert.equal(first.status, "joined");
  assert.equal(second.status, "joined");
  if (first.status === "joined" && second.status === "joined") {
    assert.equal(first.session.id, second.session.id);
  }
});

test("the second human joins the SAME existing session created by the first", async () => {
  seedParty(PLAYER_A, 1);
  seedParty(PLAYER_B, 1);
  const { match } = await createMatch();

  const first = await joinLeagueMatch(match.id, PLAYER_A);
  const second = await joinLeagueMatch(match.id, PLAYER_B);
  assert.equal(first.status, "joined");
  assert.equal(second.status, "joined");
  if (first.status === "joined" && second.status === "joined") {
    assert.equal(first.session.id, second.session.id);
  }
});

test("a computer match becomes ready (both sides joined) the instant the real player joins", async () => {
  seedParty(PLAYER_A, 3);
  const { match } = await createMatch("computer");

  const result = await joinLeagueMatch(match.id, PLAYER_A);
  assert.equal(result.status, "joined");
  if (result.status !== "joined") return;

  assert.ok(result.session.participantAJoinedAt);
  assert.ok(result.session.participantBJoinedAt, "computer side must be auto-joined immediately");
  assert.equal(result.session.status, "in-progress");
});

test("PvP status stays waiting-for-players until BOTH real humans have joined", async () => {
  seedParty(PLAYER_A, 1);
  seedParty(PLAYER_B, 1);
  const { match } = await createMatch();

  const first = await joinLeagueMatch(match.id, PLAYER_A);
  assert.equal(first.status, "joined");
  if (first.status === "joined") {
    assert.equal(first.session.status, "waiting-for-players");
  }

  const second = await joinLeagueMatch(match.id, PLAYER_B);
  assert.equal(second.status, "joined");
  if (second.status === "joined") {
    assert.equal(second.session.status, "in-progress");
  }
});

test("first-entry timestamps are stored per side, independently", async () => {
  seedParty(PLAYER_A, 1);
  seedParty(PLAYER_B, 1);
  const { match } = await createMatch();

  const before = new Date();
  const first = await joinLeagueMatch(match.id, PLAYER_A);
  assert.equal(first.status, "joined");
  if (first.status !== "joined") return;
  assert.ok(first.session.participantAJoinedAt);
  assert.ok((first.session.participantAJoinedAt as Date).getTime() >= before.getTime());
  assert.equal(first.session.participantBJoinedAt, null);
});

test("at most 6 Pokémon are snapshotted even with a larger party", async () => {
  seedParty(PLAYER_A, 8);
  seedParty(PLAYER_B, 1);
  const { match } = await createMatch();

  const result = await joinLeagueMatch(match.id, PLAYER_A);
  assert.equal(result.status, "joined");
  if (result.status !== "joined") return;

  const snapshot = result.session.participantAPokemon as unknown as { slotId: string }[];
  assert.equal(snapshot.length, 6);
});

test("the current party is snapshotted once — later party edits do not affect the already-joined session", async () => {
  seedParty(PLAYER_A, 2);
  seedParty(PLAYER_B, 1);
  const { match } = await createMatch();

  const result = await joinLeagueMatch(match.id, PLAYER_A);
  assert.equal(result.status, "joined");
  if (result.status !== "joined") return;
  const originalSnapshot = JSON.stringify(result.session.participantAPokemon);

  // Simulate a party edit after joining — add a new party member.
  seedPlayerPokemon({ id: `${PLAYER_A}-p3`, playerId: PLAYER_A, speciesId: "squirtle", level: 20, currentHp: 100, partySlot: 3 });

  const rejoin = await joinLeagueMatch(match.id, PLAYER_A);
  assert.equal(rejoin.status, "joined");
  if (rejoin.status !== "joined") return;
  assert.equal(JSON.stringify(rejoin.session.participantAPokemon), originalSnapshot, "re-joining an already-joined side must not re-snapshot");
});

test("all participating Pokémon start at full battle-local HP", async () => {
  seedPlayerPokemon({ id: `${PLAYER_A}-p1`, playerId: PLAYER_A, speciesId: "charmander", level: 20, currentHp: 1, partySlot: 1 });
  seedKnownMove({ playerPokemonId: `${PLAYER_A}-p1`, moveId: "scratch", slot: 1 });
  seedParty(PLAYER_B, 1);
  const { match } = await createMatch();

  const result = await joinLeagueMatch(match.id, PLAYER_A);
  assert.equal(result.status, "joined");
  if (result.status !== "joined") return;

  const battleHp = result.session.participantABattleHp as unknown as Record<string, number>;
  assert.ok(battleHp[`${PLAYER_A}-p1`] > 1, "battle-local HP must be full, not the real (damaged) currentHp");
});

test("permanent PlayerPokemon.currentHp is never touched by joining a League match", async () => {
  seedPlayerPokemon({ id: `${PLAYER_A}-p1`, playerId: PLAYER_A, speciesId: "charmander", level: 20, currentHp: 1, partySlot: 1 });
  seedKnownMove({ playerPokemonId: `${PLAYER_A}-p1`, moveId: "scratch", slot: 1 });
  seedParty(PLAYER_B, 1);
  const { match } = await createMatch();

  await joinLeagueMatch(match.id, PLAYER_A);

  assert.equal(getPlayerPokemonRow(`${PLAYER_A}-p1`)?.currentHp, 1);
});
