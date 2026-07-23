import "server-only";

import { startPokemonEncounter, type EncounterResult } from "@/engine/encounter/pokemon-encounter-engine";
import { getFirstUsableMember, hasUsableMember, isUsable } from "@/features/party/utils/party-rules";
import { getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import type { ZoneId } from "@/shared/types/zone";

export interface BattleViewData {
  wild: EncounterResult;
  party: OwnedPokemon[];
  activePokemonId: string;
}

// Assembled server-side so app/battle/page.tsx stays a thin display layer,
// mirroring home-data.service.ts / my-pokemon-view.service.ts. The wild
// encounter is generated fresh per request via the existing, unmodified
// startPokemonEncounter (engine/encounter/pokemon-encounter-engine.ts).
//
// The active Pokémon is party slot 1 (getPlayerParty is now ordered by the
// persisted partySlot column, so party[0] is whichever Pokémon occupies the
// lowest slot — normally slot 1) if it's usable, otherwise the first usable
// member by slot order. Returns null when nobody in the party is usable
// (HP > 0) — a battle must never start with a fully-fainted party.
// app/battle/page.tsx redirects to /map with a "needs healing" notice in
// that case.
export async function getBattleViewData(userId: string, zoneId: ZoneId): Promise<BattleViewData | null> {
  const profile = await getPlayerProfile(userId);
  const party = await getPlayerParty(profile.id);

  if (!hasUsableMember(party)) {
    return null;
  }

  const starter = party[0];
  const activePokemon = isUsable(starter) ? starter : getFirstUsableMember(party)!;
  const wild = startPokemonEncounter(zoneId);

  return { wild, party, activePokemonId: activePokemon.id };
}
