// VOLUNTARY POKÉMON SWITCHING (later task, section 5) — focused coverage
// for voluntarySwitchNpcBattleActivePokemon: distinct from the existing
// forced-replacement switchNpcBattleActivePokemon (already covered in
// gym-battle-action.service.test.ts), this one is chosen on the player's
// own normal turn and consumes it (the NPC gets one free strike).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { voluntarySwitchNpcBattleActivePokemon } from "@/features/gyms/services/gym-battle-switch.service";
import { startNpcBattle, type StartNpcBattleTarget } from "@/features/gyms/services/gym-battle-session.service";
import { prisma } from "@/lib/db/prisma";
import { getNpcBattleSessionRow, getPlayerPokemonRow, resetFakeDb, seedKnownMove, seedPlayerPokemon, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";
const EASY: StartNpcBattleTarget = { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" };
const MAX_ROLL = () => 0.999999;
// A HIGH roll only guarantees max DAMAGE, not a hit — checkMoveAccuracy's
// own rule is `accuracyRoll < accuracy` (engine/damage/accuracy.ts), so a
// roll near 1.0 actually guarantees a MISS for any move whose accuracy is
// below 100. A LOW roll guarantees both a hit (for any move with
// accuracy > ~1) and nonzero damage — the same convention this codebase's
// own existing tests already rely on (MIN_ROLL_NO_CRIT elsewhere) for a
// deterministic "this single hit definitely lands and definitely deals
// damage" scenario, used here whenever a test needs the free strike to
// reliably connect.
const GUARANTEED_HIT_ROLL = () => 0.01;

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0 });
});

// Both participants must be genuinely alive at SELECTION time (startNpcBattle
// itself rejects a fainted id) — any battle-local HP a test wants for
// p1/p2 mid-fight is applied AFTERWARD via a direct session update, exactly
// mirroring how a real earlier turn would have already lowered it.
async function seedTwoParticipant(battleHp?: { p1: number; p2: number }) {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedPlayerPokemon({ id: "p2", playerId: PLAYER_ID, speciesId: "squirtle", level: 100, currentHp: 100, partySlot: 2 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  seedKnownMove({ playerPokemonId: "p2", moveId: "scratch", slot: 1 });
  await startNpcBattle(PLAYER_ID, EASY, ["p1", "p2"]);
  if (battleHp) {
    await prisma.npcBattleSession.updateMany({ where: { playerId: PLAYER_ID }, data: { playerBattleHp: battleHp } });
  }
}

test("no-session when no battle is active", async () => {
  const result = await voluntarySwitchNpcBattleActivePokemon(PLAYER_ID, "p1");
  assert.deepEqual(result, { status: "no-session" });
});

test("switching to the already-active participant is rejected", async () => {
  await seedTwoParticipant();
  const result = await voluntarySwitchNpcBattleActivePokemon(PLAYER_ID, "p1");
  assert.deepEqual(result, { status: "already-active" });
});

test("switching to a Pokémon that isn't a participant in this battle is rejected", async () => {
  await seedTwoParticipant();
  seedPlayerPokemon({ id: "bench", playerId: PLAYER_ID, speciesId: "bulbasaur", level: 50, currentHp: 50, partySlot: 3 });
  const result = await voluntarySwitchNpcBattleActivePokemon(PLAYER_ID, "bench");
  assert.deepEqual(result, { status: "not-owned" });
});

test("switching to a participant that already fainted mid-battle is rejected", async () => {
  await seedTwoParticipant({ p1: 100, p2: 0 });
  const result = await voluntarySwitchNpcBattleActivePokemon(PLAYER_ID, "p2");
  assert.deepEqual(result, { status: "fainted" });
});

test("a valid voluntary switch becomes the new active participant, resets stat stages, and consumes the turn (NPC gets a free strike)", async () => {
  await seedTwoParticipant();
  const result = await voluntarySwitchNpcBattleActivePokemon(PLAYER_ID, "p2", MAX_ROLL);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const row = getNpcBattleSessionRow(PLAYER_ID)!;
  assert.equal(row.activePlayerPokemonId, "p2");
  assert.deepEqual(row.playerStatStages, {});

  // The free strike must have actually resolved against p2 (turn consumed).
  const battleHp = row.playerBattleHp as unknown as Record<string, number>;
  assert.equal(battleHp.p2, result.updatedDefenderHp);
  assert.equal(getPlayerPokemonRow("p2")?.currentHp, result.updatedDefenderHp, "HP persistence applies to the free strike too");
});

test("a switch never produces winner==='player' — a free strike is one-directional and can only end the battle in the NPC's favor or not at all", async () => {
  await seedTwoParticipant({ p1: 1, p2: 100 });
  // p1 (currently active, 1 HP) stays put; switching TO p2 leaves p1 on the
  // bench — the free strike lands on the newly-active p2, never able to
  // knock out the (inactive) NPC and thus never able to produce a player win.
  const result = await voluntarySwitchNpcBattleActivePokemon(PLAYER_ID, "p2", MAX_ROLL);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.notEqual(result.winner, "player");
});

// BAG / VOLUNTARY SWITCH — PLAYER TURN ONLY (GYM BATTLE POLISH task,
// section 2) — a voluntary switch is only ever reachable when the
// currently-active participant is alive; once it's already fainted, only
// the separate, free forced-replacement flow is valid. A direct
// consequence of this rule: the ORIGINAL active participant, benched but
// still alive after a voluntary switch, always keeps anyOtherUsable true
// afterward — a voluntary switch's own free strike can therefore never be
// the hit that ends the battle (that scenario is only reachable via the
// Bag item path, covered in gym-battle-item.service.test.ts).
test("voluntary switch is rejected once the active participant has already fainted mid-battle — only forced replacement is valid then", async () => {
  await seedTwoParticipant({ p1: 0, p2: 100 });
  const result = await voluntarySwitchNpcBattleActivePokemon(PLAYER_ID, "p2");
  assert.deepEqual(result, { status: "forced-replacement-pending" });

  // Nothing was written — the session's own active id and battle-local HP
  // stay exactly as they were.
  const row = getNpcBattleSessionRow(PLAYER_ID)!;
  assert.equal(row.activePlayerPokemonId, "p1");
});

// ATTACK SOUND (GYM BATTLE POLISH task, section 3) — the client decides
// whether to play the NPC's attack sound purely from this npcAttacked
// flag; a successful switch must always report it (true whenever the
// free strike actually resolved, which it always does here since the NPC
// team is never empty in these fixtures).
test("a successful voluntary switch reports npcAttacked so the client knows whether to play the NPC's attack sound", async () => {
  await seedTwoParticipant();
  const result = await voluntarySwitchNpcBattleActivePokemon(PLAYER_ID, "p2", MAX_ROLL);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.npcAttacked, true);
});

// TURN SAFETY / RACE GUARD (GYM BATTLE POLISH task, section 2) — two
// genuinely concurrent voluntary-switch requests (double-switch), fired
// without awaiting between them so both read the SAME pre-race session
// snapshot before either's own guarded write runs — end-to-end proof that
// the second one to reach its write is rejected as stale-action rather
// than silently overwriting whichever one committed first (never both
// silently "succeeding" and corrupting activePlayerPokemonId).
test("double switch: two concurrent voluntary-switch requests — exactly one succeeds, the other is rejected as stale-action", async () => {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedPlayerPokemon({ id: "p2", playerId: PLAYER_ID, speciesId: "squirtle", level: 100, currentHp: 100, partySlot: 2 });
  seedPlayerPokemon({ id: "p3", playerId: PLAYER_ID, speciesId: "bulbasaur", level: 100, currentHp: 100, partySlot: 3 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  seedKnownMove({ playerPokemonId: "p2", moveId: "scratch", slot: 1 });
  seedKnownMove({ playerPokemonId: "p3", moveId: "scratch", slot: 1 });
  await startNpcBattle(PLAYER_ID, EASY, ["p1", "p2", "p3"]);

  const [resultA, resultB] = await Promise.all([
    voluntarySwitchNpcBattleActivePokemon(PLAYER_ID, "p2", MAX_ROLL),
    voluntarySwitchNpcBattleActivePokemon(PLAYER_ID, "p3", MAX_ROLL),
  ]);

  const statuses = [resultA.status, resultB.status].sort();
  assert.deepEqual(statuses, ["stale-action", "success"], `expected exactly one success and one stale-action, got ${JSON.stringify(statuses)}`);

  // Whichever one actually won is now the session's own active participant
  // — never a corrupted/mixed state from both writes landing.
  const row = getNpcBattleSessionRow(PLAYER_ID)!;
  assert.ok(row.activePlayerPokemonId === "p2" || row.activePlayerPokemonId === "p3");
});
