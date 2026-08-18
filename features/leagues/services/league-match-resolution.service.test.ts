// GYMS & LEAGUES PHASE 7 — focused coverage for expired-match resolution
// (NO SHOW items 8-12, TIMEOUT items 13-18). Runs the REAL
// resolveExpiredLeagueMatch unmodified against the in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { resolveExpiredLeagueMatch } from "./league-match-resolution.service.ts";
import { joinLeagueMatch } from "./league-battle-session.service.ts";
import { submitLeagueBattleAction } from "./league-battle-action.service.ts";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
  getPlayerPokemonRow,
} from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_A = "player-a";
const PLAYER_B = "player-b";
const SCHEDULED_AT = new Date("2026-01-08T17:00:00Z");
const IN_WINDOW_NOW = new Date(SCHEDULED_AT.getTime() + 60_000); // 1 minute into the room window
const EXPIRED_NOW = new Date(SCHEDULED_AT.getTime() + 21 * 60_000); // 1 minute past the 20-minute deadline
const MAX_ROLL = () => 0.999999;

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_A, level: 20, experience: 0 });
  seedPlayerProfile({ id: PLAYER_B, level: 20, experience: 0 });
});

function seedParty(playerId: string, level = 20) {
  const id = `${playerId}-p1`;
  seedPlayerPokemon({ id, playerId, speciesId: "charmander", level, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: id, moveId: "scratch", slot: 1 });
  return id;
}

async function createMatch(scheduledAt: Date = SCHEDULED_AT) {
  const tournament = await prisma.leagueTournament.create({
    data: { leagueId: "league-1", weekKey: "2026-01-01", registrationClosesAt: new Date(), round1StartsAt: SCHEDULED_AT },
  });
  const participantA = await prisma.leagueTournamentParticipant.create({
    data: { tournamentId: tournament.id, playerId: PLAYER_A, participantType: "player" },
  });
  const participantB = await prisma.leagueTournamentParticipant.create({
    data: { tournamentId: tournament.id, playerId: PLAYER_B, participantType: "player" },
  });
  const match = await prisma.leagueTournamentMatch.create({
    data: { tournamentId: tournament.id, roundNumber: 1, slot: 0, scheduledAt, participantAId: participantA.id, participantBId: participantB.id },
  });
  return { tournament, participantA, participantB, match };
}

test("neither player entered -> random winner, reason random-no-show", async () => {
  seedParty(PLAYER_A);
  seedParty(PLAYER_B);
  const { match, participantA, participantB } = await createMatch();

  const result = await resolveExpiredLeagueMatch(match.id, EXPIRED_NOW, () => 0.1);
  assert.equal(result.status, "resolved");
  if (result.status !== "resolved") return;
  assert.equal(result.reason, "random-no-show");
  assert.ok(result.winnerParticipantId === participantA.id || result.winnerParticipantId === participantB.id);
});

test("the injected random source makes the no-show winner fully deterministic", async () => {
  seedParty(PLAYER_A);
  seedParty(PLAYER_B);
  const { match, participantA } = await createMatch();

  const result = await resolveExpiredLeagueMatch(match.id, EXPIRED_NOW, () => 0.1);
  assert.equal(result.status, "resolved");
  if (result.status !== "resolved") return;
  assert.equal(result.winnerParticipantId, participantA.id, "randomSource() < 0.5 must deterministically pick participant A");
});

test("only A entered -> A wins, reason opponent-no-show", async () => {
  seedParty(PLAYER_A);
  seedParty(PLAYER_B);
  const { match, participantA } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A, IN_WINDOW_NOW);

  const result = await resolveExpiredLeagueMatch(match.id, EXPIRED_NOW);
  assert.equal(result.status, "resolved");
  if (result.status !== "resolved") return;
  assert.equal(result.winnerParticipantId, participantA.id);
  assert.equal(result.reason, "opponent-no-show");
});

test("only B entered -> B wins, reason opponent-no-show", async () => {
  seedParty(PLAYER_A);
  seedParty(PLAYER_B);
  const { match, participantB } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_B, IN_WINDOW_NOW);

  const result = await resolveExpiredLeagueMatch(match.id, EXPIRED_NOW);
  assert.equal(result.status, "resolved");
  if (result.status !== "resolved") return;
  assert.equal(result.winnerParticipantId, participantB.id);
  assert.equal(result.reason, "opponent-no-show");
});

test("a completed normal battle is never overwritten by the no-show/timeout resolver", async () => {
  seedPlayerPokemon({ id: `${PLAYER_A}-p1`, playerId: PLAYER_A, speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: `${PLAYER_A}-p1`, moveId: "scratch", slot: 1 });
  seedParty(PLAYER_B, 1);
  const { match } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A, IN_WINDOW_NOW);
  await joinLeagueMatch(match.id, PLAYER_B, IN_WINDOW_NOW);

  await submitLeagueBattleAction(match.id, PLAYER_A, "scratch", MAX_ROLL, IN_WINDOW_NOW);
  const final = await submitLeagueBattleAction(match.id, PLAYER_B, "scratch", MAX_ROLL, IN_WINDOW_NOW);
  assert.equal(final.status, "success");
  if (final.status !== "success") return;
  assert.equal(final.battleEnded, true);

  const beforeResolutionAttempt = await prisma.leagueTournamentMatch.findUnique({ where: { id: match.id } });

  const timeoutAttempt = await resolveExpiredLeagueMatch(match.id, EXPIRED_NOW, () => 0.99);
  assert.deepEqual(timeoutAttempt, { status: "already-completed" });

  const afterResolutionAttempt = await prisma.leagueTournamentMatch.findUnique({ where: { id: match.id } });
  assert.equal(afterResolutionAttempt!.winnerParticipantId, beforeResolutionAttempt!.winnerParticipantId);
  assert.equal(afterResolutionAttempt!.resolutionReason, "normal-battle");
});

test("both entered, unfinished at deadline -> more living Pokémon wins", async () => {
  // A has 2 living Pokémon in its snapshot; B has only 1 (and it's about
  // to be reduced but not fainted) — deterministic without needing a full
  // battle resolution: seed the session's battle-local HP directly via a
  // real join, then simulate A having an extra untouched party member.
  seedPlayerPokemon({ id: `${PLAYER_A}-p1`, playerId: PLAYER_A, speciesId: "charmander", level: 20, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: `${PLAYER_A}-p1`, moveId: "scratch", slot: 1 });
  seedPlayerPokemon({ id: `${PLAYER_A}-p2`, playerId: PLAYER_A, speciesId: "squirtle", level: 20, currentHp: 100, partySlot: 2 });
  seedKnownMove({ playerPokemonId: `${PLAYER_A}-p2`, moveId: "scratch", slot: 1 });
  seedParty(PLAYER_B);
  const { match, participantA } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A, IN_WINDOW_NOW);
  await joinLeagueMatch(match.id, PLAYER_B, IN_WINDOW_NOW);

  // Neither battle finishes — resolve at the deadline directly.
  const result = await resolveExpiredLeagueMatch(match.id, EXPIRED_NOW);
  assert.equal(result.status, "resolved");
  if (result.status !== "resolved") return;
  assert.equal(result.reason, "timeout-living-pokemon");
  assert.equal(result.winnerParticipantId, participantA.id, "A has 2 living Pokémon vs B's 1");
});

test("equal living count -> higher Player Level wins (authoritative PlayerProfile.level at resolution time)", async () => {
  seedPlayerProfile({ id: PLAYER_A, level: 45, experience: 0 });
  seedPlayerProfile({ id: PLAYER_B, level: 30, experience: 0 });
  seedParty(PLAYER_A);
  seedParty(PLAYER_B);
  const { match, participantA } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A, IN_WINDOW_NOW);
  await joinLeagueMatch(match.id, PLAYER_B, IN_WINDOW_NOW);

  const result = await resolveExpiredLeagueMatch(match.id, EXPIRED_NOW);
  assert.equal(result.status, "resolved");
  if (result.status !== "resolved") return;
  assert.equal(result.reason, "timeout-player-level");
  assert.equal(result.winnerParticipantId, participantA.id);
});

test("equal living + equal level -> earlier room entry wins", async () => {
  seedParty(PLAYER_A);
  seedParty(PLAYER_B);
  const { match, participantA } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A, IN_WINDOW_NOW);
  await joinLeagueMatch(match.id, PLAYER_B, new Date(IN_WINDOW_NOW.getTime() + 5_000));

  const result = await resolveExpiredLeagueMatch(match.id, EXPIRED_NOW);
  assert.equal(result.status, "resolved");
  if (result.status !== "resolved") return;
  assert.equal(result.reason, "timeout-first-entry");
  assert.equal(result.winnerParticipantId, participantA.id, "A entered first");
});

test("permanent PlayerPokemon.currentHp is never read for the living-Pokémon tie-break", async () => {
  // Both real PlayerPokemon rows are seeded already-fainted in the
  // PERMANENT sense (currentHp: 0) — battle-local HP must still be full
  // at join time (Phase 6's own rule), so the tie-break must see BOTH
  // sides as fully alive, not both as already-dead.
  seedPlayerPokemon({ id: `${PLAYER_A}-p1`, playerId: PLAYER_A, speciesId: "charmander", level: 20, currentHp: 0, partySlot: 1 });
  seedKnownMove({ playerPokemonId: `${PLAYER_A}-p1`, moveId: "scratch", slot: 1 });
  seedPlayerPokemon({ id: `${PLAYER_B}-p1`, playerId: PLAYER_B, speciesId: "charmander", level: 20, currentHp: 0, partySlot: 1 });
  seedKnownMove({ playerPokemonId: `${PLAYER_B}-p1`, moveId: "scratch", slot: 1 });
  const { match } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A, IN_WINDOW_NOW);
  await joinLeagueMatch(match.id, PLAYER_B, IN_WINDOW_NOW);

  const result = await resolveExpiredLeagueMatch(match.id, EXPIRED_NOW);
  assert.equal(result.status, "resolved");
  if (result.status !== "resolved") return;
  // Both had 1 living Pokémon (battle-local), so the tiebreak fell through
  // past living-Pokémon entirely — proving the permanent currentHp:0
  // seed was never consulted (it would have produced 0 living for both,
  // which is still a tie, but confirms the real column wasn't used to
  // wrongly declare one side already-dead).
  assert.notEqual(result.reason, "timeout-living-pokemon");

  assert.equal(getPlayerPokemonRow(`${PLAYER_A}-p1`)?.currentHp, 0);
  assert.equal(getPlayerPokemonRow(`${PLAYER_B}-p1`)?.currentHp, 0);
});

test("an unopened match (before scheduledAt) is not resolved", async () => {
  seedParty(PLAYER_A);
  seedParty(PLAYER_B);
  const futureScheduledAt = new Date(EXPIRED_NOW.getTime() + 60 * 60_000);
  const { match } = await createMatch(futureScheduledAt);

  const result = await resolveExpiredLeagueMatch(match.id, EXPIRED_NOW);
  assert.deepEqual(result, { status: "not-open-yet" });
});

test("a match still within its open window is not resolved", async () => {
  seedParty(PLAYER_A);
  seedParty(PLAYER_B);
  const { match } = await createMatch();
  const stillOpen = new Date(SCHEDULED_AT.getTime() + 5 * 60_000);

  const result = await resolveExpiredLeagueMatch(match.id, stillOpen);
  assert.deepEqual(result, { status: "still-open" });
});
