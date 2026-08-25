import "server-only";

import { getMoveById } from "@/engine/moves";
import type { MoveCategory, MoveType } from "@/engine/moves";
import { getKnownMoves } from "@/features/known-moves/known-moves-queries";
import { getFirstPendingMoveLearningPlayerPokemonId, getNextPendingMove } from "@/features/move-learning/move-learning-queries";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { prisma } from "@/lib/db/prisma";

// MOVE LEARNING UX — comparison stats for one move, read straight off the
// static Move Registry at view-assembly time (never duplicated/reformatted
// beyond what the UI needs to print them) — same "resolve display fields
// from engine/moves, once, server-side" precedent
// features/battle/services/battle-view.service.ts's BattleKnownMoveSlot
// already establishes for the in-battle attack panel. type/category
// undefined and power/accuracy null exactly when the moveId doesn't
// resolve against the registry (should never happen for a real Known
// Move/pending row, but never crashes the view either way) — mirrors
// shared/types/battle-ui.ts's BattleAttackSlot's own optional/nullable
// shape so the two UIs stay consistent.
export interface PendingMoveLearningViewSlot {
  slot: number;
  moveId: string;
  moveName: string;
  type?: MoveType;
  category?: MoveCategory;
  power: number | null;
  accuracy: number | null;
}

export interface PendingMoveLearningViewPending {
  id: string;
  moveId: string;
  moveName: string;
  learnedAtLevel: number;
  type?: MoveType;
  category?: MoveCategory;
  power: number | null;
  accuracy: number | null;
}

export interface PendingMoveLearningView {
  // FIELD BATTLE MOVE LEARNING — the owning Pokémon's own display name
  // (nickname, falling back to species name — same precedent every other
  // Known-Moves/party surface already uses, e.g. PokemonCard.tsx's
  // `pokemon.nickname ?? pokemon.species.name`), resolved here once,
  // server-side, so MoveLearningDecisionDialog never has to hardcode it or
  // re-derive it from a second prop.
  pokemonName: string;
  knownMoves: PendingMoveLearningViewSlot[];
  nextPending: PendingMoveLearningViewPending | null;
}

// The account-wide counterpart below (getFirstPendingMoveLearningView)
// additionally needs to say WHICH owned Pokémon this decision belongs to
// — the per-Pokémon view above never needed that field since its one
// caller (the My Pokémon detail panel) already has it as its own prop.
export interface PendingMoveLearningPromptView extends PendingMoveLearningView {
  playerPokemonId: string;
}

// Assembles exactly what the "learn or decline a pending move" UI needs
// for one owned Pokémon: its current Known Moves in slot order (so the
// player can pick which one to replace) and the single next unresolved
// Pending Move decision, if any — never more than one at a time (Phase 4E:
// "Always resolve them in creation order"). Move names/type/category/
// power/accuracy are all resolved from the static move registry, never
// stored redundantly.
export async function getPendingMoveLearningView(playerPokemonId: string): Promise<PendingMoveLearningView> {
  const [knownMoves, nextPending, pokemon] = await Promise.all([
    getKnownMoves(playerPokemonId),
    getNextPendingMove(playerPokemonId),
    prisma.playerPokemon.findUnique({ where: { id: playerPokemonId } }),
  ]);

  const pokemonName = pokemon ? (pokemon.nickname ?? getSpeciesById(pokemon.speciesId)?.name ?? pokemon.speciesId) : "";

  return {
    pokemonName,
    knownMoves: knownMoves
      .slice()
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
      }),
    nextPending: nextPending
      ? (() => {
          const resolved = getMoveById(nextPending.moveId);
          return {
            id: nextPending.id,
            moveId: nextPending.moveId,
            moveName: resolved?.name ?? nextPending.moveId,
            learnedAtLevel: nextPending.learnedAtLevel,
            type: resolved?.type,
            category: resolved?.category,
            power: resolved?.power ?? null,
            accuracy: resolved?.accuracy ?? null,
          };
        })()
      : null,
  };
}

// MOVE LEARNING UX — the Home-page safety net for a pending move-learning
// decision, same role as features/evolution/queries/evolution-queries.ts's
// getFirstPendingEvolutionView: makes an unresolved decision resurface in
// the UI again after a refresh/navigation away, regardless of which owned
// Pokémon it belongs to. Returns null both when there's genuinely nothing
// pending for this player, AND (defensively) if the resolved Pokémon
// somehow has no next-pending row by the time this reads it (a race with
// another resolution) — never a partial/broken prompt.
export async function getFirstPendingMoveLearningView(playerId: string): Promise<PendingMoveLearningPromptView | null> {
  const playerPokemonId = await getFirstPendingMoveLearningPlayerPokemonId(playerId);
  if (!playerPokemonId) return null;

  const view = await getPendingMoveLearningView(playerPokemonId);
  if (!view.nextPending) return null;

  return { ...view, playerPokemonId };
}
