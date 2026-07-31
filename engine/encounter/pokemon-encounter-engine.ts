import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { RARITY_ENCOUNTER_PROBABILITIES } from "@/data/encounter/rarity-config";
import { ZONE_DATA } from "@/data/zones/zone-data";
import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import type { PokemonRarity, PokemonSpecies } from "@/shared/types/pokemon";
import type { ZoneEncounter, ZoneId } from "@/shared/types/zone";

export interface EncounterResult {
  zoneId: ZoneId;
  pokemon: PokemonSpecies;
  level: number;
  currentHealth: number;
  maximumHealth: number;
}

// Every PokemonRarity value, read once from the config's own keys (never a
// separate hardcoded list) — used to bound the Stage 1 retry loop below.
const ALL_RARITIES = Object.keys(RARITY_ENCOUNTER_PROBABILITIES) as PokemonRarity[];

// pokemonId -> rarity, built once from the static species catalog at module
// load (POKEMON_DATA never changes at runtime) so Stage 2's zone/rarity
// grouping below is a single O(species) pass, not a `.find()` per encounter
// entry, and every later lookup is an O(1) Map read.
const SPECIES_RARITY_BY_ID: Map<string, PokemonRarity> = new Map(
  POKEMON_DATA.map((species) => [species.id, species.rarity])
);

// zoneId -> (rarity -> that zone's own ZoneEncounter entries of that
// rarity). Built once at module load, not per encounter roll — this is the
// "preprocess per zone" caching step: every call to startPokemonEncounter
// after the first pays only a Map lookup here, never a fresh filter/scan of
// a zone's encounters array. ZONE_DATA is static, so this never goes stale.
type EncountersByRarity = Partial<Record<PokemonRarity, ZoneEncounter[]>>;

function groupByRarity(encounters: ZoneEncounter[]): EncountersByRarity {
  const grouped: EncountersByRarity = {};

  for (const encounter of encounters) {
    const rarity = SPECIES_RARITY_BY_ID.get(encounter.pokemonId);
    if (!rarity) continue; // defensive only — every real pokemonId resolves

    (grouped[rarity] ??= []).push(encounter);
  }

  return grouped;
}

const ZONE_ENCOUNTERS_BY_RARITY: Map<ZoneId, EncountersByRarity> = new Map(
  ZONE_DATA.map((zone) => [zone.id, groupByRarity(zone.encounters)])
);

// pokemonId -> dexNumber, same "build once, O(1) lookups after" precedent as
// SPECIES_RARITY_BY_ID above.
const DEX_NUMBER_BY_SPECIES_ID: Map<string, number> = new Map(
  POKEMON_DATA.map((species) => [species.id, species.dexNumber])
);

// zoneId -> every distinct front-sprite URL that zone could ever roll, built
// once at module load from the same static catalogs every encounter roll
// already reads. Lets a caller (see BattleContent's zone-roster preload)
// warm the browser's image cache for a whole zone up front, entirely from
// data already known before any specific encounter is rolled.
const ZONE_FRONT_SPRITE_URLS: Map<ZoneId, string[]> = new Map(
  ZONE_DATA.map((zone) => {
    const dexNumbers = new Set(
      zone.encounters
        .map((encounter) => DEX_NUMBER_BY_SPECIES_ID.get(encounter.pokemonId))
        .filter((dexNumber): dexNumber is number => dexNumber !== undefined)
    );

    return [zone.id, Array.from(dexNumbers, getFrontSpritePath)];
  })
);

export function getZoneFrontSpriteUrls(zoneId: ZoneId): string[] {
  return ZONE_FRONT_SPRITE_URLS.get(zoneId) ?? [];
}

// Single generic weighted-pick, shared by both stages (rarity tiers in
// Stage 1, ZoneEncounter entries in Stage 2) — encounterWeight and rarity
// probability are both "a list of items, each with a relative weight",
// so one implementation covers both instead of two near-duplicates.
function pickWeighted<T>(items: readonly T[], getWeight: (item: T) => number): T {
  const totalWeight = items.reduce((sum, item) => sum + getWeight(item), 0);

  let roll = Math.random() * totalWeight;

  for (const item of items) {
    roll -= getWeight(item);
    if (roll <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

// Stage 1 — choose a rarity, purely from the config's probabilities. No
// pity/streak state anywhere: every call is independent of every previous
// one, so battle #3 and battle #1800 draw from the exact same distribution.
// `excluded` only ever holds rarities already tried and found empty for
// THIS zone within a single startPokemonEncounter call (see the retry loop
// below) — it never persists across calls or otherwise carries history.
function pickRarity(excluded: ReadonlySet<PokemonRarity>): PokemonRarity {
  const candidates = ALL_RARITIES.filter((rarity) => !excluded.has(rarity));
  return pickWeighted(candidates, (rarity) => RARITY_ENCOUNTER_PROBABILITIES[rarity]);
}

// Stage 2 — weighted pick using encounterWeight, restricted to the current
// zone's entries of one specific rarity. encounterWeight now only ever
// decides odds between Pokémon that already share the same rarity tier;
// which tier gets picked at all is entirely Stage 1's job.
function pickEncounterOfRarity(zoneId: ZoneId, rarity: PokemonRarity): ZoneEncounter | undefined {
  const bucket = ZONE_ENCOUNTERS_BY_RARITY.get(zoneId)?.[rarity];

  if (!bucket || bucket.length === 0) {
    return undefined;
  }

  return pickWeighted(bucket, (encounter) => encounter.encounterWeight);
}

// Orchestrates both stages for one zone. If the rarity Stage 1 lands on
// has zero matching Pokémon in this zone, retries with another rarity —
// simple and deterministic: at most ALL_RARITIES.length attempts (4 today),
// each rarity tried at most once, so this always terminates and never
// loops unboundedly. Given startPokemonEncounter already guarantees the
// zone has at least one encounter overall, at least one rarity tier is
// always non-empty, so the loop always succeeds before running out of
// rarities to try — the trailing throw exists only as a defensive
// unreachable guard, matching this file's existing throw-on-invariant-
// violation style below.
function selectZoneEncounter(zoneId: ZoneId): ZoneEncounter {
  const tried = new Set<PokemonRarity>();

  while (tried.size < ALL_RARITIES.length) {
    const rarity = pickRarity(tried);
    const encounter = pickEncounterOfRarity(zoneId, rarity);

    if (encounter) {
      return encounter;
    }

    tried.add(rarity);
  }

  throw new Error(`No populated rarity tier found for zone: ${zoneId}`);
}

function getRandomLevel(
  minimumLevel: number,
  maximumLevel: number
): number {
  return (
    Math.floor(
      Math.random() * (maximumLevel - minimumLevel + 1)
    ) + minimumLevel
  );
}

export function startPokemonEncounter(
  zoneId: ZoneId
): EncounterResult {
  const zone = ZONE_DATA.find(
    (currentZone) => currentZone.id === zoneId
  );

  if (!zone) {
    throw new Error(`Zone not found: ${zoneId}`);
  }

  if (zone.encounters.length === 0) {
    throw new Error(`Zone has no encounters: ${zoneId}`);
  }

  const selectedEncounter = selectZoneEncounter(zoneId);

  const pokemon = POKEMON_DATA.find(
    (currentPokemon) =>
      currentPokemon.id === selectedEncounter.pokemonId
  );

  if (!pokemon) {
    throw new Error(
      `Pokemon not found: ${selectedEncounter.pokemonId}`
    );
  }

  const level = getRandomLevel(
    selectedEncounter.minimumLevel,
    selectedEncounter.maximumLevel
  );

  const maximumHealth = calculatePokemonHpStat(pokemon.baseStats.health, level);

  return {
    zoneId: zone.id,
    pokemon,
    level,
    currentHealth: maximumHealth,
    maximumHealth,
  };
}
