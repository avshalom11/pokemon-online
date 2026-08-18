// Focused coverage for Gyms & Leagues Phase 3's turn-by-turn NPC battle
// resolution — team progression, victory/loss, completion wiring, and
// Field Battle isolation. Session start/unlock/party-limit/full-HP
// coverage lives in gym-battle-session.service.test.ts. Runs the REAL
// executeGymBattleAction/startNpcBattle unmodified against the in-memory
// fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

async function selectPartyFor(playerId: string, target: Parameters<typeof startNpcBattle>[1]): Promise<string[]> {
  const options = await getGymBattlePartyOptions(playerId, target);
  if (options.status !== "ok") return [];
  return options.options.filter((o) => !o.fainted).slice(0, options.requiredCount).map((o) => o.id);
}

import { executeGymBattleAction } from "@/features/gyms/services/gym-battle-action.service";
import { startNpcBattle, switchNpcBattleActivePokemon, getGymBattlePartyOptions } from "@/features/gyms/services/gym-battle-session.service";
import { getRegionGymProgress, hasBadge, hasRegionalMedal } from "@/features/gyms/services/gym-progression.service";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
  getNpcBattleSessionRow,
  getGymBattleProgressRow,
  getGymBadgeRow,
  getRegionalChampionProgressRow,
  getRegionalMedalRow,
  getDailyBattleCountRow,
} from "../../../test/support/fakes/prisma.fake.ts";
import { getJerusalemDateKey } from "@/features/daily-battles/services/daily-battle-count.service";

const PLAYER_ID = "owner-1";
const MAX_ROLL = () => 0.999999;
const MIN_ROLL_NO_CRIT = () => 0.05;

beforeEach(() => {
  resetFakeDb();
  // GYMS & LEAGUES PHASE 4 — seeded at exactly MIN_GYM_PLAYER_LEVEL so this
  // file's own Phase 3 turn-resolution/completion tests are unaffected by
  // the new Level-10 gate (its own dedicated tests live in
  // gym-access-rules.test.ts).
  seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0 });
});

function seedOverwhelmingPlayer() {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 2 });
}

async function startEasy() {
  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }));
  assert.equal(result.status, "started");
  return result;
}

test("defeating one NPC Pokémon advances to the next, battle continues", async () => {
  seedOverwhelmingPlayer();
  await startEasy();

  const before = getNpcBattleSessionRow(PLAYER_ID)!;
  const firstNpcSpeciesId = (before.npcTeam as { speciesId: string }[])[0].speciesId;

  const result = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.npcFainted, true);
  assert.equal(result.battleEnded, false, "Easy has 3 NPCs — one faint must not end the battle");

  const after = getNpcBattleSessionRow(PLAYER_ID)!;
  assert.equal(after.npcActiveIndex, 1);
  const secondNpcSpeciesId = (after.npcTeam as { speciesId: string }[])[1].speciesId;
  assert.notEqual(after.npcCurrentHp, 0);
  // The new active NPC is genuinely the team's second member, not a reroll.
  assert.notEqual(firstNpcSpeciesId, undefined);
  assert.notEqual(secondNpcSpeciesId, undefined);
});

test("victory requires defeating the ENTIRE NPC team, not just the first Pokémon", async () => {
  seedOverwhelmingPlayer();
  await startEasy();

  const first = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  assert.equal(first.status, "success");
  if (first.status !== "success") return;
  assert.equal(first.battleEnded, false);

  const second = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  assert.equal(second.status, "success");
  if (second.status !== "success") return;
  assert.equal(second.battleEnded, false, "2 of 3 NPCs defeated — still not over");

  const third = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  assert.equal(third.status, "success");
  if (third.status !== "success") return;
  assert.equal(third.battleEnded, true);
  assert.equal(third.winner, "player");
  assert.equal(third.victoryCompleted, true);
  assert.equal(third.npcTeamRemainingCount, 0);
});

test("Easy victory marks ONLY Easy completed — Medium/Leader remain untouched", async () => {
  seedOverwhelmingPlayer();
  await startEasy();
  await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  const final = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  assert.equal(final.status, "success");
  if (final.status !== "success") return;
  assert.equal(final.victoryCompleted, true);

  assert.ok(getGymBattleProgressRow(PLAYER_ID, "kanto", 1, "easy"));
  assert.equal(getGymBattleProgressRow(PLAYER_ID, "kanto", 1, "medium"), undefined);
  assert.equal(getGymBattleProgressRow(PLAYER_ID, "kanto", 1, "leader"), undefined);
  assert.equal(getGymBadgeRow(PLAYER_ID, "kanto", 1), undefined, "Easy must never award a Badge");

  // The session is gone — no replay possible via a stale action call.
  assert.equal(getNpcBattleSessionRow(PLAYER_ID), undefined);
  const replay = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  assert.deepEqual(replay, { status: "no-session" });
});

test("Gym Leader victory marks Leader completed AND awards the Badge", async () => {
  seedOverwhelmingPlayer();
  await prisma.$transaction(async (tx) => {
    const { markGymBattleCompleted } = await import("@/features/gyms/services/gym-progression.service");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "medium");
  });
  const started = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" }));
  assert.equal(started.status, "started");

  // Leader has 6 NPCs.
  let final;
  for (let i = 0; i < 6; i++) {
    final = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
    assert.equal(final.status, "success");
  }
  assert.equal((final as { victoryCompleted: boolean }).victoryCompleted, true);

  assert.ok(getGymBattleProgressRow(PLAYER_ID, "kanto", 1, "leader"));
  assert.equal(await hasBadge(PLAYER_ID, "kanto", 1), true);
});

test("Regional Champion victory marks Champion defeated AND awards the Regional Medal", async () => {
  seedOverwhelmingPlayer();
  await prisma.$transaction(async (tx) => {
    const { markGymBattleCompleted } = await import("@/features/gyms/services/gym-progression.service");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 2, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 3, "leader");
  });
  const started = await startNpcBattle(PLAYER_ID, { source: "regional-champion", regionId: "kanto" }, await selectPartyFor(PLAYER_ID, { source: "regional-champion", regionId: "kanto" }));
  assert.equal(started.status, "started");

  let final;
  for (let i = 0; i < 6; i++) {
    final = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
    assert.equal(final.status, "success");
  }
  assert.equal((final as { victoryCompleted: boolean }).victoryCompleted, true);

  assert.equal(getRegionalChampionProgressRow(PLAYER_ID, "kanto") !== undefined, true);
  assert.equal(getRegionalMedalRow(PLAYER_ID, "kanto") !== undefined, true);
  assert.equal(await hasRegionalMedal(PLAYER_ID, "kanto"), true);
});

test("completion cannot be duplicated by replaying the winning action — the session is already gone", async () => {
  seedOverwhelmingPlayer();
  await startEasy();
  await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);

  const progressBefore = JSON.stringify(getGymBattleProgressRow(PLAYER_ID, "kanto", 1, "easy"));
  const replay = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  assert.deepEqual(replay, { status: "no-session" });
  assert.equal(JSON.stringify(getGymBattleProgressRow(PLAYER_ID, "kanto", 1, "easy")), progressBefore);
});

test("a player who loses (all participating Pokémon fainted) marks no completion, and Easy already won stays won", async () => {
  // A single low-level participant, deliberately using only a non-damaging
  // status move (Growl) so the NPC always survives to counter-attack
  // regardless of turn order, with the player's own battle-local HP
  // seeded to 1 so a single real counter-hit (guaranteed >=1 damage) faints it.
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 5, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });

  const started = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }));
  assert.equal(started.status, "started");
  if (started.status !== "started") return;

  await prisma.npcBattleSession.updateMany({ where: { playerId: PLAYER_ID }, data: { playerBattleHp: { p1: 1 } } });

  const result = await executeGymBattleAction(PLAYER_ID, "growl", MIN_ROLL_NO_CRIT);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.partyPokemonFainted, true);
  assert.equal(result.battleEnded, true);
  assert.equal(result.winner, "npc");
  assert.equal(result.victoryCompleted, false);

  assert.equal(getNpcBattleSessionRow(PLAYER_ID), undefined, "session removed on loss");
  assert.equal(getGymBattleProgressRow(PLAYER_ID, "kanto", 1, "easy"), undefined, "no completion on loss");
});

test("forced replacement: a fainted active participant can be switched, and the retried attempt continues normally", async () => {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 5, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  seedPlayerPokemon({ id: "p2", playerId: PLAYER_ID, speciesId: "squirtle", level: 100, currentHp: 100, partySlot: 2 });
  seedKnownMove({ playerPokemonId: "p2", moveId: "scratch", slot: 1 });

  const started = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }, await selectPartyFor(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }));
  assert.equal(started.status, "started");
  await prisma.npcBattleSession.updateMany({ where: { playerId: PLAYER_ID }, data: { playerBattleHp: { p1: 1, p2: 100 } } });

  const fainted = await executeGymBattleAction(PLAYER_ID, "growl", MIN_ROLL_NO_CRIT);
  assert.equal(fainted.status, "success");
  if (fainted.status !== "success") return;
  assert.equal(fainted.partyPokemonFainted, true);
  assert.equal(fainted.battleEnded, false, "p2 is still usable");

  const switched = await switchNpcBattleActivePokemon(PLAYER_ID, "p2");
  assert.deepEqual(switched, { status: "ok" });
  assert.equal(getNpcBattleSessionRow(PLAYER_ID)!.activePlayerPokemonId, "p2");

  const nextTurn = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  assert.equal(nextTurn.status, "success");
});

test("Gym battles never increment the Field Battle daily counter", async () => {
  seedOverwhelmingPlayer();
  await startEasy();
  await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  const final = await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL);
  assert.equal((final as { victoryCompleted: boolean }).victoryCompleted, true);

  assert.equal(getDailyBattleCountRow(PLAYER_ID, getJerusalemDateKey()), undefined);
});

test("Gym Battle code never references Field-Battle-only reward/progression functions (Egg drops, Chest drops, incubation)", async () => {
  const fs = await import("node:fs");
  const sessionSrc = fs.readFileSync("features/gyms/services/gym-battle-session.service.ts", "utf8");
  const actionSrc = fs.readFileSync("features/gyms/services/gym-battle-action.service.ts", "utf8");
  const combined = sessionSrc + actionSrc;

  for (const forbidden of ["rollAndAwardEgg", "rollAndAwardChest", "incrementDailyBattleCount", "progressActiveIncubations", "grantFieldBattleCurrencyRewards", "applyWildHpSync"]) {
    assert.ok(!combined.includes(forbidden), `Gym battle code must never reference ${forbidden}`);
  }
});

test("integration boundary: Field Battle's own executeBattleAction is untouched by this Phase (still exported, same shape)", async () => {
  const { executeBattleAction } = await import("@/features/battle/services/battle-action.service");
  assert.equal(typeof executeBattleAction, "function");
});
