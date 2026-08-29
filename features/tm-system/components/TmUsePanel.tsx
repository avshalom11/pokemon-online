"use client";

import { useEffect, useState, useTransition } from "react";

import { SpriteImage } from "@/components/media/SpriteImage";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { getTmUseCandidatesAction, teachTmAction } from "@/features/tm-system/actions/tm-use.actions";
import { TmForgetMoveDialog } from "@/features/tm-system/components/TmForgetMoveDialog";
import { TmUseConfirmDialog } from "@/features/tm-system/components/TmUseConfirmDialog";
import {
  noEligibleTmPokemonMessage,
  tmUseErrorMessage,
  tmUseLoadingMessage,
  tmUsePanelTitle,
  tmUseSuccessMessage,
} from "@/features/tm-system/messages/tm-use-messages";
import type { TmUseCandidate } from "@/features/tm-system/services/tm-use-eligibility.service";
import type { ShopItem } from "@/features/shop/types/shop.types";

interface TmUsePanelProps {
  item: ShopItem;
}

interface TmMoveInfo {
  moveName: string;
  moveType?: string;
  moveCategory?: string;
  movePower: number | null;
  moveAccuracy: number | null;
}

// TM SYSTEM PHASE 5 — appears under InventorySellPanel whenever a TM item
// (categoryId "tms") is selected in the Inventory (see InventoryContent),
// same wiring point EvolutionItemPanel already uses for "stones". Unlike
// that panel (which filters an already-in-props OwnedPokemon[] purely
// client-side, with no DB cost of its own), eligibility here needs real
// per-Pokémon reads (current Known Moves, live Daycare/battle/Marketplace
// availability) — so it's fetched via a Server Action on mount/selection
// change, same "useEffect + startTransition + server action" idiom
// PendingMoveLearningPanel (features/pokemon/components/) already
// establishes, rather than EvolutionItemPanel's synchronous prop-filter
// shape. The server (teachTm) re-validates everything from scratch at
// confirm time regardless — this panel's own eligibility fetch is only
// ever a precomputed VIEW, never trusted as the actual authorization.
export function TmUsePanel({ item }: TmUsePanelProps) {
  const [moveInfo, setMoveInfo] = useState<TmMoveInfo | null>(null);
  const [candidates, setCandidates] = useState<TmUseCandidate[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [selectedCandidate, setSelectedCandidate] = useState<TmUseCandidate | null>(null);
  const [selectedForgetSlot, setSelectedForgetSlot] = useState<number | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCandidates(null);
    setLoadError(false);
    setSelectedCandidate(null);
    setSelectedForgetSlot(null);
    setConfirmError(null);

    startTransition(async () => {
      const result = await getTmUseCandidatesAction(item.id);
      if (result.status !== "ok") {
        setLoadError(true);
        return;
      }
      setMoveInfo({
        moveName: result.moveName,
        moveType: result.moveType,
        moveCategory: result.moveCategory,
        movePower: result.movePower,
        moveAccuracy: result.moveAccuracy,
      });
      setCandidates(result.candidates);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  function handleSelectCandidate(candidate: TmUseCandidate) {
    setSelectedCandidate(candidate);
    setSelectedForgetSlot(null);
    setConfirmError(null);
    setSuccessMessage(null);
  }

  function handleCancel() {
    setSelectedCandidate(null);
    setSelectedForgetSlot(null);
    setConfirmError(null);
  }

  function handleConfirm() {
    if (!selectedCandidate) return;
    if (!selectedCandidate.hasRoom && selectedForgetSlot === null) return;

    setConfirmError(null);

    startTransition(async () => {
      const result = await teachTmAction(selectedCandidate.playerPokemonId, item.id, selectedForgetSlot ?? undefined);

      if (result.status === "success") {
        const pokemonName = selectedCandidate.nickname ?? selectedCandidate.species.name;
        setSuccessMessage(tmUseSuccessMessage(pokemonName, moveInfo?.moveName ?? result.moveId));
        setSelectedCandidate(null);
        setSelectedForgetSlot(null);
        // The taught Pokémon is no longer eligible for this exact TM (it
        // now knows the move) — reflected immediately without waiting for
        // a full refetch, same "optimistic local update" convention every
        // other Inventory sell flow already follows.
        setCandidates((current) => (current ? current.filter((c) => c.playerPokemonId !== selectedCandidate.playerPokemonId) : current));
        return;
      }

      setConfirmError(tmUseErrorMessage(result.status));
    });
  }

  return (
    <div dir="rtl" className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-slate-200">{tmUsePanelTitle(item.name)}</h3>

      {loadError ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400">
          אירעה שגיאה בטעינת הפוקימונים הזמינים, נסה שוב.
        </p>
      ) : candidates === null ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-slate-500">
          {tmUseLoadingMessage}
        </p>
      ) : candidates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-slate-500">
          {noEligibleTmPokemonMessage}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {candidates.map((candidate) => {
            const displayName = candidate.nickname ?? candidate.species.name;

            return (
              <button
                key={candidate.playerPokemonId}
                type="button"
                onClick={() => handleSelectCandidate(candidate)}
                disabled={isPending}
                className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-2 text-center transition-all hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-slate-900/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SpriteImage
                  src={getFrontSpritePath(candidate.species)}
                  alt={displayName}
                  className="h-12 w-12 object-contain"
                  fallbackClassName="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
                />
                <span className="truncate text-[11px] font-semibold text-slate-100">{displayName}</span>
                <span className="text-[10px] text-slate-400">
                  Lv.{candidate.level} · {candidate.species.name}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {successMessage ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
          {successMessage}
        </p>
      ) : null}

      {selectedCandidate && selectedCandidate.hasRoom ? (
        <TmUseConfirmDialog
          species={selectedCandidate.species}
          nickname={selectedCandidate.nickname}
          moveName={moveInfo?.moveName ?? item.name}
          isSubmitting={isPending}
          errorMessage={confirmError}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ) : null}

      {selectedCandidate && !selectedCandidate.hasRoom ? (
        <TmForgetMoveDialog
          pokemonName={selectedCandidate.nickname ?? selectedCandidate.species.name}
          moveName={moveInfo?.moveName ?? item.name}
          moveType={moveInfo?.moveType}
          moveCategory={moveInfo?.moveCategory}
          movePower={moveInfo?.movePower ?? null}
          moveAccuracy={moveInfo?.moveAccuracy ?? null}
          knownMoves={selectedCandidate.knownMoves}
          selectedSlot={selectedForgetSlot}
          onSelectSlot={setSelectedForgetSlot}
          isSubmitting={isPending}
          errorMessage={confirmError}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ) : null}
    </div>
  );
}
