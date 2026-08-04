// ─────────────────────────────────────────────────────────────────────────
// DEV-ONLY MANUAL-TESTING OVERRIDE — NOT part of production encounter
// balance. Lets a developer reach a legendary encounter quickly while
// manually verifying the rarity UI (background/banner/name label), without
// touching PokemonSpecies.rarity, a region's own zone data (data/zones/
// kanto-zone-data.ts, data/zones/johto-zone-data.ts), or
// pokemon-encounter-engine.ts itself (that file is completely untouched by
// this feature).
//
// This module never invents which legendary "belongs" to a zone — that
// used to be a hardcoded zone->legendary table here, which silently went
// stale the moment a region's real legendary placements changed (Zapdos
// moved to grassland, Mew/Mewtwo to haunted-house, etc.) and the table
// wasn't updated to match, so the boost kept offering a legendary that no
// longer belonged in that zone while ignoring the real one that did. To
// make that class of bug impossible, this always re-derives "which
// legendary encounters exist in this region+zone" fresh from that region's
// own real zone data (via getZone(regionId, zoneId) — Phase 4)
// (filtered by PokemonSpecies.rarity) on every call — never from a
// separate list, and never from every legendary species in the game,
// only whichever legendary ZoneEncounter entries the current zone already
// has. Boosts their existing weight; adds nothing that isn't already
// there. Zones with zero legendary entries (e.g. cave, beach today) fall
// back to the real, unmodified encounter — same as before this feature
// existed.
import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { getZone } from "@/data/zones/zone-data";
import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { getEligibleWildLevelRange, isSpeciesEligibleForWildRange } from "@/engine/evolution-stage-scaling/species-eligibility";
import { getWildLevelRangeForPlayerLevel, type WildLevelRange } from "@/engine/player-level-scaling/wild-level-bracket-lookup";
import { rollLevelInRange } from "@/engine/player-level-scaling/wild-level-generator";
import { startPokemonEncounter, type EncounterResult } from "./pokemon-encounter-engine";
import type { RegionId } from "@/shared/types/region";
import type { ZoneEncounter, ZoneId } from "@/shared/types/zone";

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
  // The overlap between this species' own legal evolution-stage range
  // (engine/evolution-stage-scaling) and the player's current wild-level
  // bracket — never the raw ZoneEncounter minimumLevel/maximumLevel, and
  // never recomputed later: rollLevelInRange in buildEncounterResult below
  // rolls directly from this same overlap, exactly like
  // pokemon-encounter-engine.ts's own SelectedZoneEncounter.eligibleRange.
  eligibleRange: WildLevelRange;
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

// Turns a list of real ZoneEncounter entries into WeightedCandidates,
// keeping only the ones whose species is actually legal (Phase 2's
// evolution-stage eligibility — engine/evolution-stage-scaling, the exact
// same helper pokemon-encounter-engine.ts's own Stage 2 filter uses) at
// `playerRange`. This is the one place that guarantees the dev boost can
// never offer an unevolved species above its legal evolution level or an
// evolved species below its legal minimum — never a separate/duplicated
// eligibility check.
function toEligibleCandidates(encounters: ZoneEncounter[], playerRange: WildLevelRange): WeightedCandidate[] {
  const candidates: WeightedCandidate[] = [];

  for (const encounter of encounters) {
    const eligibleRange = getEligibleWildLevelRange(encounter.pokemonId, playerRange);
    if (eligibleRange) {
      candidates.push({ pokemonId: encounter.pokemonId, eligibleRange, weight: encounter.encounterWeight });
    }
  }

  return candidates;
}

// Exported for tests only (probability-math verification without needing
// Math.random determinism) — not meant to be called from app code, which
// should use resolveWildEncounter below. `regionId` (Phase 4) resolves
// which region's own zone data this boost reads from — same "never
// defaulted" rule startPokemonEncounter's own regionId parameter follows,
// so a dev-mode boost can never leak a Kanto legendary into a Johto zone or
// vice versa.
export function buildBoostedCandidates(regionId: RegionId, zoneId: ZoneId, playerRange: WildLevelRange): WeightedCandidate[] | null {
  const zone = getZone(regionId, zoneId);

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

  // Legendaries have no level-evolution relationship in this game's roster
  // (final/standalone), so this filter is a no-op in practice today — kept
  // here anyway rather than assumed, so this boost stays correct even if a
  // future legendary ever gained one, without needing its own special case.
  const eligibleLegendaryEncounters = legendaryEncounters.filter((encounter) =>
    isSpeciesEligibleForWildRange(encounter.pokemonId, playerRange)
  );

  if (eligibleLegendaryEncounters.length === 0) {
    return null;
  }

  const nonLegendaryEncounters = zone.encounters.filter(
    (encounter) => !isLegendarySpecies(encounter.pokemonId)
  );

  const nonLegendaryCandidates = toEligibleCandidates(nonLegendaryEncounters, playerRange);
  const nonLegendaryTotalWeight = nonLegendaryCandidates.reduce((sum, candidate) => sum + candidate.weight, 0);

  // Solve for the legendary tier's combined weight L such that
  // L / (nonLegendaryTotalWeight + L) == LEGENDARY_TEST_MODE_SHARE, then
  // split it evenly across however many ELIGIBLE legendary entries this
  // zone has right now — their own real level ranges are kept as-is
  // (via getEligibleWildLevelRange below), only the weight is overridden
  // for the boost.
  const legendaryTierWeight =
    (nonLegendaryTotalWeight * LEGENDARY_TEST_MODE_SHARE) / (1 - LEGENDARY_TEST_MODE_SHARE);
  const perLegendaryWeight = legendaryTierWeight / eligibleLegendaryEncounters.length;

  const legendaryCandidates: WeightedCandidate[] = eligibleLegendaryEncounters.map((encounter) => ({
    pokemonId: encounter.pokemonId,
    // Guaranteed non-null — this encounter already passed the exact same
    // eligibility check just above.
    eligibleRange: getEligibleWildLevelRange(encounter.pokemonId, playerRange)!,
    weight: perLegendaryWeight,
  }));

  const allCandidates = [...nonLegendaryCandidates, ...legendaryCandidates];

  return allCandidates.length > 0 ? allCandidates : null;
}

// Level generation rolls from THIS specific candidate's own eligible
// overlap (computed once, in buildBoostedCandidates/toEligibleCandidates
// above) via the same rollLevelInRange primitive the real engine uses —
// never the player's raw bracket, and never the ZoneEncounter's own stale
// minimumLevel/maximumLevel, so a dev-boosted encounter is levelled exactly
// like any other wild encounter would be for this same player and species.
function buildEncounterResult(zoneId: ZoneId, candidate: WeightedCandidate): EncounterResult {
  const pokemon = POKEMON_DATA.find((species) => species.id === candidate.pokemonId);
  if (!pokemon) {
    throw new Error(`Pokemon not found: ${candidate.pokemonId}`);
  }

  const level = rollLevelInRange(candidate.eligibleRange);
  const maximumHealth = calculatePokemonHpStat(pokemon.baseStats.health, level);

  return { zoneId, pokemon, level, currentHealth: maximumHealth, maximumHealth };
}

// The one function callers should use — transparently returns the real,
// unmodified production encounter (startPokemonEncounter, byte-for-byte
// the same function/behavior as always) unless the dev flag is on AND this
// region+zone already has at least one legendary ZoneEncounter entry of its
// own that's also evolution-stage-eligible at the player's current bracket;
// in every other case behavior is identical to calling startPokemonEncounter
// directly. `regionId` is threaded straight through to both paths (Phase 4)
// — the dev-only boost must resolve the exact same region+zone pool the
// real engine would have.
export function resolveWildEncounter(regionId: RegionId, zoneId: ZoneId, playerLevel: number): EncounterResult {
  if (isLegendaryEncounterTestModeEnabled()) {
    const playerRange = getWildLevelRangeForPlayerLevel(playerLevel);
    const candidates = buildBoostedCandidates(regionId, zoneId, playerRange);
    if (candidates) {
      return buildEncounterResult(zoneId, pickWeighted(candidates));
    }
  }

  return startPokemonEncounter(regionId, zoneId, playerLevel);
}
