// HUD 3: Poké Ball indicator count/state logic unchanged (GYM BATTLE
// POLISH task) — moving the rows into each side's own BattleHUD footer
// (section 1) is a pure presentation change; npcTeamAliveFlags/
// playerTeamAliveFlags themselves must still report exactly one entry per
// participating Pokémon for every battle format (3v3/4v4/6v6), unchanged
// from before this task.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getGymBattlePartyOptions, startNpcBattle, type StartNpcBattleTarget } from "@/features/gyms/services/gym-battle-session.service";
import { getGymBattleViewData } from "@/features/gyms/services/gym-battle-view.service";
import { markGymBattleCompleted } from "@/features/gyms/services/gym-progression.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedKnownMove, seedPlayerPokemon, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0 });
});

function seedParty(count: number) {
  for (let i = 1; i <= count; i++) {
    const id = `p${i}`;
    seedPlayerPokemon({ id, playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: i });
    seedKnownMove({ playerPokemonId: id, moveId: "scratch", slot: 1 });
  }
}

async function selectPartyFor(target: StartNpcBattleTarget): Promise<string[]> {
  const options = await getGymBattlePartyOptions(PLAYER_ID, target);
  if (options.status !== "ok") return [];
  return options.options.filter((o) => !o.fainted).slice(0, options.requiredCount).map((o) => o.id);
}

test("3v3 (Easy): exactly 3 player balls and 3 NPC balls", async () => {
  seedParty(3);
  const target: StartNpcBattleTarget = { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" };
  await startNpcBattle(PLAYER_ID, target, await selectPartyFor(target));
  const view = await getGymBattleViewData(PLAYER_ID, "Tester");
  assert.equal(view.status, "ready");
  if (view.status !== "ready") return;
  assert.equal(view.data.playerTeamAliveFlags.length, 3);
  assert.equal(view.data.npcTeamAliveFlags.length, 3);
});

test("4v4 (Medium): exactly 4 player balls and 4 NPC balls", async () => {
  seedParty(4);
  await prisma.$transaction((tx) => markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy"));
  const target: StartNpcBattleTarget = { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "medium" };
  await startNpcBattle(PLAYER_ID, target, await selectPartyFor(target));
  const view = await getGymBattleViewData(PLAYER_ID, "Tester");
  assert.equal(view.status, "ready");
  if (view.status !== "ready") return;
  assert.equal(view.data.playerTeamAliveFlags.length, 4);
  assert.equal(view.data.npcTeamAliveFlags.length, 4);
});

test("6v6 (Gym Leader): exactly 6 player balls and 6 NPC balls", async () => {
  seedParty(6);
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "medium");
  });
  const target: StartNpcBattleTarget = { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" };
  await startNpcBattle(PLAYER_ID, target, await selectPartyFor(target));
  const view = await getGymBattleViewData(PLAYER_ID, "Tester");
  assert.equal(view.status, "ready");
  if (view.status !== "ready") return;
  assert.equal(view.data.playerTeamAliveFlags.length, 6);
  assert.equal(view.data.npcTeamAliveFlags.length, 6);
});
