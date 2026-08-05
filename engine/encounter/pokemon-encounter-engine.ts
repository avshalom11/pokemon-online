import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { RARITY_ENCOUNTER_PROBABILITIES } from "@/data/encounter/rarity-config";
import { getAllRegionsWithZoneData, getZone, getZoneData } from "@/data/zones/zone-data";
import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { getEffectiveEncounterRarity } from "@/engine/encounter-rarity/get-effective-encounter-rarity";
import { getEligibleWildLevelRange } from "@/engine/evolution-stage-scaling/species-eligibility";
import { getWildLevelRangeForPlayerLevel, type WildLevelRange } from "@/engine/player-level-scaling/wild-level-bracket-lookup";
import { rollLevelInRange } from "@/engine/player-level-scaling/wild-level-generator";
import { getFrontSpritePath, type SpriteSource } from "@/features/pokemon/media/pokemon-media-paths";
import type { RegionId } from "@/shared/types/region";
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

// regionId -> zoneId -> (rarity -> that region+zone's own ZoneEncounter
// entries of that rarity). Built once at module load, not per encounter
// roll — this is the "preprocess per zone" caching step: every call to
// startPokemonEncounter after the first pays only two Map lookups here,
// never a fresh filter/scan of a zone's encounters array. Region-scoped
// (Phase 4) — the same zoneId (e.g. "grassland") resolves to a completely
// different bucket set per region, since getZoneData(regionId) itself
// returns a different Zone[] per region. Zone data is static, so this
// never goes stale.
//
// Phase 3 — grouped by EFFECTIVE encounter rarity (engine/encounter-rarity),
// never PokemonSpecies.rarity directly: a stone-evolved form (e.g.
// Ninetales, Raichu, Bellossom, Sunflora) is bucketed as "very-rare" here
// regardless of its own real catalog rarity, so it draws from the global
// very-rare tier probability while EncounterResult.pokemon still carries
// that species' real, unmodified PokemonSpecies.rarity for battle UI/
// capture to read.
type EncountersByRarity = Partial<Record<PokemonRarity, ZoneEncounter[]>>;

function groupByRarity(encounters: ZoneEncounter[]): EncountersByRarity {
  const grouped: EncountersByRarity = {};

  for (const encounter of encounters) {
    const rarity = getEffectiveEncounterRarity(encounter.pokemonId);
    if (!rarity) continue; // defensive only — every real pokemonId resolves

    (grouped[rarity] ??= []).push(encounter);
  }

  return grouped;
}

const ZONE_ENCOUNTERS_BY_REGION_AND_RARITY: Map<RegionId, Map<ZoneId, EncountersByRarity>> = new Map(
  getAllRegionsWithZoneData().map((regionId) => [
    regionId,
    new Map(getZoneData(regionId).map((zone) => [zone.id, groupByRarity(zone.encounters)])),
  ])
);

// pokemonId -> sprite source (dexNumber + optional form spriteId — see
// PokemonSpecies.spriteId's own doc comment), same "build once, O(1)
// lookups after" precedent engine/encounter-rarity/
// get-effective-encounter-rarity.ts's own SPECIES_RARITY_BY_ID uses. Species
// ids are globally unique across every generation/region (see
// data/pokemon/pokemon-data.ts), so this one flat map already covers every
// region together — no region-scoping needed here.
const SPRITE_SOURCE_BY_SPECIES_ID: Map<string, SpriteSource> = new Map(
  POKEMON_DATA.map((species) => [species.id, { dexNumber: species.dexNumber, spriteId: species.spriteId }])
);

// regionId -> zoneId -> every distinct front-sprite URL that region+zone
// could ever roll, built once at module load from the same static catalogs
// every encounter roll already reads. Lets a caller (see BattleContent's
// zone-roster preload) warm the browser's image cache for a whole zone up
// front, entirely from data already known before any specific encounter is
// rolled.
const FRONT_SPRITE_URLS_BY_REGION_AND_ZONE: Map<RegionId, Map<ZoneId, string[]>> = new Map(
  getAllRegionsWithZoneData().map((regionId) => [
    regionId,
    new Map(
      getZoneData(regionId).map((zone) => {
        const spriteUrls = new Set(
          zone.encounters
            .map((encounter) => SPRITE_SOURCE_BY_SPECIES_ID.get(encounter.pokemonId))
            .filter((source): source is SpriteSource => source !== undefined)
            .map(getFrontSpritePath)
        );

        return [zone.id, Array.from(spriteUrls)];
      })
    ),
  ])
);

export function getZoneFrontSpriteUrls(regionId: RegionId, zoneId: ZoneId): string[] {
  return FRONT_SPRITE_URLS_BY_REGION_AND_ZONE.get(regionId)?.get(zoneId) ?? [];
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

// Thrown when every rarity tier has been tried and none of them had even
// one species whose legal evolution-stage range (engine/evolution-stage-
// scaling) overlaps the player's current wild-level bracket — i.e. this
// region+zone genuinely has no legal encounter at all for this player right
// now. A dedicated, named error (never a silently-illegal species/level,
// never a generic throw) so a caller can distinguish this from "zone not
// found" or "zone has no encounters at all" above.
export class NoEligibleWildEncounterError extends Error {
  constructor(regionId: RegionId, zoneId: ZoneId, playerRange: WildLevelRange) {
    super(
      `No encounter in zone "${zoneId}" (region "${regionId}") has a species whose legal evolution-stage level range overlaps the player's wild-level bracket [${playerRange.minimumLevel}, ${playerRange.maximumLevel}].`
    );
    this.name = "NoEligibleWildEncounterError";
  }
}

interface SelectedZoneEncounter {
  encounter: ZoneEncounter;
  // The overlap between this specific encounter's species' own legal
  // evolution-stage range and the player's bracket — already computed as
  // part of eligibility (see pickEncounterOfRarity below), reused as-is to
  // roll the final level so the two can never disagree or be recomputed
  // out of sync.
  eligibleRange: WildLevelRange;
}

// Stage 2 — weighted pick using encounterWeight, restricted to the current
// region+zone's entries of one specific rarity AND (Phase 2) further
// restricted to only those entries whose species is actually legal at the
// player's current wild-level bracket (evolution-stage filtering — see
// engine/evolution-stage-scaling). encounterWeight only ever decides odds
// between Pokémon that already share the same rarity tier AND already
// passed this eligibility filter; which tier gets picked at all is entirely
// Stage 1's job, and eligibility is never influenced by weight.
function pickEncounterOfRarity(
  regionId: RegionId,
  zoneId: ZoneId,
  rarity: PokemonRarity,
  playerRange: WildLevelRange
): SelectedZoneEncounter | undefined {
  const bucket = ZONE_ENCOUNTERS_BY_REGION_AND_RARITY.get(regionId)?.get(zoneId)?.[rarity];

  if (!bucket || bucket.length === 0) {
    return undefined;
  }

  const eligible: SelectedZoneEncounter[] = [];
  for (const encounter of bucket) {
    const eligibleRange = getEligibleWildLevelRange(encounter.pokemonId, playerRange);
    if (eligibleRange) {
      eligible.push({ encounter, eligibleRange });
    }
  }

  if (eligible.length === 0) {
    return undefined;
  }

  return pickWeighted(eligible, (candidate) => candidate.encounter.encounterWeight);
}

// Orchestrates both stages for one zone. If the rarity Stage 1 lands on has
// zero matching Pokémon in this zone, OR has matching Pokémon but none of
// them are legal at the player's current wild-level bracket (Phase 2),
// retries with another rarity — simple and deterministic: at most
// ALL_RARITIES.length attempts (4 today), each rarity tried at most once,
// so this always terminates and never loops unboundedly. Unlike before
// Phase 2, exhausting every rarity is no longer purely a defensive-
// unreachable case (a real zone can genuinely have no legal encounter for
// some player levels) — see NoEligibleWildEncounterError above.
function selectZoneEncounter(regionId: RegionId, zoneId: ZoneId, playerRange: WildLevelRange): SelectedZoneEncounter {
  const tried = new Set<PokemonRarity>();

  while (tried.size < ALL_RARITIES.length) {
    const rarity = pickRarity(tried);
    const selected = pickEncounterOfRarity(regionId, zoneId, rarity, playerRange);

    if (selected) {
      return selected;
    }

    tried.add(rarity);
  }

  throw new NoEligibleWildEncounterError(regionId, zoneId, playerRange);
}

// Phase 1 — Wild Pokémon level scaling; Phase 2 — Evolution-stage-aware
// wild encounters; Phase 4 — region-aware zone resolution. The generated
// level comes from the overlap between the player's own level bracket
// (engine/player-level-scaling) and the selected species' own legal
// evolution-stage range (engine/evolution-stage-scaling) — never from the
// selected ZoneEncounter's own minimumLevel/maximumLevel. Those fields are
// kept on ZoneEncounter (and still populate rarity/species selection above
// unaffected) for possible future systems, but are deliberately no longer
// read here.
//
// `regionId` is REQUIRED (never defaulted) — the same zoneId string
// resolves to a completely different Zone (and therefore a completely
// different Pokémon pool) depending on which region is passed here, so a
// caller can never accidentally roll a Kanto encounter while the player is
// in Johto (or vice versa) by simply forgetting this argument.
export function startPokemonEncounter(
  regionId: RegionId,
  zoneId: ZoneId,
  playerLevel: number
): EncounterResult {
  const zone = getZone(regionId, zoneId);

  if (!zone) {
    throw new Error(`Zone not found: "${zoneId}" in region "${regionId}"`);
  }

  if (zone.encounters.length === 0) {
    throw new Error(`Zone has no encounters: "${zoneId}" in region "${regionId}"`);
  }

  const playerRange = getWildLevelRangeForPlayerLevel(playerLevel);
  const { encounter: selectedEncounter, eligibleRange } = selectZoneEncounter(regionId, zoneId, playerRange);

  const pokemon = POKEMON_DATA.find(
    (currentPokemon) =>
      currentPokemon.id === selectedEncounter.pokemonId
  );

  if (!pokemon) {
    throw new Error(
      `Pokemon not found: ${selectedEncounter.pokemonId}`
    );
  }

  const level = rollLevelInRange(eligibleRange);

  const maximumHealth = calculatePokemonHpStat(pokemon.baseStats.health, level);

  return {
    zoneId: zone.id,
    pokemon,
    level,
    currentHealth: maximumHealth,
    maximumHealth,
  };
}
