// GYM TRAINER / REGIONAL CHAMPION GENDER DESIGN (later task, sections 2/3)
// — focused coverage for the approved gender-per-Gym / approved-name
// tables. There is no separate "gender" field anywhere in the runtime
// data model (nothing else in the game reads or displays gender), so this
// asserts directly against the approved NAME tables themselves — the
// authoritative, gender-correct source the task specified name-by-name.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getGymTrainerName, getRegionalChampionTrainerName } from "./gym-trainer-names";
import type { RegionId } from "@/shared/types/region";
import type { GymBattleSlotId } from "../types/gym.types";

// The approved gender matrix, section 2 verbatim (Gym 1/2/3, then Champion).
const APPROVED_GENDER: Record<RegionId, readonly ["male" | "female", "male" | "female", "male" | "female", "male" | "female"]> = {
  kanto: ["male", "male", "female", "male"],
  johto: ["female", "male", "female", "male"],
  hoenn: ["male", "female", "male", "female"],
  sinnoh: ["female", "male", "male", "male"],
  unova: ["male", "female", "male", "female"],
  kalos: ["female", "male", "female", "male"],
  alola: ["male", "female", "male", "male"],
  galar: ["male", "female", "female", "male"],
  paldea: ["male", "male", "female", "male"],
};

// The approved "strong names" table, section 3 verbatim — Gym Leader per
// Gym, then Regional Champion.
const APPROVED_LEADER_NAMES: Record<RegionId, readonly [string, string, string]> = {
  kanto: ["רייבן", "קיידן", "אלירה"],
  johto: ["סלינה", "רונאן", "ניירה"],
  hoenn: ["אסלן", "קאסיה", "דארן"],
  sinnoh: ["ליירה", "קיירו", "דרייבן"],
  unova: ["קאיין", "סרפינה", "לוקאן"],
  kalos: ["אוולין", "אלריק", "סילביה"],
  alola: ["קאי", "מאיה", "טארק"],
  galar: ["רואן", "אליסיה", "ויולה"],
  paldea: ["דמיאן", "ליאון", "אריה"],
};

const APPROVED_CHAMPION_NAMES: Record<RegionId, string> = {
  kanto: "דרייק",
  johto: "קורווין",
  hoenn: "ואלירה",
  sinnoh: "אוריון",
  unova: "מורגנה",
  kalos: "לאוניס",
  alola: "ראידן",
  galar: "גאריק",
  paldea: "ואלטר",
};

const ALL_REGIONS = Object.keys(APPROVED_GENDER) as RegionId[];
const GYM_NUMBERS = [1, 2, 3] as const;
const BATTLE_SLOTS: readonly GymBattleSlotId[] = ["easy", "medium", "leader"];

// Hebrew given names this data set treats as unambiguously each gender —
// the SAME pool used to construct the Easy/Medium names in
// gym-trainer-names.ts (ordinary Hebrew names, distinct in style from the
// "strong fantasy" Leader/Champion names, preserving that architecture).
const MALE_NAMES = new Set([
  "אורי", "תומר", "דור", "זיו", "נדב", "רן", "אלמוג", "ברק", "נחשון", "עידו", "שי", "גיל", "איתי", "בן", "אלעד", "עוז", "רואי",
  "אבנר", "שגיא", "עידן", "יאיר", "עמרי", "גיא", "יובל", "אורן", "רועי", "אסף", "עמית", "אלון", "רון",
]);
const FEMALE_NAMES = new Set([
  "מיכל", "שירה", "קרן", "רותי", "הילה", "פזית", "יערה", "סיוון", "יעל", "נטע", "מור", "מיה", "אורית", "ורד", "יפית", "קטיה",
  "רוני", "שני", "גיתית", "אביגיל", "נועה", "הדר", "ליה", "מירב",
]);

function genderOfEasyMedium(name: string): "male" | "female" {
  if (MALE_NAMES.has(name)) return "male";
  if (FEMALE_NAMES.has(name)) return "female";
  throw new Error(`"${name}" is not in the known Easy/Medium male/female name pools — update this test's pools if a name changed`);
}

test("all 27 Gym gender assignments (Easy/Medium/Leader trios) match the approved matrix", () => {
  for (const region of ALL_REGIONS) {
    for (const gymNumber of GYM_NUMBERS) {
      const expectedGender = APPROVED_GENDER[region][gymNumber - 1];

      // Easy/Medium: gender read off the ordinary-name pool.
      assert.equal(genderOfEasyMedium(getGymTrainerName(region, gymNumber, "easy")), expectedGender);
      assert.equal(genderOfEasyMedium(getGymTrainerName(region, gymNumber, "medium")), expectedGender);

      // Leader: the approved name table itself IS the gender-correct
      // source (section 3's names are listed in the exact same
      // Gym1/Gym2/Gym3 order as section 2's own gender matrix) — verified
      // directly against that table rather than an ordinary-name heuristic
      // (fantasy Leader names aren't in that pool by design).
      assert.equal(getGymTrainerName(region, gymNumber, "leader"), APPROVED_LEADER_NAMES[region][gymNumber - 1]);
    }
  }
});

// The Champion's gender is defined by its approved name pairing itself
// (section 3 lists Champion names in the same per-region order section 2's
// own gender matrix uses) — verified by confirming production uses the
// EXACT approved name for each region, the gender-correct source.
test("all 9 Regional Champion genders match the approved matrix (verified via the exact approved name)", () => {
  for (const region of ALL_REGIONS) {
    assert.equal(getRegionalChampionTrainerName(region), APPROVED_CHAMPION_NAMES[region], `${region} Champion name must be the approved "${APPROVED_CHAMPION_NAMES[region]}"`);
  }
});

test("every Gym Leader name matches the approved table exactly", () => {
  for (const region of ALL_REGIONS) {
    for (const gymNumber of GYM_NUMBERS) {
      assert.equal(getGymTrainerName(region, gymNumber, "leader"), APPROVED_LEADER_NAMES[region][gymNumber - 1]);
    }
  }
});

test("every Regional Champion name matches the approved table exactly", () => {
  for (const region of ALL_REGIONS) {
    assert.equal(getRegionalChampionTrainerName(region), APPROVED_CHAMPION_NAMES[region]);
  }
});

test("Easy and Medium names remain separately named (never collapsed into the Leader architecture) and gender-consistent with their own Gym", () => {
  for (const region of ALL_REGIONS) {
    for (const gymNumber of GYM_NUMBERS) {
      const expectedGender = APPROVED_GENDER[region][gymNumber - 1];
      const easyName = getGymTrainerName(region, gymNumber, "easy");
      const mediumName = getGymTrainerName(region, gymNumber, "medium");
      const leaderName = getGymTrainerName(region, gymNumber, "leader");

      assert.notEqual(easyName, mediumName, `${region} Gym ${gymNumber}: Easy and Medium must stay separately named`);
      assert.notEqual(easyName, leaderName);
      assert.notEqual(mediumName, leaderName);
      assert.equal(genderOfEasyMedium(easyName), expectedGender, `${region} Gym ${gymNumber} Easy ("${easyName}") must be ${expectedGender}`);
      assert.equal(genderOfEasyMedium(mediumName), expectedGender, `${region} Gym ${gymNumber} Medium ("${mediumName}") must be ${expectedGender}`);
    }
  }
});

test("all 90 NPC opponent names (27 Easy + 27 Medium + 27 Leader + 9 Champion) remain globally unique", () => {
  const names: string[] = [];
  for (const region of ALL_REGIONS) {
    for (const gymNumber of GYM_NUMBERS) {
      for (const slot of BATTLE_SLOTS) {
        names.push(getGymTrainerName(region, gymNumber, slot));
      }
    }
    names.push(getRegionalChampionTrainerName(region));
  }
  assert.equal(names.length, 90);
  assert.equal(new Set(names).size, 90, "every one of the 90 names must be unique");
});
