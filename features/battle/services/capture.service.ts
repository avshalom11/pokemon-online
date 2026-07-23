import "server-only";

import { calculateBattleStats } from "@/engine/battle/stat-calculation";
import { rollCapture } from "@/engine/battle/capture";
import { ZONE_DATA } from "@/data/zones/zone-data";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import { prisma } from "@/lib/db/prisma";
import type { ZoneId } from "@/shared/types/zone";

export interface AttemptCaptureParams {
  userId: string;
  zoneId: ZoneId;
  speciesId: string;
  level: number;
  // Client-reported wild HP at the moment of the attempt. There is no
  // persisted battle session to read this from server-side (deliberately —
  // see capture.action.ts's doc comment), so it's trusted for the capture
  // roll itself; everything else about the encounter (species/zone/level
  // validity, max HP) is re-derived server-side below rather than trusted.
  currentHp: number;
}

export type AttemptCaptureResult =
  | { status: "captured"; speciesName: string }
  | { status: "failed" }
  | { status: "invalid-encounter" };

// Server-side capture resolution — the only place the capture RNG
// (rollCapture, engine/battle/capture.ts) is ever invoked, and the only
// place a PlayerPokemon row is created for a captured wild Pokémon. A
// client can trigger this, but never decide its outcome.
export async function attemptCapture(params: AttemptCaptureParams): Promise<AttemptCaptureResult> {
  const zone = ZONE_DATA.find((currentZone) => currentZone.id === params.zoneId);
  const encounterEntry = zone?.encounters.find((encounter) => encounter.pokemonId === params.speciesId);
  const species = getSpeciesById(params.speciesId);

  // Rejects anything that isn't a real encounter for the claimed zone —
  // e.g. a client claiming to capture a species that zone never rolls.
  if (!zone || !encounterEntry || !species) {
    return { status: "invalid-encounter" };
  }

  const level = Math.min(encounterEntry.maximumLevel, Math.max(encounterEntry.minimumLevel, params.level));

  // Never trust a client-sent max HP — recompute it from the same formula
  // the battle screen itself used to derive it.
  const maxHp = calculateBattleStats(species.baseStats, level).health;
  const currentHp = Math.max(0, Math.min(maxHp, params.currentHp));

  const captured = rollCapture({ currentHp, maxHp, rarity: species.rarity });

  if (!captured) {
    return { status: "failed" };
  }

  const profile = await getPlayerProfile(params.userId);

  await prisma.playerPokemon.create({
    data: {
      playerId: profile.id,
      speciesId: species.id,
      level,
      currentHp,
      isStarter: false,
    },
  });

  return { status: "captured", speciesName: species.name };
}
