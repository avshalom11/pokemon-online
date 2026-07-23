"use server";

import { startPokemonEncounter, type EncounterResult } from "@/engine/encounter/pokemon-encounter-engine";
import { getCurrentSession } from "@/lib/auth/auth-session";
import type { ZoneId } from "@/shared/types/zone";

// Thin server-side wrapper around the existing, unmodified
// startPokemonEncounter — kept server-side (rather than called directly
// from the client, even though the function itself is pure/side-effect-free)
// for the same reason capture's RNG is server-side: defense in depth, no
// gameplay-relevant weight tables shipped to the client bundle. This is the
// "reusable encounter reset" entry point BattleContent calls every time a
// wild Pokémon is defeated and the same-zone loop continues.
export async function getNextEncounterAction(zoneId: ZoneId): Promise<EncounterResult | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  return startPokemonEncounter(zoneId);
}
