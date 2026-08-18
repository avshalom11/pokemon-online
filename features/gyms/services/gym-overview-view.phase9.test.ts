// GYMS & LEAGUES PHASE 9 — focused coverage for this Phase's own additions
// to the /gyms page's server-side assembler: regionStatus, pokemonType, and
// hasActiveSession. Runs the REAL getPlayerGymJourney against the in-memory
// fake DB.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getPlayerGymJourney } from "@/features/gyms/services/gym-overview-view.service";
import { markGymBattleCompleted, markRegionalChampionDefeated } from "@/features/gyms/services/gym-progression.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
});

test("a fresh, unlocked region reports regionStatus 'available'; a below-level-10 player reports 'locked-level'", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });
  const journey = await getPlayerGymJourney(PLAYER_ID);
  assert.equal(journey[0].regionStatus, "available");

  seedPlayerProfile({ id: PLAYER_ID, level: 1, experience: 0 });
  const lowLevelJourney = await getPlayerGymJourney(PLAYER_ID);
  assert.equal(lowLevelJourney[0].regionStatus, "locked-level");
});

test("regionStatus becomes 'in-progress' once one Badge is earned, and 'completed' once all 3 Badges + the Champion are earned", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });

  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "medium");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "leader");
  });
  const midJourney = await getPlayerGymJourney(PLAYER_ID);
  assert.equal(midJourney[0].regionStatus, "in-progress");

  await prisma.$transaction(async (tx) => {
    for (const gymNumber of [2, 3] as const) {
      await markGymBattleCompleted(tx, PLAYER_ID, "kanto", gymNumber, "easy");
      await markGymBattleCompleted(tx, PLAYER_ID, "kanto", gymNumber, "medium");
      await markGymBattleCompleted(tx, PLAYER_ID, "kanto", gymNumber, "leader");
    }
    await markRegionalChampionDefeated(tx, PLAYER_ID, "kanto");
  });
  const doneJourney = await getPlayerGymJourney(PLAYER_ID);
  assert.equal(doneJourney[0].regionStatus, "completed");
});

test("each Gym exposes its raw Pokémon type alongside the badge display name", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });
  const journey = await getPlayerGymJourney(PLAYER_ID);
  assert.deepEqual(
    journey[0].gyms.map((g) => g.pokemonType),
    ["normal", "fire", "water"]
  );
});

test("hasActiveSession is false everywhere with no live NpcBattleSession, and true for exactly the one battle slot a live session targets", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });

  const idleJourney = await getPlayerGymJourney(PLAYER_ID);
  assert.deepEqual(idleJourney[0].gyms[0].hasActiveSession, [false, false, false]);
  assert.equal(idleJourney[0].regionalChampion.hasActiveSession, false);

  await prisma.npcBattleSession.create({
    data: {
      playerId: PLAYER_ID,
      battleSource: "gym",
      regionId: "kanto",
      gymNumber: 2,
      battleSlot: "medium",
      npcTeam: [],
      npcActiveIndex: 0,
      npcCurrentHp: 1,
      npcStatus: null,
      npcStatusTurnsRemaining: null,
      npcStatStages: {},
      npcVolatileState: {},
      playerPokemonIds: [],
      activePlayerPokemonId: "p1",
      playerBattleHp: {},
      playerBattleStatus: {},
      playerStatStages: {},
      playerVolatileState: {},
    },
  });

  const activeJourney = await getPlayerGymJourney(PLAYER_ID);
  assert.deepEqual(activeJourney[0].gyms[1].hasActiveSession, [false, true, false]);
  assert.deepEqual(activeJourney[0].gyms[0].hasActiveSession, [false, false, false]);
  assert.equal(activeJourney[0].regionalChampion.hasActiveSession, false);
});
