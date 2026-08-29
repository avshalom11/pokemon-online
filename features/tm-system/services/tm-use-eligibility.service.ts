import "server-only";

import { getMoveById } from "@/engine/moves";
import type { MoveCategory, MoveType } from "@/engine/moves";
import { MAX_KNOWN_MOVES } from "@/engine/known-moves";
import { canLearnTm } from "@/engine/tm-compatibility";
import { getKnownMoves } from "@/features/known-moves/known-moves-queries";
import { getAllOwnedPokemon } from "@/features/pokemon/services/player-pokemon";
import { getTmCatalogEntryByItemId } from "@/features/tm-system/data/tm-catalog";
import { getTmUseAvailability } from "@/features/tm-system/services/tm-use-availability.service";
import { prisma } from "@/lib/db/prisma";
import type { PokemonSpecies } from "@/shared/types/pokemon";

export interface TmUseKnownMoveSlot {
  slot: number;
  moveId: string;
  moveName: string;
  type?: MoveType;
  category?: MoveCategory;
  power: number | null;
  accuracy: number | null;
}

// STEP 3/4 — one eligible candidate: already passed canLearnTm, does NOT
// already know the move, and is currently available for TM use (not in
// Daycare/battle/a Marketplace listing). Every OTHER owned Pokémon is
// simply absent from this list — never included with an "incompatible"
// flag for the UI to filter — per this feature's own "do not show
// incompatible Pokémon at all" rule.
export interface TmUseCandidate {
  playerPokemonId: string;
  nickname: string | null;
  level: number;
  // The full resolved species/form (never just an id/name pair) — same
  // "carry the whole PokemonSpecies so the UI can render a sprite without a
  // second lookup" shape features/evolution/services/
  // evolution-item-eligibility.ts's own EvolutionItemCandidate.currentSpecies
  // already establishes.
  species: PokemonSpecies;
  // Sorted by slot — the exact 4 (or fewer) moves the "choose one to
  // forget" UI needs, resolved from the static move registry, never a
  // second/duplicated move fact.
  knownMoves: TmUseKnownMoveSlot[];
  // false exactly when knownMoves.length === MAX_KNOWN_MOVES — the UI's own
  // signal for whether a forgetSlot choice is required before confirming.
  hasRoom: boolean;
}

export type TmUseCandidatesResult =
  | { status: "invalid-item" }
  | {
      status: "ok";
      moveId: string;
      moveName: string;
      // The TM's own move stats, resolved once here (never re-derived by
      // the client) so TmForgetMoveDialog's "new move" info box can show
      // them the exact same way MoveLearningDecisionDialog already does
      // for a level-up learn.
      moveType?: MoveType;
      moveCategory?: MoveCategory;
      movePower: number | null;
      moveAccuracy: number | null;
      candidates: TmUseCandidate[];
    };

// The Inventory "use this TM" panel's own eligibility source — mirrors
// features/evolution/services/evolution-item-eligibility.ts's role (filter
// this player's owned Pokémon down to who this exact item can affect), but
// unlike that pure/client-callable filter, this one needs real per-Pokémon
// DB reads (current Known Moves, live availability) so it is server-only
// and takes playerId directly rather than an already-resolved
// OwnedPokemon[] prop — the client never gets to supply its own idea of
// "which Pokémon exist" for this authoritative check.
export async function getTmUseCandidates(playerId: string, itemId: string): Promise<TmUseCandidatesResult> {
  const catalogEntry = getTmCatalogEntryByItemId(itemId);
  if (!catalogEntry) {
    return { status: "invalid-item" };
  }
  const { moveId } = catalogEntry;
  const move = getMoveById(moveId);
  const moveName = move?.name ?? moveId;

  const ownedPokemon = await getAllOwnedPokemon(playerId);
  const candidates: TmUseCandidate[] = [];

  for (const pokemon of ownedPokemon) {
    // RULE — never inferred from type, from a related/evolved species, or
    // from what "seems logical": canLearnTm is the one and only source of
    // truth here, keyed by this exact species/form id.
    if (!canLearnTm(pokemon.species.id, moveId)) continue;

    const knownMoveRows = await getKnownMoves(pokemon.id);
    if (knownMoveRows.some((move) => move.moveId === moveId)) continue;

    // Same Daycare/battle/Marketplace-lock checks teachTm itself re-runs
    // inside its own transaction at confirm time — computed here too so
    // the panel never even offers a Pokémon the server would reject a
    // moment later. teachTm remains the sole source of truth: this is a
    // read-only precomputation for display, never a substitute for its own
    // re-check.
    const availability = await getTmUseAvailability(prisma, playerId, pokemon.id);
    if (availability.status !== "available") continue;

    const knownMoves = [...knownMoveRows]
      .sort((a, b) => a.slot - b.slot)
      .map((move) => {
        const resolved = getMoveById(move.moveId);
        return {
          slot: move.slot,
          moveId: move.moveId,
          moveName: resolved?.name ?? move.moveId,
          type: resolved?.type,
          category: resolved?.category,
          power: resolved?.power ?? null,
          accuracy: resolved?.accuracy ?? null,
        };
      });

    candidates.push({
      playerPokemonId: pokemon.id,
      nickname: pokemon.nickname ?? null,
      level: pokemon.level,
      species: pokemon.species,
      knownMoves,
      hasRoom: knownMoves.length < MAX_KNOWN_MOVES,
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
    candidates,
  };
}
