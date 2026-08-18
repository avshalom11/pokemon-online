import assert from "node:assert/strict";
import { test } from "node:test";

import { getSpeciesForRegion } from "@/data/pokemon/pokemon-region-registry";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import type { RegionId } from "@/shared/types/region";
import { REGIONAL_CHAMPION_TEAMS, getRegionalChampionTeam } from "./regional-champion-teams.ts";

const EXPECTED_REGION_IDS: RegionId[] = ["kanto", "johto", "hoenn", "sinnoh", "unova", "kalos", "alola", "galar", "paldea"];

test("exactly 9 Regional Champion teams exist, one per region", () => {
  assert.equal(REGIONAL_CHAMPION_TEAMS.length, 9);
  for (const regionId of EXPECTED_REGION_IDS) {
    assert.ok(getRegionalChampionTeam(regionId), `missing champion team for ${regionId}`);
  }
});

test("every Champion team has exactly 6 Pokémon", () => {
  for (const team of REGIONAL_CHAMPION_TEAMS) {
    assert.equal(team.members.length, 6, team.regionId);
  }
});

test("every species id resolves and belongs to that team's own region", () => {
  for (const team of REGIONAL_CHAMPION_TEAMS) {
    const regionPool = new Set(getSpeciesForRegion(team.regionId as RegionId).map((s) => s.id));
    for (const member of team.members) {
      assert.ok(getSpeciesById(member.speciesId), `unresolved species ${member.speciesId} (${team.regionId})`);
      assert.ok(regionPool.has(member.speciesId), `${member.speciesId} does not belong to ${team.regionId}`);
    }
  }
});

test("no duplicate species within any Champion team", () => {
  for (const team of REGIONAL_CHAMPION_TEAMS) {
    const ids = team.members.map((m) => m.speciesId);
    assert.equal(new Set(ids).size, ids.length, team.regionId);
  }
});

test("Champion composition preserves exactly 4 Very Rare + 2 Legendary, real rarity confirmed against the catalog", () => {
  for (const team of REGIONAL_CHAMPION_TEAMS) {
    const realRarities = team.members.map((m) => getSpeciesById(m.speciesId)!.rarity);
    const veryRareCount = realRarities.filter((r) => r === "very-rare").length;
    const legendaryCount = realRarities.filter((r) => r === "legendary").length;
    assert.equal(veryRareCount, 4, `${team.regionId}: expected 4 very-rare, got ${veryRareCount}`);
    assert.equal(legendaryCount, 2, `${team.regionId}: expected 2 legendary, got ${legendaryCount}`);
  }
});

test("Regional Champion teams have no type specialization: every member is labeled no-type-preference", () => {
  for (const team of REGIONAL_CHAMPION_TEAMS) {
    for (const member of team.members) {
      assert.equal(member.fallbackTier, "no-type-preference", `${team.regionId}: ${member.speciesId}`);
    }
  }
});
