// GYMS & LEAGUES PHASE 6 — focused coverage for the computer-filler team
// rule (COMPUTER item 30). Pure function, no DB.
import assert from "node:assert/strict";
import { test } from "node:test";

import { computerSlotId, generateComputerTeam } from "./league-computer-team.service.ts";
import { LEAGUE_I } from "../data/league-registry.ts";
import { getSpeciesForRegion } from "@/data/pokemon/pokemon-region-registry";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";

test("team size mirrors the requested size, up to 6", () => {
  const team = generateComputerTeam(LEAGUE_I, 4, 20, () => 0.5);
  assert.equal(team.length, 4);
});

test("every generated species belongs to one of the League's own 3 regions", () => {
  const leaguePool = new Set(LEAGUE_I.regionIds.flatMap((regionId) => getSpeciesForRegion(regionId)).map((s) => s.id));
  const team = generateComputerTeam(LEAGUE_I, 6, 20, () => 0.3);
  for (const member of team) {
    assert.ok(leaguePool.has(member.speciesId), `${member.speciesId} must come from League I's own regions`);
  }
});

test("no legendary-rarity species is ever picked for a computer filler team", () => {
  for (const seed of [0.1, 0.4, 0.6, 0.9]) {
    const team = generateComputerTeam(LEAGUE_I, 6, 50, () => seed);
    for (const member of team) {
      const species = getSpeciesById(member.speciesId)!;
      assert.notEqual(species.rarity, "legendary");
    }
  }
});

test("every computer Pokémon's level equals the real player's own current level", () => {
  const team = generateComputerTeam(LEAGUE_I, 3, 37, () => 0.5);
  for (const member of team) {
    assert.equal(member.level, 37);
  }
});

test("an injected random source produces deterministic, reproducible teams", () => {
  const sequence = [0.9, 0.1, 0.5, 0.3, 0.7, 0.2];
  let i = 0;
  const fixedRandom = () => sequence[i++ % sequence.length];

  const first = generateComputerTeam(LEAGUE_I, 5, 20, fixedRandom);
  i = 0;
  const second = generateComputerTeam(LEAGUE_I, 5, 20, fixedRandom);
  assert.deepEqual(first, second);
});

test("computerSlotId produces stable, distinct ids with no PlayerPokemon dependency", () => {
  assert.equal(computerSlotId(0), "computer-0");
  assert.equal(computerSlotId(1), "computer-1");
  assert.notEqual(computerSlotId(0), computerSlotId(1));
});
