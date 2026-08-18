import type { RegionId } from "@/shared/types/region";

// GYMS & LEAGUES PHASE 2 — "previous design" team ideas, kept as GUIDANCE
// ONLY (approved design, section 6) — never authority. Consumed by
// scripts/generate-gym-npc-teams.ts as npc-team-selection.ts's
// `preferredSpeciesIds` hints: for each rarity-target slot, the generator
// tries these species ids first (in this order) and only uses one if it
// actually validates (real species, correct region, exact target rarity,
// not already used elsewhere in the same team) — see selectNpcTeam's own
// doc comment for the exact fallback rule. A name here that doesn't
// resolve, belongs to the wrong region, or has the wrong REAL rarity in
// this project's actual data is silently skipped, never forced; the
// generator's own audit output (see that script) reports every case where
// a hint here was NOT used, and why.
//
// No hints exist for Easy/Medium Trainers, or for any Gym Leader other
// than Kanto's own Fire Gym (the one example the approved design gave) —
// every other slot is selected purely by npc-team-selection.ts's
// deterministic fallback rule (ascending dexNumber among valid
// candidates), which is exactly as intended (section 5: "recognizable/
// strong" is a soft preference this project has no data source to fully
// automate beyond the explicitly curated hints below).

// Kanto's own Fire Gym (gymNumber 2) Leader — the one Gym Leader example
// the approved design gave.
export const KANTO_FIRE_GYM_LEADER_PREFERRED_SPECIES_IDS: readonly string[] = [
  "rapidash",
  "magmar",
  "charizard",
  "arcanine",
  "flareon",
  "moltres",
];

// Regional Champion preferred species, one entry per region — approved
// design, section 6.
export const REGIONAL_CHAMPION_PREFERRED_SPECIES_IDS: Record<RegionId, readonly string[]> = {
  kanto: ["charizard", "venusaur", "blastoise", "dragonite", "mewtwo", "zapdos"],
  johto: ["meganium", "typhlosion", "feraligatr", "tyranitar", "lugia", "ho-oh"],
  hoenn: ["sceptile", "blaziken", "swampert", "salamence", "groudon", "kyogre"],
  sinnoh: ["torterra", "infernape", "empoleon", "garchomp", "dialga", "palkia"],
  unova: ["serperior", "emboar", "samurott", "hydreigon", "reshiram", "zekrom"],
  kalos: ["chesnaught", "delphox", "greninja", "goodra", "xerneas", "yveltal"],
  alola: ["decidueye", "incineroar", "primarina", "kommo-o", "solgaleo", "lunala"],
  galar: ["rillaboom", "cinderace", "inteleon", "dragapult", "zacian", "zamazenta"],
  paldea: ["meowscarada", "skeledirge", "quaquaval", "baxcalibur", "koraidon", "miraidon"],
};
