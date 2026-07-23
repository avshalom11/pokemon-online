import "server-only";

import { getOrStartBattle } from "@/features/battle-session/services/battle-session.service";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { EncounterResult } from "@/engine/encounter/pokemon-encounter-engine";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import type { ZoneId } from "@/shared/types/zone";

export interface BattleViewData {
  wild: EncounterResult;
  party: OwnedPokemon[];
  activePokemonId: string;
  // The authenticated trainer's own display name (PlayerProfile.displayName
  // — the same value HomeHeader/My Pokémon/Pokémon Center already show
  // everywhere else as "the player's name"), threaded down so
  // BattleContent's capture message never hardcodes a username.
  playerName: string;
}

export type BattleViewResult =
  | { status: "ready"; data: BattleViewData }
  // The player already has an active session for a *different* zone —
  // app/battle/page.tsx redirects there instead of trusting the requested
  // zone (see getOrStartBattle's own doc comment).
  | { status: "redirect"; zoneId: ZoneId }
  | { status: "no-usable-party" };

// Assembled server-side so app/battle/page.tsx stays a thin display layer,
// mirroring home-data.service.ts / my-pokemon-view.service.ts. The actual
// "restore existing session, or start a new one" logic lives in
// features/battle-session/services/battle-session.service.ts — this is
// just the per-page assembler that adds the display-only playerName field
// on top, same role assign-slot/view services elsewhere already play.
export async function getBattleViewData(userId: string, zoneId: ZoneId): Promise<BattleViewResult> {
  const profile = await getPlayerProfile(userId);
  const result = await getOrStartBattle(profile.id, zoneId);

  if (result.status !== "ready") {
    return result;
  }

  return {
    status: "ready",
    data: {
      wild: result.battle.wild,
      party: result.battle.party,
      activePokemonId: result.battle.activePokemonId,
      playerName: profile.displayName,
    },
  };
}
