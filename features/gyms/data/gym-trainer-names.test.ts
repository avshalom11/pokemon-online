// FIXED TRAINER NAMES (later task, section 2) — focused coverage for
// gym-trainer-names.ts: 90 unique, non-canonical, data-only names, correctly
// addressable by region/gymNumber/battleSlot and by region for the
// Regional Champion.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getGymTrainerName, getRegionalChampionTrainerName } from "./gym-trainer-names";
import { GYM_BATTLE_SLOT_LABELS_HE } from "./gym-labels";
import type { RegionId } from "@/shared/types/region";

const ALL_REGIONS: readonly RegionId[] = ["kanto", "johto", "hoenn", "sinnoh", "unova", "kalos", "alola", "galar", "paldea"];
const GYM_NUMBERS: readonly (1 | 2 | 3)[] = [1, 2, 3];
const BATTLE_SLOTS = ["easy", "medium", "leader"] as const;

// Canonical Pokémon Gym Leader names — this project's own fixed trainer
// names must never collide with these (section 2's own "NOT canonical
// Pokémon Gym Leader names or any copyrighted character" requirement).
const CANONICAL_GYM_LEADER_NAMES = new Set([
  "Brock",
  "Misty",
  "Lt. Surge",
  "Erika",
  "Koga",
  "Sabrina",
  "Blaine",
  "Giovanni",
  "Falkner",
  "Bugsy",
  "Whitney",
  "Roxanne",
  "Wattson",
  "Cynthia",
  "Iris",
  "Viola",
]);

test("exactly 90 unique trainer names exist across 27 Gyms x 3 slots + 9 Champions", () => {
  const names = new Set<string>();
  for (const region of ALL_REGIONS) {
    for (const gymNumber of GYM_NUMBERS) {
      for (const slot of BATTLE_SLOTS) {
        names.add(getGymTrainerName(region, gymNumber, slot));
      }
    }
    names.add(getRegionalChampionTrainerName(region));
  }
  assert.equal(names.size, 90);
});

test("getGymTrainerName resolves the correct name per region/gymNumber/battleSlot (spot check, no cross-lookup collisions)", () => {
  const kantoEasyGym1 = getGymTrainerName("kanto", 1, "easy");
  const kantoEasyGym2 = getGymTrainerName("kanto", 2, "easy");
  const kantoMediumGym1 = getGymTrainerName("kanto", 1, "medium");
  assert.notEqual(kantoEasyGym1, kantoEasyGym2, "different Gyms in the same region must have different Easy trainers");
  assert.notEqual(kantoEasyGym1, kantoMediumGym1, "different battle slots within the same Gym must have different trainers");
});

test("getRegionalChampionTrainerName returns a distinct name per region, never one of that region's own Gym trainer names", () => {
  for (const region of ALL_REGIONS) {
    const champion = getRegionalChampionTrainerName(region);
    for (const gymNumber of GYM_NUMBERS) {
      for (const slot of BATTLE_SLOTS) {
        assert.notEqual(champion, getGymTrainerName(region, gymNumber, slot), `${region} Champion name collides with a Gym trainer name`);
      }
    }
  }
});

test("no trainer name matches a canonical Pokémon Gym Leader's name", () => {
  for (const region of ALL_REGIONS) {
    for (const gymNumber of GYM_NUMBERS) {
      for (const slot of BATTLE_SLOTS) {
        const name = getGymTrainerName(region, gymNumber, slot);
        assert.ok(!CANONICAL_GYM_LEADER_NAMES.has(name), `"${name}" collides with a canonical Gym Leader name`);
      }
    }
    assert.ok(!CANONICAL_GYM_LEADER_NAMES.has(getRegionalChampionTrainerName(region)));
  }
});

test("trainer names are never equal to the difficulty/role label strings shown alongside them", () => {
  const roleLabels = new Set(Object.values(GYM_BATTLE_SLOT_LABELS_HE));
  for (const region of ALL_REGIONS) {
    for (const gymNumber of GYM_NUMBERS) {
      for (const slot of BATTLE_SLOTS) {
        const name = getGymTrainerName(region, gymNumber, slot);
        assert.ok(!roleLabels.has(name), `trainer name "${name}" must not equal a role label`);
      }
    }
  }
});

test("every trainer name is a non-empty string for all 9 regions x 3 Gyms x 3 slots, and every Champion", () => {
  for (const region of ALL_REGIONS) {
    for (const gymNumber of GYM_NUMBERS) {
      for (const slot of BATTLE_SLOTS) {
        const name = getGymTrainerName(region, gymNumber, slot);
        assert.equal(typeof name, "string");
        assert.ok(name.length > 0);
      }
    }
    const championName = getRegionalChampionTrainerName(region);
    assert.equal(typeof championName, "string");
    assert.ok(championName.length > 0);
  }
});
