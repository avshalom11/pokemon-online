import "server-only";

import { canLearnTm } from "@/engine/tm-compatibility";
import { addKnownMove, MAX_KNOWN_MOVES, replaceKnownMove } from "@/engine/known-moves";
import type { KnownMoveOperationFailure } from "@/engine/known-moves";
import { applyKnownMoveMutation, loadKnownMoveSet } from "@/features/known-moves/known-moves-service";
import { getInventoryItemQuantity, removeInventoryItem } from "@/features/inventory/services/inventory.service";
import { getTmCatalogEntryByItemId } from "@/features/tm-system/data/tm-catalog";
import { getTmUseAvailability } from "@/features/tm-system/services/tm-use-availability.service";
import type { TmUseUnavailableReason } from "@/features/tm-system/services/tm-use-availability.service";
import { prisma } from "@/lib/db/prisma";

export type TeachTmResult =
  | {
      status: "success";
      playerPokemonId: string;
      itemId: string;
      moveId: string;
      mode: "added" | "replaced";
      remainingTmQuantity: number;
      declinedPendingMoveLearning: boolean;
    }
  | { status: "invalid-item" }
  | { status: "not-owned" }
  | { status: "unavailable"; reason: TmUseUnavailableReason }
  | { status: "incompatible" }
  | { status: "already-known" }
  | { status: "forget-slot-required" }
  | { status: "insufficient-tm" }
  | KnownMoveOperationFailure;

// Thrown only to unwind prisma.$transaction below when the known-move
// mutation already committed inside this transaction but the TM item
// couldn't actually be consumed — a plain early `return` here would still
// let the transaction commit the known-move write that already ran (Prisma
// only rolls back on a thrown/rejected callback), so this is the same
// "throw a sentinel, translate outside" idiom
// accept-evolution-item.service.ts's own ConcurrentEvolutionItemError
// establishes for exactly this "state already changed earlier in this same
// transaction, but the final step failed" shape of problem. Never surfaced
// past this file.
class TmConsumptionFailedError extends Error {}

// The dedicated Teach-TM service — the only place a TM is ever taught to an
// owned Pokémon. Every fact is re-derived server-side inside one
// transaction (never trusted from the caller): itemId -> moveId always
// resolves against TM_CATALOG (features/tm-system/data/tm-catalog.ts, never
// a client-sent moveId), ownership/availability/compatibility/duplicate
// checks all re-read fresh, and the TM is consumed only after the
// known-move write (add or replace) has actually succeeded — see
// TmConsumptionFailedError above for how "no consume on failure" is
// enforced the other way around (a failed teach never reaches the
// consumption step at all, since a non-success known-move mutation result
// returns immediately, before removeInventoryItem is ever called).
//
// `forgetSlot` is required, and only consulted, when the Pokémon already
// knows MAX_KNOWN_MOVES moves — REQUIREMENT 6: "require caller-selected
// move/slot to forget; replace exactly that move". It is ignored when the
// Pokémon has room to simply learn the move (REQUIREMENT 5).
export async function teachTm(
  playerId: string,
  playerPokemonId: string,
  itemId: string,
  forgetSlot?: number
): Promise<TeachTmResult> {
  const catalogEntry = getTmCatalogEntryByItemId(itemId);
  if (!catalogEntry) {
    return { status: "invalid-item" };
  }
  const { moveId } = catalogEntry;

  try {
    return await prisma.$transaction(async (tx) => {
      const pokemon = await tx.playerPokemon.findUnique({ where: { id: playerPokemonId } });
      if (!pokemon || pokemon.playerId !== playerId) {
        return { status: "not-owned" as const };
      }

      const availability = await getTmUseAvailability(tx, playerId, playerPokemonId);
      if (availability.status === "unavailable") {
        return { status: "unavailable" as const, reason: availability.reason };
      }

      if (!canLearnTm(pokemon.speciesId, moveId)) {
        return { status: "incompatible" as const };
      }

      const currentKnownMoves = await loadKnownMoveSet(tx, playerPokemonId);
      if (currentKnownMoves.some((move) => move.moveId === moveId)) {
        return { status: "already-known" as const };
      }

      let mode: "added" | "replaced";
      let mutationResult;

      if (currentKnownMoves.length < MAX_KNOWN_MOVES) {
        mode = "added";
        mutationResult = await applyKnownMoveMutation(tx, playerPokemonId, (current) => addKnownMove(current, moveId));
      } else {
        if (forgetSlot === undefined) {
          return { status: "forget-slot-required" as const };
        }
        mode = "replaced";
        mutationResult = await applyKnownMoveMutation(tx, playerPokemonId, (current) => replaceKnownMove(current, forgetSlot, moveId));
      }

      if (mutationResult.status !== "success") {
        return mutationResult;
      }

      // REQUIREMENT — pending move learning: a level-up learn opportunity
      // for this exact move, still awaiting the player's own decision, must
      // never be offered again once the move has been taught via TM (it
      // would otherwise let the same move be "learned" a second time via
      // the level-up decision UI). Marked "declined" — the same permanent,
      // never-deleted historical status move-learning-service.ts's own
      // declinePendingMove already uses — never "learned" (no Known Move
      // slot is attributed to the level-up path here) and never deleted.
      // Done inline against `tx` (find-then-update by id, never updateMany:
      // the real schema's own @@unique([playerPokemonId, moveId, status])
      // guarantees at most one "pending" row can ever exist for this exact
      // pair) rather than calling declinePendingMove (which opens its own
      // separate prisma.$transaction) so this stays part of the SAME atomic
      // write as the known-move mutation and the TM consumption below.
      const existingPending = await tx.playerPendingMoveLearning.findFirst({
        where: { playerPokemonId, moveId, status: "pending" },
      });
      if (existingPending) {
        await tx.playerPendingMoveLearning.update({
          where: { id: existingPending.id },
          data: { status: "declined", resolvedAt: new Date() },
        });
      }

      const consumed = await removeInventoryItem(tx, playerId, itemId, 1);
      if (!consumed) {
        throw new TmConsumptionFailedError();
      }

      const remainingTmQuantity = await getInventoryItemQuantity(tx, playerId, itemId);

      return {
        status: "success" as const,
        playerPokemonId,
        itemId,
        moveId,
        mode,
        remainingTmQuantity,
        declinedPendingMoveLearning: existingPending !== null,
      };
    });
  } catch (error) {
    if (error instanceof TmConsumptionFailedError) {
      return { status: "insufficient-tm" };
    }
    throw error;
  }
}
