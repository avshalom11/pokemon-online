// GYMS & LEAGUES PHASE 5 — focused coverage for League eligibility
// aggregation (section 2, ELIGIBILITY items 1-5). Runs the REAL
// getLeagueEligibility against the in-memory fake DB, composing Phase 1-3's
// own markGymBattleCompleted/markRegionalChampionDefeated primitives —
// never a separate/duplicated eligibility fact.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getLeagueEligibility } from "./league-eligibility.service.ts";
import { LEAGUE_I, LEAGUE_II, LEAGUE_III } from "../data/league-registry.ts";
import { markGymBattleCompleted, markRegionalChampionDefeated } from "@/features/gyms/services/gym-progression.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });
});

async function winAllGymLeadersAndChampion(regionId: string) {
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, regionId as never, 1, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, regionId as never, 2, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, regionId as never, 3, "leader");
    await markRegionalChampionDefeated(tx, PLAYER_ID, regionId as never);
  });
}

test("League I rejects a player missing exactly one Badge", async () => {
  await winAllGymLeadersAndChampion("kanto");
  await winAllGymLeadersAndChampion("johto");
  // Hoenn: only 2 of 3 badges + champion.
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "hoenn", 1, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "hoenn", 2, "leader");
    await markRegionalChampionDefeated(tx, PLAYER_ID, "hoenn");
  });

  const result = await getLeagueEligibility(PLAYER_ID, LEAGUE_I);
  assert.equal(result.badgeCount, 8);
  assert.equal(result.eligible, false);
});

test("League I rejects a player missing exactly one Regional Champion (9 badges, 2 champions)", async () => {
  await winAllGymLeadersAndChampion("kanto");
  await winAllGymLeadersAndChampion("johto");
  // Hoenn: all 3 badges, but champion not defeated.
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "hoenn", 1, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "hoenn", 2, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "hoenn", 3, "leader");
  });

  const result = await getLeagueEligibility(PLAYER_ID, LEAGUE_I);
  assert.equal(result.badgeCount, 9);
  assert.equal(result.regionalChampionCount, 2);
  assert.equal(result.eligible, false);
});

test("League I accepts exactly 9 badges + 3 champions", async () => {
  await winAllGymLeadersAndChampion("kanto");
  await winAllGymLeadersAndChampion("johto");
  await winAllGymLeadersAndChampion("hoenn");

  const result = await getLeagueEligibility(PLAYER_ID, LEAGUE_I);
  assert.equal(result.badgeCount, 9);
  assert.equal(result.regionalChampionCount, 3);
  assert.equal(result.eligible, true);
});

test("League II mapping is Sinnoh/Unova/Kalos", async () => {
  assert.deepEqual(LEAGUE_II.regionIds, ["sinnoh", "unova", "kalos"]);
  await winAllGymLeadersAndChampion("sinnoh");
  await winAllGymLeadersAndChampion("unova");
  await winAllGymLeadersAndChampion("kalos");
  const result = await getLeagueEligibility(PLAYER_ID, LEAGUE_II);
  assert.equal(result.eligible, true);

  // Kanto progress (a different league entirely) must not count toward League II.
  await winAllGymLeadersAndChampion("kanto");
  const unaffected = await getLeagueEligibility(PLAYER_ID, LEAGUE_II);
  assert.equal(unaffected.badgeCount, 9);
});

test("League III mapping is Alola/Galar/Paldea", async () => {
  assert.deepEqual(LEAGUE_III.regionIds, ["alola", "galar", "paldea"]);
  await winAllGymLeadersAndChampion("alola");
  await winAllGymLeadersAndChampion("galar");
  await winAllGymLeadersAndChampion("paldea");
  const result = await getLeagueEligibility(PLAYER_ID, LEAGUE_III);
  assert.equal(result.eligible, true);
});
