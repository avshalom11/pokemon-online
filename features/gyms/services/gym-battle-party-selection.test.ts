// PRE-BATTLE PARTY SELECTION (later task, sections 6/7) — focused coverage
// for getGymBattlePartyOptions and startNpcBattle's own selection
// validation. HP-persistence-specific behavior (real HP carrying over
// across battles/turns) lives in gym-battle-hp-persistence.test.ts.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getGymBattlePartyOptions, startNpcBattle, type StartNpcBattleTarget } from "@/features/gyms/services/gym-battle-session.service";
import { markGymBattleCompleted } from "@/features/gyms/services/gym-progression.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedKnownMove, seedPlayerPokemon, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";
const EASY: StartNpcBattleTarget = { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" };
const MEDIUM: StartNpcBattleTarget = { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "medium" };
const LEADER: StartNpcBattleTarget = { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" };

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0 });
});

function seedParty(count: number, currentHp = 100) {
  for (let i = 1; i <= count; i++) {
    const id = `p${i}`;
    seedPlayerPokemon({ id, playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp, partySlot: i });
    seedKnownMove({ playerPokemonId: id, moveId: "scratch", slot: 1 });
  }
}

test("Easy requires exactly 3 when the party has 3+ alive members", async () => {
  seedParty(5);
  const result = await getGymBattlePartyOptions(PLAYER_ID, EASY);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.requiredCount, 3);
  assert.equal(result.maxCount, 3);
  assert.equal(result.options.length, 5);
});

test("Medium requires exactly 4, Leader requires exactly 6", async () => {
  seedParty(8);
  // Medium/Leader are locked until the earlier battle slots in the same Gym
  // are completed (Phase 1's own within-Gym order, unmodified by this task)
  // — unrelated to party sizing itself, just a precondition to reach them.
  // Checked one slot at a time: marking Medium completed to unlock Leader
  // would make MEDIUM's own options report "already-completed" instead.
  await prisma.$transaction((tx) => markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy"));

  const medium = await getGymBattlePartyOptions(PLAYER_ID, MEDIUM);
  assert.equal(medium.status, "ok");
  if (medium.status === "ok") assert.equal(medium.requiredCount, 4);

  await prisma.$transaction((tx) => markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "medium"));

  const leader = await getGymBattlePartyOptions(PLAYER_ID, LEADER);
  assert.equal(leader.status, "ok");
  if (leader.status === "ok") assert.equal(leader.requiredCount, 6);
});

test("an undersized party (fewer alive members than the format max) lowers requiredCount instead of inventing Pokémon", async () => {
  seedParty(2);
  const result = await getGymBattlePartyOptions(PLAYER_ID, EASY);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.requiredCount, 2, "Easy's format max is 3, but only 2 are alive");
});

test("a fainted party member appears in the options with fainted:true and its real (zero) HP, but doesn't count toward requiredCount", async () => {
  seedParty(3);
  seedPlayerPokemon({ id: "fainted1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 0, partySlot: 4 });
  const result = await getGymBattlePartyOptions(PLAYER_ID, EASY);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.requiredCount, 3, "the fainted member must not count toward alive-party sizing");
  const faintedOption = result.options.find((o) => o.id === "fainted1")!;
  assert.equal(faintedOption.fainted, true);
  assert.equal(faintedOption.currentHp, 0);
});

test("options show each Pokémon's REAL current HP (never a fresh/full battle-local number — there is no battle yet)", async () => {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 42, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  const result = await getGymBattlePartyOptions(PLAYER_ID, EASY);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.options[0].currentHp, 42);
});

test("every option carries a resolved frontSpriteUrl for display", async () => {
  seedParty(1);
  const result = await getGymBattlePartyOptions(PLAYER_ID, EASY);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(typeof result.options[0].frontSpriteUrl, "string");
  assert.ok(result.options[0].frontSpriteUrl.length > 0);
});

test("resuming: an in-progress session for the SAME target reports resuming:true, and a different (unlocked) target reports in-progress-elsewhere", async () => {
  seedParty(3);
  const started = await startNpcBattle(PLAYER_ID, EASY, ["p1", "p2", "p3"]);
  assert.equal(started.status, "started");

  const same = await getGymBattlePartyOptions(PLAYER_ID, EASY);
  assert.equal(same.status, "ok");
  if (same.status === "ok") assert.equal(same.resuming, true);

  // A locked target's OWN lock check runs before the in-progress-elsewhere
  // check, so the "different target" here must itself be genuinely
  // unlocked — mark Easy complete directly (bypassing the still-active
  // session, which this direct progress-table write never touches) so
  // Medium is unlocked, then confirm querying Medium sees the OTHER active
  // session (still Easy) and reports in-progress-elsewhere.
  await prisma.$transaction((tx) => markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy"));
  const different = await getGymBattlePartyOptions(PLAYER_ID, MEDIUM);
  assert.deepEqual(different, { status: "in-progress-elsewhere" });
});

test("startNpcBattle rejects a duplicate id in the selection", async () => {
  seedParty(3);
  const result = await startNpcBattle(PLAYER_ID, EASY, ["p1", "p1", "p2"]);
  assert.deepEqual(result, { status: "invalid-selection" });
});

test("startNpcBattle rejects a selection whose size doesn't match requiredCount", async () => {
  seedParty(5);
  const result = await startNpcBattle(PLAYER_ID, EASY, ["p1", "p2"]);
  assert.deepEqual(result, { status: "invalid-selection" });
});

test("startNpcBattle rejects an id that isn't in the player's own current party", async () => {
  seedParty(3);
  const result = await startNpcBattle(PLAYER_ID, EASY, ["p1", "p2", "someone-elses-pokemon"]);
  assert.deepEqual(result, { status: "invalid-selection" });
});

test("startNpcBattle rejects a fainted Pokémon in the selection — fainted Pokémon cannot be selected until revived outside battle", async () => {
  seedParty(2);
  seedPlayerPokemon({ id: "fainted1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 0, partySlot: 3 });
  const result = await startNpcBattle(PLAYER_ID, EASY, ["p1", "p2", "fainted1"]);
  assert.deepEqual(result, { status: "invalid-selection" });
});

test("a genuinely empty usable party (every member fainted) returns no-usable-party, never invalid-selection", async () => {
  seedPlayerPokemon({ id: "fainted1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 0, partySlot: 1 });
  const options = await getGymBattlePartyOptions(PLAYER_ID, EASY);
  assert.equal(options.status, "ok");
  if (options.status === "ok") assert.equal(options.requiredCount, 0);

  const result = await startNpcBattle(PLAYER_ID, EASY, []);
  assert.deepEqual(result, { status: "no-usable-party" });
});

test("resuming an existing in-progress session ignores a newly-passed selection — the original participants stay locked", async () => {
  seedParty(5);
  const started = await startNpcBattle(PLAYER_ID, EASY, ["p1", "p2", "p3"]);
  assert.equal(started.status, "started");
  if (started.status !== "started") return;
  const originalIds = started.session.playerPokemonIds;

  const resumed = await startNpcBattle(PLAYER_ID, EASY, ["p3", "p4", "p5"]);
  assert.equal(resumed.status, "resumed");
  if (resumed.status !== "resumed") return;
  assert.deepEqual(resumed.session.playerPokemonIds, originalIds);
});
