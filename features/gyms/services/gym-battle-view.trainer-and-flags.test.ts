// GYM BATTLE UX — VIEW-MODEL SUPPORT (later task, sections 2/3/11/12) —
// this project has no React component test harness (every existing test in
// the repo is a node:test service/data-layer test — see MEMORY/AGENTS
// conventions), so the "UI" requirements from the spec (trainer name shown
// above role, Poké Ball indicators, error labels, correct sprite paths) are
// covered here at the view-model/data layer the client components render
// directly and unmodified.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getGymTrainerName, getRegionalChampionTrainerName } from "@/features/gyms/data/gym-trainer-names";
import { gymBagItemErrorMessageHe, gymStartResultMessageHe } from "@/features/gyms/data/gym-labels";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { executeGymBattleAction } from "@/features/gyms/services/gym-battle-action.service";
import { getGymBattlePartyOptions, startNpcBattle, type StartNpcBattleTarget } from "@/features/gyms/services/gym-battle-session.service";
import { getGymBattleViewData } from "@/features/gyms/services/gym-battle-view.service";
import { markGymBattleCompleted } from "@/features/gyms/services/gym-progression.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedKnownMove, seedPlayerPokemon, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";
const EASY: StartNpcBattleTarget = { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" };
const CHAMPION: StartNpcBattleTarget = { source: "regional-champion", regionId: "kanto" };
const MAX_ROLL = () => 0.999999;

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

test("the battle view's trainerName matches gym-trainer-names.ts for a Gym battle, and differs from the difficulty/role label", async () => {
  seedParty(3);
  await startNpcBattle(PLAYER_ID, EASY, await selectPartyFor(EASY));
  const view = await getGymBattleViewData(PLAYER_ID, "Tester");
  assert.equal(view.status, "ready");
  if (view.status !== "ready") return;
  assert.equal(view.data.trainerName, getGymTrainerName("kanto", 1, "easy"));
  assert.notEqual(view.data.trainerName, view.data.contextLabel, "trainer name and the difficulty/context label must be distinct strings");
});

test("the battle view's trainerName matches gym-trainer-names.ts for a Regional Champion battle", async () => {
  seedParty(6);
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 2, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 3, "leader");
  });
  await startNpcBattle(PLAYER_ID, CHAMPION, await selectPartyFor(CHAMPION));
  const view = await getGymBattleViewData(PLAYER_ID, "Tester");
  assert.equal(view.status, "ready");
  if (view.status !== "ready") return;
  assert.equal(view.data.trainerName, getRegionalChampionTrainerName("kanto"));
});

test("npcTeamAliveFlags marks every already-defeated NPC false, the current one by its own HP, and every not-yet-fought one true", async () => {
  seedParty(3);
  await startNpcBattle(PLAYER_ID, EASY, await selectPartyFor(EASY));
  await executeGymBattleAction(PLAYER_ID, "scratch", MAX_ROLL); // defeats NPC #1, advances to #2

  const view = await getGymBattleViewData(PLAYER_ID, "Tester");
  assert.equal(view.status, "ready");
  if (view.status !== "ready") return;
  assert.deepEqual([...view.data.npcTeamAliveFlags], [false, true, true]);
});

test("playerTeamAliveFlags is derived from the authoritative battle-local HP map, in participant order", async () => {
  seedParty(2);
  const started = await startNpcBattle(PLAYER_ID, EASY, await selectPartyFor(EASY));
  assert.equal(started.status, "started");
  await prisma.npcBattleSession.updateMany({ where: { playerId: PLAYER_ID }, data: { playerBattleHp: { p1: 100, p2: 0 } } });

  const view = await getGymBattleViewData(PLAYER_ID, "Tester");
  assert.equal(view.status, "ready");
  if (view.status !== "ready") return;
  assert.deepEqual([...view.data.playerTeamAliveFlags], [true, false]);
});

test("every participant in the view carries a resolved frontSpriteUrl (used by the Poké Ball row's target picker and Bag panel)", async () => {
  seedParty(2);
  await startNpcBattle(PLAYER_ID, EASY, await selectPartyFor(EASY));
  const view = await getGymBattleViewData(PLAYER_ID, "Tester");
  assert.equal(view.status, "ready");
  if (view.status !== "ready") return;
  for (const participant of view.data.participants) {
    assert.ok(participant.frontSpriteUrl.length > 0);
  }
});

test("the party-selection option's frontSpriteUrl uses the real getFrontSpritePath resolver, not a hand-built path", async () => {
  seedParty(1);
  const options = await getGymBattlePartyOptions(PLAYER_ID, EASY);
  assert.equal(options.status, "ok");
  if (options.status !== "ok") return;
  const species = getSpeciesById("charmander")!;
  assert.equal(options.options[0].frontSpriteUrl, getFrontSpritePath(species));
});

test("gymStartResultMessageHe has a distinct Hebrew message for invalid-selection", () => {
  const message = gymStartResultMessageHe("invalid-selection");
  assert.equal(typeof message, "string");
  assert.ok(message.length > 0);
  assert.notEqual(message, gymStartResultMessageHe("no-usable-party"));
});

test("gymBagItemErrorMessageHe has a distinct, non-empty Hebrew message for every UseGymBattleItemResult error status", () => {
  const statuses = ["invalid-item", "not-participant", "not-owned", "no-item", "invalid-target"] as const;
  const messages = statuses.map(gymBagItemErrorMessageHe);
  for (const message of messages) {
    assert.equal(typeof message, "string");
    assert.ok(message.length > 0);
  }
  assert.equal(new Set(messages).size, statuses.length, "every status must have its own distinct message");
});
