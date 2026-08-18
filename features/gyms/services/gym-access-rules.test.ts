// GYMS & LEAGUES PHASE 4 — focused coverage for the two new server-side
// access rules (sections 1/2/4/22 of this Phase's spec): the global
// Level-10 gate and sequential Region Gym progression. Runs the REAL
// startNpcBattle unmodified against the in-memory fake DB, same convention
// gym-battle-session.service.test.ts already established.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { MIN_GYM_PLAYER_LEVEL } from "@/features/gyms/config/gym-access-rules.config";
import { startNpcBattle } from "@/features/gyms/services/gym-battle-session.service";
import { markGymBattleCompleted, markRegionalChampionDefeated } from "@/features/gyms/services/gym-progression.service";
import { REGION_GYM_SEQUENCE } from "@/features/gyms/data/region-gym-sequence";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedKnownMove, seedPlayerPokemon, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";
import { REGION_REGISTRY, isValidRegionId } from "@/features/regions/data/region-registry";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
});

function seedParty() {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
}

async function winRegionalChampion(regionId: string) {
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, regionId as never, 1, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, regionId as never, 2, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, regionId as never, 3, "leader");
    await markRegionalChampionDefeated(tx, PLAYER_ID, regionId as never);
  });
}

test(`Level ${MIN_GYM_PLAYER_LEVEL - 1} cannot start Kanto Gym 1 — locked-level`, async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: MIN_GYM_PLAYER_LEVEL - 1, experience: 0 });
  seedParty();
  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" });
  assert.deepEqual(result, { status: "locked-level" });
});

test(`Level ${MIN_GYM_PLAYER_LEVEL} can start Kanto Gym 1`, async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: MIN_GYM_PLAYER_LEVEL, experience: 0 });
  seedParty();
  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" });
  assert.equal(result.status, "started");
});

test("the Level-10 gate also blocks a Regional Champion battle, not just Gym battles", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 1, experience: 0 });
  seedParty();
  const result = await startNpcBattle(PLAYER_ID, { source: "regional-champion", regionId: "kanto" });
  assert.deepEqual(result, { status: "locked-level" });
});

test("Level 50 cannot start Johto Gym 1 before Kanto's Regional Champion is defeated — locked-previous-region", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });
  seedParty();
  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "johto", gymNumber: 1, battleSlot: "easy" });
  assert.deepEqual(result, { status: "locked-previous-region" });
});

test("Johto unlocks immediately after Kanto's Regional Champion is defeated", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });
  seedParty();
  await winRegionalChampion("kanto");

  const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "johto", gymNumber: 1, battleSlot: "easy" });
  assert.equal(result.status, "started");
});

test("Hoenn requires Johto's Regional Champion specifically — Kanto's alone is not enough", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });
  seedParty();
  await winRegionalChampion("kanto");

  const stillLocked = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "hoenn", gymNumber: 1, battleSlot: "easy" });
  assert.deepEqual(stillLocked, { status: "locked-previous-region" });

  await winRegionalChampion("johto");
  const nowUnlocked = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "hoenn", gymNumber: 1, battleSlot: "easy" });
  assert.equal(nowUnlocked.status, "started");
});

test("the full region chain unlocks in order, all the way through Paldea", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });
  seedParty();

  for (let i = 0; i < REGION_GYM_SEQUENCE.length; i++) {
    const regionId = REGION_GYM_SEQUENCE[i];
    const result = await startNpcBattle(PLAYER_ID, { source: "gym", regionId, gymNumber: 1, battleSlot: "easy" });
    assert.equal(result.status, "started", `${regionId} Gym 1 should be reachable once every earlier region's champion is defeated`);
    await prisma.npcBattleSession.deleteMany({ where: { playerId: PLAYER_ID } });
    await winRegionalChampion(regionId);
  }
});

test("World/Map region availability is untouched by Gym progression — region-registry.ts never imports anything from features/gyms", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("features/regions/data/region-registry.ts", "utf8");
  assert.ok(!src.includes("features/gyms"), "the World/Map Region Registry must stay completely independent of Gym progression");

  // Every region is still present, unconditionally selectable, exactly as
  // before — no locked/hidden concept exists on this registry at all.
  assert.equal(REGION_REGISTRY.length, 9);
  for (const region of REGION_REGISTRY) {
    assert.ok(isValidRegionId(region.id));
  }
});
