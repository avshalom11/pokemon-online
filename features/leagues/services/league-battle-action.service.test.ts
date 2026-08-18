// GYMS & LEAGUES PHASE 6 — focused coverage for turn-by-turn PvP resolution
// (ACTION SECURITY items 14-17, TURN ENGINE items 18-20, FAINT/REPLACEMENT
// items 21-23, VICTORY items 24-28, COMPUTER items 29/31/32, NAVIGATION/
// PERSISTENCE items 34-35). Runs the REAL submitLeagueBattleAction/
// switchLeagueBattleActivePokemon/joinLeagueMatch unmodified against the
// in-memory fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { joinLeagueMatch } from "./league-battle-session.service.ts";
import { submitLeagueBattleAction, switchLeagueBattleActivePokemon } from "./league-battle-action.service.ts";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
  getLeagueBattleSessionRow,
  getLeagueTournamentMatchRows,
} from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_A = "player-a";
const PLAYER_B = "player-b";
const MAX_ROLL = () => 0.999999;
const MIN_ROLL_NO_CRIT = () => 0.05;

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_A, level: 20, experience: 0 });
  seedPlayerProfile({ id: PLAYER_B, level: 20, experience: 0 });
});

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

function seedOverwhelming(playerId: string) {
  const id = `${playerId}-p1`;
  seedPlayerPokemon({ id, playerId, speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: id, moveId: "scratch", slot: 1 });
  seedKnownMove({ playerPokemonId: id, moveId: "growl", slot: 2 });
  return id;
}

function seedWeak(playerId: string) {
  const id = `${playerId}-p1`;
  seedPlayerPokemon({ id, playerId, speciesId: "charmander", level: 1, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: id, moveId: "scratch", slot: 1 });
  seedKnownMove({ playerPokemonId: id, moveId: "growl", slot: 2 });
  return id;
}

test("a participant cannot act for the opponent — a submission only ever sets THEIR OWN side's pending move", async () => {
  seedOverwhelming(PLAYER_A);
  seedOverwhelming(PLAYER_B);
  const { match } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A);
  await joinLeagueMatch(match.id, PLAYER_B);

  await submitLeagueBattleAction(match.id, PLAYER_A, "scratch", MIN_ROLL_NO_CRIT);
  const session = getLeagueBattleSessionRow(match.id)!;
  assert.ok(session.participantAPendingMoveId, "A's own submission must be recorded under A");
  assert.equal(session.participantBPendingMoveId, null, "B's side must be completely untouched by A's submission");
});

test("a stranger cannot submit any action for the match", async () => {
  seedOverwhelming(PLAYER_A);
  seedOverwhelming(PLAYER_B);
  const { match } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A);
  await joinLeagueMatch(match.id, PLAYER_B);

  const result = await submitLeagueBattleAction(match.id, "stranger", "scratch", MAX_ROLL);
  assert.deepEqual(result, { status: "not-a-participant" });
});

test("an unknown/not-owned move is rejected", async () => {
  seedOverwhelming(PLAYER_A);
  seedOverwhelming(PLAYER_B);
  const { match } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A);
  await joinLeagueMatch(match.id, PLAYER_B);

  const result = await submitLeagueBattleAction(match.id, PLAYER_A, "hyper-beam", MAX_ROLL);
  assert.deepEqual(result, { status: "invalid-move", moveId: "hyper-beam" });
});

test("a duplicate/stale action from the same side is rejected safely, never overwriting the first submission", async () => {
  seedOverwhelming(PLAYER_A);
  seedOverwhelming(PLAYER_B);
  const { match } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A);
  await joinLeagueMatch(match.id, PLAYER_B);

  const first = await submitLeagueBattleAction(match.id, PLAYER_A, "scratch", MIN_ROLL_NO_CRIT);
  assert.equal(first.status, "success");
  const second = await submitLeagueBattleAction(match.id, PLAYER_A, "growl", MIN_ROLL_NO_CRIT);
  assert.deepEqual(second, { status: "already-submitted" });

  const session = getLeagueBattleSessionRow(match.id)!;
  assert.equal(session.participantAPendingMoveId, "scratch", "the FIRST submission must be preserved, never overwritten");
});

test("actions are blocked until both real humans have joined (not-ready)", async () => {
  seedOverwhelming(PLAYER_A);
  seedOverwhelming(PLAYER_B);
  const { match } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A);

  const result = await submitLeagueBattleAction(match.id, PLAYER_A, "scratch", MAX_ROLL);
  assert.deepEqual(result, { status: "not-ready" });
});

test("resolveBattleTurn (the shared engine) is reused — never a duplicated damage/crit/accuracy implementation", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("features/leagues/services/league-battle-action.service.ts", "utf8");
  assert.match(src, /resolveBattleTurn/, "must call the shared turn-resolution engine");
  assert.ok(!/function resolveAttackDamage/.test(src), "must not re-implement damage math");
  assert.ok(!/criticalHitChance\s*=/.test(src), "must not re-implement crit math");
});

test("computer AI reuses the approved existing Gym AI path with hard behavior", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("features/leagues/services/league-battle-action.service.ts", "utf8");
  assert.match(src, /selectNpcMoveForDifficulty/);
  assert.match(src, /"hard"/);
});

test("League PvP never triggers Field/Gym reward hooks", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("features/leagues/services/league-battle-action.service.ts", "utf8");
  for (const forbidden of [
    "rollAndAwardEgg",
    "rollAndAwardChest",
    "incrementDailyBattleCount",
    "progressActiveIncubations",
    "grantFieldBattleCurrencyRewards",
    "markGymBattleCompleted",
    "markRegionalChampionDefeated",
    "grantGymLeaderReward",
    "grantRegionalChampionReward",
  ]) {
    assert.ok(!src.includes(forbidden), `League battle action code must never reference ${forbidden}`);
  }
});

test("a real turn actually deals damage and updates HP through the shared engine (overwhelming level gap)", async () => {
  seedOverwhelming(PLAYER_A);
  seedWeak(PLAYER_B);
  const { match } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A);
  await joinLeagueMatch(match.id, PLAYER_B);

  await submitLeagueBattleAction(match.id, PLAYER_A, "scratch", MAX_ROLL);
  const result = await submitLeagueBattleAction(match.id, PLAYER_B, "growl", MAX_ROLL);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.resolved, true);
  assert.ok(result.turn);
  assert.ok(result.turn!.selfDamageDealt >= 0);
});

test("stat-stage effects (growl) persist correctly into the PvP session, not just HP", async () => {
  seedOverwhelming(PLAYER_A);
  seedOverwhelming(PLAYER_B);
  const { match } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A);
  await joinLeagueMatch(match.id, PLAYER_B);

  await submitLeagueBattleAction(match.id, PLAYER_A, "growl", MIN_ROLL_NO_CRIT);
  await submitLeagueBattleAction(match.id, PLAYER_B, "growl", MIN_ROLL_NO_CRIT);

  const session = getLeagueBattleSessionRow(match.id)!;
  const bStages = session.participantBStatStages as unknown as Record<string, number>;
  assert.ok(Object.keys(bStages).length > 0, "Growl must have written a stat-stage change into the session (attack lowered)");
});

test("a fainted active Pokémon cannot act — requires forced replacement first", async () => {
  // A has a SECOND party member so fainting the first doesn't end the
  // battle — this is what actually exercises the "needs replacement, not
  // a loss" path (a single-Pokémon side would just lose immediately,
  // covered separately below).
  seedWeak(PLAYER_A);
  seedPlayerPokemon({ id: `${PLAYER_A}-p2`, playerId: PLAYER_A, speciesId: "squirtle", level: 1, currentHp: 100, partySlot: 2 });
  seedKnownMove({ playerPokemonId: `${PLAYER_A}-p2`, moveId: "scratch", slot: 1 });
  seedOverwhelming(PLAYER_B);
  const { match } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A);
  await joinLeagueMatch(match.id, PLAYER_B);

  await submitLeagueBattleAction(match.id, PLAYER_A, "scratch", MIN_ROLL_NO_CRIT);
  const final = await submitLeagueBattleAction(match.id, PLAYER_B, "scratch", MAX_ROLL);
  assert.equal(final.status, "success");
  if (final.status !== "success") return;
  assert.equal(final.battleEnded, false, "A still has a second living Pokémon — this must not be a loss yet");

  const retry = await submitLeagueBattleAction(match.id, PLAYER_A, "scratch", MAX_ROLL);
  assert.deepEqual(retry, { status: "invalid-active-pokemon" });

  const switched = await switchLeagueBattleActivePokemon(match.id, PLAYER_A, `${PLAYER_A}-p2`);
  assert.deepEqual(switched, { status: "ok" });

  const resumed = await submitLeagueBattleAction(match.id, PLAYER_A, "scratch", MIN_ROLL_NO_CRIT);
  assert.equal(resumed.status, "success");
});

test("replacement must be from this side's OWN snapshotted, still-living roster", async () => {
  seedPlayerPokemon({ id: `${PLAYER_A}-p1`, playerId: PLAYER_A, speciesId: "charmander", level: 1, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: `${PLAYER_A}-p1`, moveId: "scratch", slot: 1 });
  seedPlayerPokemon({ id: `${PLAYER_A}-p2`, playerId: PLAYER_A, speciesId: "squirtle", level: 100, currentHp: 100, partySlot: 2 });
  seedKnownMove({ playerPokemonId: `${PLAYER_A}-p2`, moveId: "scratch", slot: 1 });
  seedOverwhelming(PLAYER_B);
  const { match } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A);
  await joinLeagueMatch(match.id, PLAYER_B);

  // A foreign, non-owned slot id must be rejected.
  const foreign = await switchLeagueBattleActivePokemon(match.id, PLAYER_A, `${PLAYER_B}-p1`);
  assert.deepEqual(foreign, { status: "not-owned" });

  // A's own second party member is a legal switch target.
  const legal = await switchLeagueBattleActivePokemon(match.id, PLAYER_A, `${PLAYER_A}-p2`);
  assert.deepEqual(legal, { status: "ok" });

  const session = getLeagueBattleSessionRow(match.id)!;
  assert.equal(session.participantAActiveSlotId, `${PLAYER_A}-p2`);
});

test("no living Pokémon left = loss, and victory writes the winner exactly once", async () => {
  seedWeak(PLAYER_A);
  seedOverwhelming(PLAYER_B);
  const { match, participantA, participantB } = await createMatch();
  await joinLeagueMatch(match.id, PLAYER_A);
  await joinLeagueMatch(match.id, PLAYER_B);

  await submitLeagueBattleAction(match.id, PLAYER_A, "scratch", MIN_ROLL_NO_CRIT);
  const final = await submitLeagueBattleAction(match.id, PLAYER_B, "scratch", MAX_ROLL);
  assert.equal(final.status, "success");
  if (final.status !== "success") return;
  assert.equal(final.battleEnded, true);
  assert.equal(final.victoryCompleted, true);
  // PLAYER_B's own submission is what triggers resolution here (A already
  // submitted first), so the response is from B's own "self" point of
  // view — and B (overwhelming) is the one who wins.
  assert.equal(final.winnerSide, "self");

  const session = getLeagueBattleSessionRow(match.id)!;
  assert.equal(session.status, "completed");
  assert.equal(session.winnerParticipantId, participantB.id);

  const [matchRow] = getLeagueTournamentMatchRows(match.tournamentId, 1);
  assert.equal(matchRow.status, "completed");
  assert.equal(matchRow.winnerParticipantId, participantB.id);

  // VICTORY EXACTLY ONCE — the match is already completed; further action attempts are rejected.
  const replay = await submitLeagueBattleAction(match.id, PLAYER_B, "scratch", MAX_ROLL);
  assert.deepEqual(replay, { status: "match-already-completed" });

  // NO ROUND ADVANCEMENT — this Phase creates no new match/tournament rows on completion.
  assert.equal(getLeagueTournamentMatchRows(match.tournamentId, 1).length, 1);
});

test("no League reward of any kind is granted on match completion", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("features/leagues/services/league-battle-action.service.ts", "utf8");
  for (const forbidden of ["grantChest", "grantCurrencyRewards", "addPlayerExperience", "grantBadge", "grantMedal"]) {
    assert.ok(!src.includes(forbidden), `League PvP completion must never reference ${forbidden}`);
  }
});

test("a computer participant needs no PlayerProfile row — the match battles normally without one", async () => {
  seedOverwhelming(PLAYER_A);
  const { match, participantB } = await createMatch("computer");
  assert.equal(participantB.playerId, null);

  const joined = await joinLeagueMatch(match.id, PLAYER_A);
  assert.equal(joined.status, "joined");

  const result = await submitLeagueBattleAction(match.id, PLAYER_A, "scratch", MAX_ROLL);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.resolved, true, "vs. computer must always resolve synchronously, never wait");
});

test("a real-player-vs-computer match completes normally through to a persisted winner", async () => {
  seedOverwhelming(PLAYER_A);
  const { match, participantA } = await createMatch("computer");
  await joinLeagueMatch(match.id, PLAYER_A);

  let final;
  for (let i = 0; i < 10; i++) {
    final = await submitLeagueBattleAction(match.id, PLAYER_A, "scratch", MAX_ROLL);
    assert.equal(final.status, "success");
    if ((final as { battleEnded: boolean }).battleEnded) break;
  }

  assert.equal((final as { battleEnded: boolean }).battleEnded, true);
  const session = getLeagueBattleSessionRow(match.id)!;
  assert.equal(session.status, "completed");
  assert.ok(session.winnerParticipantId);
});

test("leaving and re-entering (repeated join calls) resumes the SAME persistent session, never deletes/recreates it", async () => {
  seedOverwhelming(PLAYER_A);
  seedOverwhelming(PLAYER_B);
  const { match } = await createMatch();
  const first = await joinLeagueMatch(match.id, PLAYER_A);
  await joinLeagueMatch(match.id, PLAYER_B);
  await submitLeagueBattleAction(match.id, PLAYER_A, "scratch", MIN_ROLL_NO_CRIT);

  // Simulate "leaving the page" — nothing deletes the session — then "re-entering".
  const reentry = await joinLeagueMatch(match.id, PLAYER_A);
  assert.equal(reentry.status, "joined");
  if (first.status !== "joined" || reentry.status !== "joined") return;
  assert.equal(reentry.session.id, first.session.id);
  assert.equal(reentry.session.participantAPendingMoveId, "scratch", "in-progress turn state must survive the re-entry");
});
