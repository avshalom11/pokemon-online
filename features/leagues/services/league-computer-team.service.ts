import "server-only";

import { getSpeciesForRegion } from "@/data/pokemon/pokemon-region-registry";
import type { PokemonSpecies } from "@/shared/types/pokemon";
import type { RegionalLeagueDefinition } from "../types/league.types";

// GYMS & LEAGUES PHASE 6 — computer-filler TEAM FOUNDATION only (section
// 16). Deliberately reuses two things that already exist rather than
// inventing a League-specific NPC roster system: the species POOL comes
// from getSpeciesForRegion (data/pokemon/pokemon-region-registry.ts) — the
// exact same "broad regional pool" source features/gyms/data/
// npc-team-selection.ts's own doc comment points to for Gym NPC teams and
// features/eggs/services/hatch-pool.service.ts already uses — combined
// across the League's own 3 regions (never a single arbitrary region's
// pool, and never another League's regions). The actual PICK is a plain
// uniform-random shuffle over that pool via an injectable random source —
// the same Fisher-Yates helper shape tournament-pairing.ts already
// established for Round-1 pairing, not the curated rarity/type-preference
// machinery npc-team-selection.ts uses for hand-tuned FIXED Gym rosters
// (that machinery is a build-time generator for 90 checked-in, reproducible
// teams; a computer-filler team is generated fresh per PvP match, so an
// injectable-random live picker is the right shape here instead).
//
// EXACT RULE CHOSEN (report this back verbatim):
//   1. Pool = species from every region in the League (deduped by id),
//      EXCLUDING "legendary" rarity — a generic filler opponent should
//      never have an unfair legendary edge over a real player's likely
//      more ordinary team; this is the one deliberate fairness rule this
//      Phase adds on top of straight reuse.
//   2. Team size = the real player's own participating party size (already
//      capped at 6 by the caller), never a fixed 6 regardless of the real
//      side.
//   3. Every computer Pokémon's level = the real player's own current
//      Player Level (getPlayerLevel) — flat, not offset — "competitive
//      relative to the real player" without inventing a second
//      difficulty-curve config the way Gym's own level-scaling exists for
//      NPC trainers (this is a fair PvP opponent, not an intentionally
//      easier/harder Gym trainer).
//   4. Species are chosen via a uniform shuffle (deterministic given an
//      injected random source) — no rarity/type curation beyond the
//      legendary exclusion above.

export interface ComputerTeamMember {
  readonly speciesId: string;
  readonly level: number;
}

function shuffle<T>(items: readonly T[], randomSource: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomSource() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function leagueSpeciesPool(league: RegionalLeagueDefinition): PokemonSpecies[] {
  const seen = new Map<string, PokemonSpecies>();
  for (const regionId of league.regionIds) {
    for (const species of getSpeciesForRegion(regionId)) {
      if (species.rarity === "legendary") continue;
      if (!seen.has(species.id)) seen.set(species.id, species);
    }
  }
  return [...seen.values()];
}

export function generateComputerTeam(
  league: RegionalLeagueDefinition,
  teamSize: number,
  playerLevel: number,
  randomSource: () => number = Math.random
): ComputerTeamMember[] {
  const pool = leagueSpeciesPool(league);
  const picked = shuffle(pool, randomSource).slice(0, Math.max(0, teamSize));
  return picked.map((species) => ({ speciesId: species.id, level: playerLevel }));
}

// The stable id every computer-filler slot is identified by everywhere
// else in a LeagueBattleSession (battle-local HP map, status map, active-
// slot pointer) — there is no backing PlayerPokemon row to key off of
// instead (section 18).
export function computerSlotId(index: number): string {
  return `computer-${index}`;
}
