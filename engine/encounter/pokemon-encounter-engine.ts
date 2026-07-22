import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { ZONE_DATA } from "@/data/zones/zone-data";
import { calculateBattleStats } from "@/engine/battle/stat-calculation";
import type { PokemonSpecies } from "@/shared/types/pokemon";
import type { ZoneEncounter, ZoneId } from "@/shared/types/zone";

export interface EncounterResult {
  zoneId: ZoneId;
  pokemon: PokemonSpecies;
  level: number;
  currentHealth: number;
  maximumHealth: number;
}

function getRandomItemByWeight(
  encounters: ZoneEncounter[]
): ZoneEncounter {
  const totalWeight = encounters.reduce(
    (sum, encounter) => sum + encounter.encounterWeight,
    0
  );

  let randomValue = Math.random() * totalWeight;

  for (const encounter of encounters) {
    randomValue -= encounter.encounterWeight;

    if (randomValue <= 0) {
      return encounter;
    }
  }

  return encounters[encounters.length - 1];
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

  const selectedEncounter = getRandomItemByWeight(
    zone.encounters
  );

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

  const maximumHealth = calculateBattleStats(
    pokemon.baseStats,
    level
  ).health;

  return {
    zoneId: zone.id,
    pokemon,
    level,
    currentHealth: maximumHealth,
    maximumHealth,
  };
}