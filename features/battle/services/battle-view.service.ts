import "server-only";

import { getMoveById } from "@/engine/moves";
import type { MoveCategory, MoveType } from "@/engine/moves";
import { getOrStartBattle } from "@/features/battle-session/services/battle-session.service";
import { getKnownMoves } from "@/features/known-moves/known-moves-queries";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import { getZoneFrontSpriteUrls, type EncounterResult } from "@/engine/encounter/pokemon-encounter-engine";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import { toRegionId } from "@/shared/types/region";
import type { ZoneId } from "@/shared/types/zone";

// Phase 5A: one resolved Known Move slot, ready for battle display —
// PlayerPokemon -> Known Moves (features/known-moves) -> Move Registry
// (engine/moves), exactly the pipeline the phase spec calls for. Nothing
// here duplicates Move data; every display field is read straight off the
// registry's own Move at view-assembly time.
export interface BattleKnownMoveSlot {
  slot: number;
  moveId: string;
  name: string;
  type: MoveType;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
}

export interface BattleViewData {
  wild: EncounterResult;
  party: OwnedPokemon[];
  activePokemonId: string;
  // Every party member's Known Moves, resolved once up front (not just the
  // active one) — the active Pokémon can change mid-battle via switch
  // (unchanged, existing feature), and the move panel must always reflect
  // whichever Pokémon is currently active without a second fetch.
  knownMovesByPokemonId: Record<string, BattleKnownMoveSlot[]>;
  // The authenticated trainer's own display name (PlayerProfile.displayName
  // — the same value the global header and My Pokémon already show
  // elsewhere as "the player's name"), threaded down so BattleContent's
  // capture message never hardcodes a username.
  playerName: string;
  // Every front-sprite URL this zone could ever roll (see
  // getZoneFrontSpriteUrls) — resolved server-side from the static
  // zone/species catalogs so the client never needs to import them itself
  // just to preload images. BattleContent warms the browser's image cache
  // with these at idle time so a new wild encounter's sprite is already
  // cached by the time it's revealed.
  zonePreloadSpriteUrls: string[];
}

// Resolves one Pokémon's Known Moves against the Move Registry, preserving
// slot order (getKnownMoves already sorts by slot ascending; re-sorted here
// too as a defensive guarantee — "never reorder moves" per the phase spec).
// A moveId with no matching registry entry is dropped rather than crashing
// the whole battle view — same "invalid data never breaks a read" precedent
// every other -view.service.ts in this project already follows.
export async function resolveKnownMoveSlots(playerPokemonId: string): Promise<BattleKnownMoveSlot[]> {
  const knownMoves = await getKnownMoves(playerPokemonId);

  return knownMoves
    .flatMap((known) => {
      const move = getMoveById(known.moveId);
      if (!move) return [];
      return [
        {
          slot: known.slot,
          moveId: known.moveId,
          name: move.name,
          type: move.type,
          category: move.category,
          power: move.power,
          accuracy: move.accuracy,
        },
      ];
    })
    .sort((a, b) => a.slot - b.slot);
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
  // Phase 4 — resolved once here (profile is already fetched for
  // playerName below; getPlayerProfile is cache()-wrapped either way) and
  // threaded into every region-aware call below, so this page can never
  // roll a different region's encounter pool than the one
  // app/(game)/battle/page.tsx's own region gate already validated.
  const regionId = toRegionId(profile.regionId);
  const result = await getOrStartBattle(profile.id, zoneId, regionId);

  if (result.status !== "ready") {
    return result;
  }

  const { party } = result.battle;
  const resolvedMoves = await Promise.all(party.map((pokemon) => resolveKnownMoveSlots(pokemon.id)));
  const knownMovesByPokemonId = Object.fromEntries(party.map((pokemon, index) => [pokemon.id, resolvedMoves[index]]));

  return {
    status: "ready",
    data: {
      wild: result.battle.wild,
      party,
      activePokemonId: result.battle.activePokemonId,
      knownMovesByPokemonId,
      playerName: profile.displayName,
      zonePreloadSpriteUrls: getZoneFrontSpriteUrls(regionId, zoneId),
    },
  };
}
