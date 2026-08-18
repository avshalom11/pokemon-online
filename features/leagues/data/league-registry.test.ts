import assert from "node:assert/strict";
import { test } from "node:test";

import { CHAMPIONS_LEAGUE, LEAGUE_I, LEAGUE_II, LEAGUE_III, REGIONAL_LEAGUES, isEligibleForRegionalLeague } from "./league-registry.ts";

test("League I regions: Kanto, Johto, Hoenn", () => {
  assert.deepEqual(LEAGUE_I.regionIds, ["kanto", "johto", "hoenn"]);
});

test("League II regions: Sinnoh, Unova, Kalos", () => {
  assert.deepEqual(LEAGUE_II.regionIds, ["sinnoh", "unova", "kalos"]);
});

test("League III regions: Alola, Galar, Paldea", () => {
  assert.deepEqual(LEAGUE_III.regionIds, ["alola", "galar", "paldea"]);
});

test("every regional league's eligibility is exactly 9 Gym Badges + 3 Regional Champions defeated", () => {
  assert.equal(REGIONAL_LEAGUES.length, 3);
  for (const league of REGIONAL_LEAGUES) {
    assert.equal(league.requiredBadgeCount, 9);
    assert.equal(league.requiredRegionalChampionCount, 3);
  }
});

test("isEligibleForRegionalLeague requires both thresholds met, not just one", () => {
  assert.equal(isEligibleForRegionalLeague(LEAGUE_I, 9, 3), true);
  assert.equal(isEligibleForRegionalLeague(LEAGUE_I, 8, 3), false, "8 badges is not enough");
  assert.equal(isEligibleForRegionalLeague(LEAGUE_I, 9, 2), false, "2 champions is not enough");
});

test("Champions League qualifier design is exactly 4 slots: League I/II/III winners + League III runner-up", () => {
  assert.equal(CHAMPIONS_LEAGUE.qualifierSources.length, 4);
  assert.deepEqual(CHAMPIONS_LEAGUE.qualifierSources, ["league-1-winner", "league-2-winner", "league-3-winner", "league-3-runner-up"]);
});
