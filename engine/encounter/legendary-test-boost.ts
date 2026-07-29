// ─────────────────────────────────────────────────────────────────────────
// DEV-ONLY MANUAL-TESTING OVERRIDE — NOT part of production encounter
// balance. Lets a developer reach a legendary encounter quickly while
// manually verifying the rarity UI (background/banner/name label), without
// touching PokemonSpecies.rarity, ZONE_DATA, or pokemon-encounter-engine.ts
// itself (that file is completely untouched by this feature).
//
// This module never invents which legendary "belongs" to a zone — that
// used to be a hardcoded zone->legendary table here, which silently went
// stale the moment ZONE_DATA's real legendary placements changed (Zapdos
// moved to grassland, Mew/Mewtwo to haunted-house, etc.) and the table
// wasn't updated to match, so the boost kept offering a legendary that no
// longer belonged in that zone while ignoring the real one that did. To
// make that class of bug impossible, this always re-derives "which
// legendary encounters exist in this zone" fresh from ZONE_DATA itself
// (filtered by PokemonSpecies.rarity) on every call — never from a
// separate list, and never from every legendary species in the game,
// only whichever legendary ZoneEncounter entries the current zone already
// has. Boosts their existing weight; adds nothing that isn't already
// there. Zones with zero legendary entries (e.g. cave, beach today) fall
// back to the real, unmodified encounter — same as before this feature
// existed.
import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { ZONE_DATA } from "@/data/zones/zone-data";
import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { startPokemonEncounter, type EncounterResult } from "./pokemon-encounter-engine";
import type { ZoneId } from "@/shared/types/zone";

// ~20% combined legendary-tier probability, per the manual-testing request
// this override exists for — a deliberately large, obviously-not-production
// number chosen for quick manual reachability, not game balance.
const LEGENDARY_TEST_MODE_SHARE = 0.2;

// True only for a pokemonId whose species catalog entry is rarity
// "legendary" — the one and only source of truth for "is this a
// legendary", same field capture.ts already keys off. Never a separate
// hardcoded id list.
function isLegendarySpecies(pokemonId: string): boolean {
  return POKEMON_DATA.find((species) => species.id === pokemonId)?.rarity === "legendary";
}

// Reads live (not cached at module load) so toggling the env var and
// restarting the dev server picks it up without any other code change.
// Hard-gated on NODE_ENV !== "production" in addition to the flag itself —
// belt-and-braces so this can never activate in a production build even if
// the env var were somehow set there.
export function isLegendaryEncounterTestModeEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.LEGENDARY_ENCOUNTER_TEST_MODE === "true";
}

interface WeightedCandidate {
  pokemonId: string;
  minimumLevel: number;
  maximumLevel: number;
  weight: number;
}

// Deliberately re-implemented here (not imported from
// pokemon-encounter-engine.ts) — a ~5-line pure weighted-pick, duplicating
// it keeps the real engine file at zero diff for this feature, which
// matters more than avoiding a few lines of duplication for a dev-only tool.
function pickWeighted(candidates: WeightedCandidate[]): WeightedCandidate {
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const candidate of candidates) {
    roll -= candidate.weight;
    if (roll <= 0) return candidate;
  }
  return candidates[candidates.length - 1];
}

function rollLevel(minimumLevel: number, maximumLevel: number): number {
  return Math.floor(Math.random() * (maximumLevel - minimumLevel + 1)) + minimumLevel;
}

// Exported for tests only (probability-math verification without needing
// Math.random determinism) — not meant to be called from app code, which
// should use resolveWildEncounter below.
export function buildBoostedCandidates(zoneId: ZoneId): WeightedCandidate[] | null {
  const zone = ZONE_DATA.find((currentZone) => currentZone.id === zoneId);

  if (!zone || zone.encounters.length === 0) {
    return null;
  }

  // The only source of "which legendary(s) can appear here": whichever of
  // THIS zone's own real ZoneEncounter entries are legendary-rarity
  // species — never a separate id list, never every legendary in the
  // game. A zone with none (e.g. cave, beach today) returns null and
  // resolveWildEncounter falls back to the untouched real engine.
  const legendaryEncounters = zone.encounters.filter((encounter) => isLegendarySpecies(encounter.pokemonId));

  if (legendaryEncounters.length === 0) {
    return null;
  }

  const nonLegendaryEncounters = zone.encounters.filter(
    (encounter) => !isLegendarySpecies(encounter.pokemonId)
  );

  const nonLegendaryCandidates: WeightedCandidate[] = nonLegendaryEncounters.map((encounter) => ({
    pokemonId: encounter.pokemonId,
    minimumLevel: encounter.minimumLevel,
    maximumLevel: encounter.maximumLevel,
    weight: encounter.encounterWeight,
  }));

  const nonLegendaryTotalWeight = nonLegendaryCandidates.reduce((sum, candidate) => sum + candidate.weight, 0);

  // Solve for the legendary tier's combined weight L such that
  // L / (nonLegendaryTotalWeight + L) == LEGENDARY_TEST_MODE_SHARE, then
  // split it evenly across however many legendary entries this zone
  // already has — their own real level ranges are kept as-is, only the
  // weight is overridden for the boost.
  const legendaryTierWeight =
    (nonLegendaryTotalWeight * LEGENDARY_TEST_MODE_SHARE) / (1 - LEGENDARY_TEST_MODE_SHARE);
  const perLegendaryWeight = legendaryTierWeight / legendaryEncounters.length;

  const legendaryCandidates: WeightedCandidate[] = legendaryEncounters.map((encounter) => ({
    pokemonId: encounter.pokemonId,
    minimumLevel: encounter.minimumLevel,
    maximumLevel: encounter.maximumLevel,
    weight: perLegendaryWeight,
  }));

  return [...nonLegendaryCandidates, ...legendaryCandidates];
}

function buildEncounterResult(zoneId: ZoneId, candidate: WeightedCandidate): EncounterResult {
  const pokemon = POKEMON_DATA.find((species) => species.id === candidate.pokemonId);
  if (!pokemon) {
    throw new Error(`Pokemon not found: ${candidate.pokemonId}`);
  }

  const level = rollLevel(candidate.minimumLevel, candidate.maximumLevel);
  const maximumHealth = calculatePokemonHpStat(pokemon.baseStats.health, level);

  return { zoneId, pokemon, level, currentHealth: maximumHealth, maximumHealth };
}

// The one function callers should use — transparently returns the real,
// unmodified production encounter (startPokemonEncounter, byte-for-byte
// the same function/behavior as always) unless the dev flag is on AND this
// zone already has at least one legendary ZoneEncounter entry of its own;
// in every other case behavior is identical to calling
// startPokemonEncounter directly.
export function resolveWildEncounter(zoneId: ZoneId): EncounterResult {
  if (isLegendaryEncounterTestModeEnabled()) {
    const candidates = buildBoostedCandidates(zoneId);
    if (candidates) {
      return buildEncounterResult(zoneId, pickWeighted(candidates));
    }
  }

  return startPokemonEncounter(zoneId);
}
