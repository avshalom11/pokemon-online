import assert from "node:assert/strict";
import { test } from "node:test";

import { getSpeciesForRegion } from "@/data/pokemon/pokemon-region-registry";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getAllGymDefinitions, GYM_BATTLE_SLOT_ORDER } from "./gym-registry.ts";
import { GYM_NPC_TEAMS, getGymNpcTeam } from "./gym-npc-teams.ts";

test("exactly 81 Gym NPC teams exist (27 Gyms x 3 battle slots)", () => {
  assert.equal(GYM_NPC_TEAMS.length, 81);
});

test("every real Gym has all 3 battle slots represented exactly once", () => {
  for (const gym of getAllGymDefinitions()) {
    for (const battleSlot of GYM_BATTLE_SLOT_ORDER) {
      const team = getGymNpcTeam(gym.regionId, gym.gymNumber, battleSlot);
      assert.ok(team, `missing team for ${gym.id} (${battleSlot})`);
    }
  }
});

test("Easy/Medium/Leader teams have the approved 3/4/6 sizes", () => {
  for (const team of GYM_NPC_TEAMS) {
    const expected = { easy: 3, medium: 4, leader: 6 }[team.battleSlot];
    assert.equal(team.members.length, expected, `${team.regionId}-gym-${team.gymNumber} (${team.battleSlot})`);
  }
});

test("every species id on every Gym team resolves against the real catalog", () => {
  for (const team of GYM_NPC_TEAMS) {
    for (const member of team.members) {
      assert.ok(getSpeciesById(member.speciesId), `unresolved species ${member.speciesId} on ${team.regionId}-gym-${team.gymNumber} (${team.battleSlot})`);
    }
  }
});

test("every species on every Gym team belongs to that Gym's own region", () => {
  for (const team of GYM_NPC_TEAMS) {
    const regionPool = new Set(getSpeciesForRegion(team.regionId).map((s) => s.id));
    for (const member of team.members) {
      assert.ok(regionPool.has(member.speciesId), `${member.speciesId} does not belong to ${team.regionId} (${team.regionId}-gym-${team.gymNumber} ${team.battleSlot})`);
    }
  }
});

test("no duplicate species within any single Gym team", () => {
  for (const team of GYM_NPC_TEAMS) {
    const ids = team.members.map((m) => m.speciesId);
    assert.equal(new Set(ids).size, ids.length, `duplicate species in ${team.regionId}-gym-${team.gymNumber} (${team.battleSlot})`);
  }
});

test("every member's REAL rarity (PokemonSpecies.rarity) matches or is exactly one tier below its targetRarity — never the effective/encounter rarity", () => {
  const TIER_INDEX: Record<string, number> = { common: 0, rare: 1, "very-rare": 2, legendary: 3 };
  for (const team of GYM_NPC_TEAMS) {
    for (const member of team.members) {
      const real = getSpeciesById(member.speciesId)!.rarity;
      const isExactMatch = real === member.targetRarity;
      const isOneTierLower = TIER_INDEX[real] === TIER_INDEX[member.targetRarity] - 1;
      assert.ok(
        isExactMatch || isOneTierLower,
        `${member.speciesId}: real rarity ${real} is neither the target ${member.targetRarity} nor one tier lower (${team.regionId}-gym-${team.gymNumber} ${team.battleSlot})`
      );
    }
  }
});

test("Easy target composition (2 Common + 1 Rare) is respected wherever no fallback was needed", () => {
  const easyTeams = GYM_NPC_TEAMS.filter((t) => t.battleSlot === "easy");
  for (const team of easyTeams) {
    assert.deepEqual(
      team.members.map((m) => m.targetRarity),
      ["common", "common", "rare"],
      `${team.regionId}-gym-${team.gymNumber}`
    );
  }
});

test("Medium target composition (1 Common + 3 Rare) is respected wherever no fallback was needed", () => {
  const mediumTeams = GYM_NPC_TEAMS.filter((t) => t.battleSlot === "medium");
  for (const team of mediumTeams) {
    assert.deepEqual(
      team.members.map((m) => m.targetRarity),
      ["common", "rare", "rare", "rare"],
      `${team.regionId}-gym-${team.gymNumber}`
    );
  }
});

test("Gym Leader target composition (2 Rare + 3 Very Rare + 1 Legendary) is respected; any fallback used is documented via fallbackTier", () => {
  const leaderTeams = GYM_NPC_TEAMS.filter((t) => t.battleSlot === "leader");
  assert.equal(leaderTeams.length, 27);
  for (const team of leaderTeams) {
    assert.deepEqual(
      team.members.map((m) => m.targetRarity),
      ["rare", "rare", "very-rare", "very-rare", "very-rare", "legendary"],
      `${team.regionId}-gym-${team.gymNumber}`
    );
    for (const member of team.members) {
      assert.ok(member.fallbackTier, `missing fallbackTier documentation for ${member.speciesId}`);
    }
  }
});

test("Legendary slots never downgrade rarity: every Gym Leader's Legendary member is genuinely Legendary rarity", () => {
  for (const team of GYM_NPC_TEAMS.filter((t) => t.battleSlot === "leader")) {
    const legendaryMember = team.members[team.members.length - 1];
    assert.equal(legendaryMember.targetRarity, "legendary");
    assert.equal(getSpeciesById(legendaryMember.speciesId)!.rarity, "legendary", `${team.regionId}-gym-${team.gymNumber}`);
  }
});

test("Type preference is maximized: the large majority of slots with a type preference matched that type exactly", () => {
  const withTypePreference = GYM_NPC_TEAMS.flatMap((t) => t.members).filter((m) => m.fallbackTier !== "no-type-preference");
  const matchingType = withTypePreference.filter((m) => m.fallbackTier === "exact-rarity-matching-type");
  // Real measured result: 284 of 351 type-constrained slots matched exactly — documented in this Phase's report, asserted here as a floor so a future regeneration can't silently regress it.
  assert.ok(matchingType.length >= 280, `only ${matchingType.length} of ${withTypePreference.length} type-constrained slots matched the Gym's type`);
});
