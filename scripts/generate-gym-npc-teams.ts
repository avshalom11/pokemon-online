// GYMS & LEAGUES PHASE 2 — one-off generator for the 90 FIXED NPC teams
// (81 Gym trainer teams + 9 Regional Champion teams). Run via:
//   npm run generate:gym-npc-teams
// Deterministic: same Pokémon catalog + Phase 1 Gym Registry + preference
// hints always produce the exact same output. Writes the two checked-in,
// static data files (features/gyms/data/gym-npc-teams.ts and
// regional-champion-teams.ts) and prints an audit summary (rarity-fallback
// tier counts + evolution-stage legality conflicts) to stdout. Re-run only
// if the Pokémon catalog, Phase 1's Gym Registry, or the preference hints
// change — nothing in the running app ever re-selects a team at battle
// time (see npc-team-selection.ts's own doc comment).
import { writeFileSync } from "node:fs";

import { getSpeciesForRegion } from "@/data/pokemon/pokemon-region-registry";
import { getAllGymDefinitions, GYM_BATTLE_SLOT_ORDER, REGIONAL_CHAMPIONS } from "@/features/gyms/data/gym-registry";
import {
  EASY_TRAINER_RARITY_TARGETS,
  GYM_LEADER_RARITY_TARGETS,
  MEDIUM_TRAINER_RARITY_TARGETS,
  REGIONAL_CHAMPION_RARITY_TARGETS,
} from "@/features/gyms/data/npc-team-composition";
import { selectNpcTeam, type NpcTeamSlotRequest } from "@/features/gyms/data/npc-team-selection";
import {
  KANTO_FIRE_GYM_LEADER_PREFERRED_SPECIES_IDS,
  REGIONAL_CHAMPION_PREFERRED_SPECIES_IDS,
} from "@/features/gyms/data/npc-team-preferences";
import { checkEvolutionStageLegality } from "@/features/gyms/services/gym-npc-evolution-legality-audit";
import type { GymBattleSlotId, GymDifficulty } from "@/features/gyms/types/gym.types";
import type { GymNpcTeamDefinition, NpcTeamMember, RegionalChampionTeamDefinition } from "@/features/gyms/types/npc-team.types";
import type { RegionId } from "@/shared/types/region";

const ALL_REGION_IDS: readonly RegionId[] = ["kanto", "johto", "hoenn", "sinnoh", "unova", "kalos", "alola", "galar", "paldea"];

const BATTLE_SLOT_TARGETS: Record<GymBattleSlotId, readonly (typeof EASY_TRAINER_RARITY_TARGETS)[number][]> = {
  easy: EASY_TRAINER_RARITY_TARGETS,
  medium: MEDIUM_TRAINER_RARITY_TARGETS,
  leader: GYM_LEADER_RARITY_TARGETS,
};

const BATTLE_SLOT_DIFFICULTY: Record<GymBattleSlotId, GymDifficulty> = { easy: "easy", medium: "medium", leader: "hard" };

function buildSlotRequests(
  rarityTargets: readonly (typeof EASY_TRAINER_RARITY_TARGETS)[number][],
  preferredType: string | undefined,
  preferredSpeciesIds: readonly string[] | undefined
): NpcTeamSlotRequest[] {
  return rarityTargets.map((targetRarity) => ({
    targetRarity,
    preferredType: preferredType as NpcTeamSlotRequest["preferredType"],
    preferredSpeciesIds,
  }));
}

function requireFilled(results: (NpcTeamMember | null)[], context: string): NpcTeamMember[] {
  const failures = results
    .map((member, index) => (member === null ? index : -1))
    .filter((index) => index >= 0);

  if (failures.length > 0) {
    throw new Error(`Could not fill slot(s) [${failures.join(", ")}] for ${context} — no valid candidate remained.`);
  }

  return results as NpcTeamMember[];
}

// ---- Gym NPC teams (81) --------------------------------------------------

const gymTeams: GymNpcTeamDefinition[] = [];

for (const gym of getAllGymDefinitions()) {
  for (const battleSlot of GYM_BATTLE_SLOT_ORDER) {
    const rarityTargets = BATTLE_SLOT_TARGETS[battleSlot];
    const preferredSpeciesIds =
      battleSlot === "leader" && gym.regionId === "kanto" && gym.gymNumber === 2 ? KANTO_FIRE_GYM_LEADER_PREFERRED_SPECIES_IDS : undefined;

    const requests = buildSlotRequests(rarityTargets, gym.typeSpecialization, preferredSpeciesIds);
    const results = selectNpcTeam(getSpeciesForRegion(gym.regionId), requests);
    const members = requireFilled(results, `${gym.id} (${battleSlot})`);

    gymTeams.push({ regionId: gym.regionId, gymNumber: gym.gymNumber, battleSlot, members });
  }
}

// ---- Regional Champion teams (9) -----------------------------------------

const championTeams: RegionalChampionTeamDefinition[] = [];

for (const regionId of ALL_REGION_IDS) {
  const requests = buildSlotRequests(REGIONAL_CHAMPION_RARITY_TARGETS, undefined, REGIONAL_CHAMPION_PREFERRED_SPECIES_IDS[regionId]);
  const results = selectNpcTeam(getSpeciesForRegion(regionId), requests);
  const members = requireFilled(results, `${REGIONAL_CHAMPIONS[regionId].id}`);

  championTeams.push({ regionId, members });
}

// ---- Audit: rarity-fallback tier tally ------------------------------------

const tierCounts = new Map<string, number>();
for (const member of [...gymTeams.flatMap((t) => t.members), ...championTeams.flatMap((t) => t.members)]) {
  tierCounts.set(member.fallbackTier, (tierCounts.get(member.fallbackTier) ?? 0) + 1);
}

console.log("=== Rarity/type fallback tier tally (405 total slots) ===");
for (const [tier, count] of tierCounts) {
  console.log(`  ${tier}: ${count}`);
}

console.log("\n=== Gyms with 2+ off-type or lower-rarity fallback slots ===");
for (const team of gymTeams) {
  const fallbackHeavy = team.members.filter(
    (m) => m.fallbackTier !== "exact-rarity-matching-type" && m.fallbackTier !== "no-type-preference"
  );
  if (fallbackHeavy.length >= 2) {
    console.log(`  ${team.regionId}-gym-${team.gymNumber} (${team.battleSlot}): ${fallbackHeavy.map((m) => `${m.speciesId}[${m.fallbackTier}]`).join(", ")}`);
  }
}

// ---- Audit: evolution-stage legality (playerLevel = 1, the worst case — ---
// ---- every Gym is open from Level 1, no region-unlock gating) -------------

interface ConflictRow {
  readonly team: string;
  readonly speciesId: string;
  readonly difficulty: GymDifficulty;
  readonly gymRange: string;
  readonly speciesRange: string;
}

const conflicts: ConflictRow[] = [];

for (const team of gymTeams) {
  const difficulty = BATTLE_SLOT_DIFFICULTY[team.battleSlot];
  for (const member of team.members) {
    const conflict = checkEvolutionStageLegality(member.speciesId, 1, difficulty);
    if (conflict) {
      conflicts.push({
        team: `${team.regionId}-gym-${team.gymNumber}-${team.battleSlot}`,
        speciesId: member.speciesId,
        difficulty,
        gymRange: `${conflict.gymRange.minLevel}-${conflict.gymRange.maxLevel}`,
        speciesRange: `${conflict.speciesLegalRange.minimumLevel}-${conflict.speciesLegalRange.maximumLevel === Number.POSITIVE_INFINITY ? "∞" : conflict.speciesLegalRange.maximumLevel}`,
      });
    }
  }
}

for (const team of championTeams) {
  for (const member of team.members) {
    const conflict = checkEvolutionStageLegality(member.speciesId, 1, "very-hard");
    if (conflict) {
      conflicts.push({
        team: `${team.regionId}-champion`,
        speciesId: member.speciesId,
        difficulty: "very-hard",
        gymRange: `${conflict.gymRange.minLevel}-${conflict.gymRange.maxLevel}`,
        speciesRange: `${conflict.speciesLegalRange.minimumLevel}-${conflict.speciesLegalRange.maximumLevel === Number.POSITIVE_INFINITY ? "∞" : conflict.speciesLegalRange.maximumLevel}`,
      });
    }
  }
}

console.log(`\n=== Evolution-stage legality conflicts at playerLevel=1: ${conflicts.length} of 405 slots ===`);
for (const row of conflicts.slice(0, 40)) {
  console.log(`  ${row.team} :: ${row.speciesId} (${row.difficulty}) — Gym range ${row.gymRange}, species legal range ${row.speciesRange}`);
}
if (conflicts.length > 40) console.log(`  ... and ${conflicts.length - 40} more (see full JSON below)`);
console.log("\nFULL_CONFLICTS_JSON_START");
console.log(JSON.stringify(conflicts));
console.log("FULL_CONFLICTS_JSON_END");

// ---- Write the two checked-in fixed-data files ----------------------------

// The exported binding is given an explicit `readonly T[]` type annotation
// (rather than relying on bare `as const` inference) so every consumer
// sees the same, ordinary GymNpcTeamDefinition[]/RegionalChampionTeamDefinition[]
// shape — an `as const` literal across 81/9 structurally-distinct team
// objects otherwise infers an extremely precise per-team union type that
// trips TypeScript on ordinary aggregate operations (.flatMap/.filter
// across the whole array) in consumers.
function writeDataFile(path: string, header: string, exportName: string, exportType: string, data: unknown, accessorSrc: string) {
  const content = `${header}\n\nexport const ${exportName}: ${exportType} = ${JSON.stringify(data, null, 2)};\n\n${accessorSrc}\n`;
  writeFileSync(path, content, "utf8");
  console.log(`\nWrote ${path}`);
}

writeDataFile(
  "features/gyms/data/gym-npc-teams.ts",
  `import type { GymBattleSlotId } from "../types/gym.types";
import type { GymNpcTeamDefinition } from "../types/npc-team.types";
import type { RegionId } from "@/shared/types/region";

// GYMS & LEAGUES PHASE 2 — GENERATED, checked-in fixed data. Produced by
// scripts/generate-gym-npc-teams.ts — do not hand-edit; re-run the
// generator instead. See npc-team-selection.ts for the selection algorithm
// this data was produced by, and npc-team-preferences.ts for the "previous
// design" hints it was seeded with.`,
  "GYM_NPC_TEAMS",
  "readonly GymNpcTeamDefinition[]",
  gymTeams,
  `export function getGymNpcTeam(regionId: RegionId, gymNumber: 1 | 2 | 3, battleSlot: GymBattleSlotId): GymNpcTeamDefinition | undefined {
  return GYM_NPC_TEAMS.find((team) => team.regionId === regionId && team.gymNumber === gymNumber && team.battleSlot === battleSlot);
}`
);

writeDataFile(
  "features/gyms/data/regional-champion-teams.ts",
  `import type { RegionalChampionTeamDefinition } from "../types/npc-team.types";
import type { RegionId } from "@/shared/types/region";

// GYMS & LEAGUES PHASE 2 — GENERATED, checked-in fixed data. Produced by
// scripts/generate-gym-npc-teams.ts — do not hand-edit; re-run the
// generator instead.`,
  "REGIONAL_CHAMPION_TEAMS",
  "readonly RegionalChampionTeamDefinition[]",
  championTeams,
  `export function getRegionalChampionTeam(regionId: RegionId): RegionalChampionTeamDefinition | undefined {
  return REGIONAL_CHAMPION_TEAMS.find((team) => team.regionId === regionId);
}`
);

console.log(`\nDone: ${gymTeams.length} Gym teams, ${championTeams.length} Champion teams.`);
