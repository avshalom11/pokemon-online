import assert from "node:assert/strict";
import { test } from "node:test";

import type { RegionId } from "@/shared/types/region";
import {
  GYM_BATTLE_FORMATS,
  GYM_BATTLE_SLOT_DIFFICULTY,
  GYM_BATTLE_SLOT_ORDER,
  getAllGymDefinitions,
  getAllRegionalChampionDefinitions,
  REGIONAL_CHAMPION_BATTLE_FORMAT,
  REGIONAL_CHAMPION_DIFFICULTY,
  REGION_GYMS,
} from "./gym-registry.ts";

const EXPECTED_REGION_IDS: RegionId[] = ["kanto", "johto", "hoenn", "sinnoh", "unova", "kalos", "alola", "galar", "paldea"];

const EXPECTED_GYM_TYPES: Record<RegionId, [string, string, string]> = {
  kanto: ["normal", "fire", "water"],
  johto: ["electric", "grass", "ice"],
  hoenn: ["fighting", "poison", "ground"],
  sinnoh: ["flying", "psychic", "bug"],
  unova: ["rock", "ghost", "dragon"],
  kalos: ["dark", "steel", "fairy"],
  alola: ["normal", "electric", "fighting"],
  galar: ["fire", "water", "grass"],
  paldea: ["psychic", "dark", "dragon"],
};

test("exactly 9 regions are represented in the Gym Registry", () => {
  assert.deepEqual(Object.keys(REGION_GYMS).sort(), [...EXPECTED_REGION_IDS].sort());
});

test("exactly 27 Gym definitions exist, 3 per region", () => {
  const all = getAllGymDefinitions();
  assert.equal(all.length, 27);
  for (const regionId of EXPECTED_REGION_IDS) {
    assert.equal(REGION_GYMS[regionId].length, 3);
  }
});

test("each region's Gym type/order matches the approved design exactly", () => {
  for (const regionId of EXPECTED_REGION_IDS) {
    const actualTypes = REGION_GYMS[regionId].map((gym) => gym.typeSpecialization);
    assert.deepEqual(actualTypes, EXPECTED_GYM_TYPES[regionId], `region ${regionId}`);
    REGION_GYMS[regionId].forEach((gym, index) => {
      assert.equal(gym.gymNumber, index + 1);
      assert.equal(gym.regionId, regionId);
      assert.equal(gym.id, `${regionId}-gym-${index + 1}`);
    });
  }
});

test("Regional Champion definition exists for all 9 regions, with no type specialization field", () => {
  const champions = getAllRegionalChampionDefinitions();
  assert.equal(champions.length, 9);
  for (const regionId of EXPECTED_REGION_IDS) {
    const champion = champions.find((c) => c.regionId === regionId);
    assert.ok(champion, `missing champion for ${regionId}`);
    assert.equal(champion!.id, `${regionId}-champion`);
    assert.ok(!("typeSpecialization" in champion!));
  }
});

test("difficulty mapping: easy -> easy, medium -> medium, leader -> hard, champion -> very-hard", () => {
  assert.equal(GYM_BATTLE_SLOT_DIFFICULTY.easy, "easy");
  assert.equal(GYM_BATTLE_SLOT_DIFFICULTY.medium, "medium");
  assert.equal(GYM_BATTLE_SLOT_DIFFICULTY.leader, "hard");
  assert.equal(REGIONAL_CHAMPION_DIFFICULTY, "very-hard");
});

test("battle slot order is easy -> medium -> leader", () => {
  assert.deepEqual(GYM_BATTLE_SLOT_ORDER, ["easy", "medium", "leader"]);
});

test("battle formats use the approved 3/4/6 party sizes and always reset to full HP", () => {
  assert.deepEqual(GYM_BATTLE_FORMATS.easy, { maxPlayerPokemon: 3, npcPokemonCount: 3, resetPartyToFullHpOnStart: true });
  assert.deepEqual(GYM_BATTLE_FORMATS.medium, { maxPlayerPokemon: 4, npcPokemonCount: 4, resetPartyToFullHpOnStart: true });
  assert.deepEqual(GYM_BATTLE_FORMATS.leader, { maxPlayerPokemon: 6, npcPokemonCount: 6, resetPartyToFullHpOnStart: true });
  assert.deepEqual(REGIONAL_CHAMPION_BATTLE_FORMAT, { maxPlayerPokemon: 6, npcPokemonCount: 6, resetPartyToFullHpOnStart: true });
});
