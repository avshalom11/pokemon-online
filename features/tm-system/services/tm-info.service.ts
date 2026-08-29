import "server-only";

import { getMoveById } from "@/engine/moves";
import type { MoveCategory, MoveType } from "@/engine/moves";
import { canLearnTm } from "@/engine/tm-compatibility";
import { getKnownMoves } from "@/features/known-moves/known-moves-queries";
import { hydrateOwnedPokemonRows } from "@/features/pokemon/services/player-pokemon";
import { getTmCatalogEntryByItemId } from "@/features/tm-system/data/tm-catalog";
import { getTmUseAvailability } from "@/features/tm-system/services/tm-use-availability.service";
import type { TmUseUnavailableReason } from "@/features/tm-system/services/tm-use-availability.service";
import { prisma } from "@/lib/db/prisma";
import type { PokemonSpecies } from "@/shared/types/pokemon";

export interface TmInfoCompatiblePokemon {
  playerPokemonId: string;
  nickname: string | null;
  level: number;
  species: PokemonSpecies;
  // Whether this exact Pokémon already knows the move — shown as a label
  // ("כבר מכיר"), never used to hide it from this informational list
  // (unlike features/tm-system/services/tm-use-eligibility.service.ts's
  // getTmUseCandidates, which excludes an already-known move entirely
  // because that list is the real "can I use this TM right now" gate).
  alreadyKnowsMove: boolean;
  // Same Daycare/battle/Marketplace-lock facts getTmUseAvailability
  // already computes — shown here purely as an optional status label,
  // never a filter: an owned, compatible Pokémon is always listed
  // regardless of this value.
  unavailableReason: TmUseUnavailableReason | null;
}

export type TmInfoResult =
  | { status: "invalid-item" }
  | {
      status: "ok";
      moveId: string;
      moveName: string;
      moveType?: MoveType;
      moveCategory?: MoveCategory;
      movePower: number | null;
      moveAccuracy: number | null;
      compatiblePokemon: TmInfoCompatiblePokemon[];
    };

// TM SYSTEM UI POLISH — the Shop/Inventory "?" info dialog's own data
// source. Deliberately NOT tm-use-eligibility.service.ts's
// getTmUseCandidates: that function is the real "can I use this TM right
// now" gate (excludes an already-known move, and anything Daycare/battle/
// Marketplace-locked). This is a purely INFORMATIONAL "which of my
// Pokémon are authentically compatible with this move at all" view —
// canLearnTm (species/form compatibility) is the only real filter here.
// Every owned Pokémon is considered regardless of party membership,
// Daycare, battle, or Marketplace-lock status; "already knows the move"
// and "currently locked" are both surfaced as labels, never used to hide
// an otherwise-compatible Pokémon.
export async function getTmInfo(playerId: string, itemId: string): Promise<TmInfoResult> {
  const catalogEntry = getTmCatalogEntryByItemId(itemId);
  if (!catalogEntry) {
    return { status: "invalid-item" };
  }
  const { moveId } = catalogEntry;
  const move = getMoveById(moveId);
  const moveName = move?.name ?? moveId;

  // Every owned Pokémon, unconditionally — the same raw rows
  // getAllOwnedPokemon (features/pokemon/services/player-pokemon.ts) reads,
  // MINUS that function's own Daycare-exclusion filter, which this
  // informational view must never apply (a Pokémon currently in Daycare is
  // still an owned, compatible Pokémon for the purposes of "can it learn
  // this move"). hydrateOwnedPokemonRows is that same module's own
  // exported row -> OwnedPokemon mapping, reused as-is — never
  // reimplemented here.
  const rows = await prisma.playerPokemon.findMany({
    where: { playerId },
    orderBy: [{ isStarter: "desc" }, { createdAt: "asc" }],
  });
  const ownedPokemon = hydrateOwnedPokemonRows(rows);

  const compatiblePokemon: TmInfoCompatiblePokemon[] = [];

  for (const pokemon of ownedPokemon) {
    // RULE — never inferred from type, from a related/evolved species, or
    // from what "seems logical": canLearnTm is the one and only source of
    // truth, keyed by this exact species/form id, exactly like the actual
    // teach-TM flow uses.
    if (!canLearnTm(pokemon.species.id, moveId)) continue;

    const [knownMoveRows, availability] = await Promise.all([
      getKnownMoves(pokemon.id),
      getTmUseAvailability(prisma, playerId, pokemon.id),
    ]);

    compatiblePokemon.push({
      playerPokemonId: pokemon.id,
      nickname: pokemon.nickname ?? null,
      level: pokemon.level,
      species: pokemon.species,
      alreadyKnowsMove: knownMoveRows.some((known) => known.moveId === moveId),
      unavailableReason: availability.status === "unavailable" ? availability.reason : null,
    });
  }

  return {
    status: "ok",
    moveId,
    moveName,
    moveType: move?.type,
    moveCategory: move?.category,
    movePower: move?.power ?? null,
    moveAccuracy: move?.accuracy ?? null,
    compatiblePokemon,
  };
}
