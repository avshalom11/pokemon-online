"use client";

import { useState, useTransition } from "react";

import { StoneEvolutionConfirmDialog } from "@/features/evolution/components/StoneEvolutionConfirmDialog";
import { acceptStoneEvolutionAction } from "@/features/evolution/actions/evolution.actions";
import { noEligibleStonePokemonMessage } from "@/features/evolution/messages/evolution-messages";
import { getStoneEvolutionCandidates, type StoneEvolutionCandidate } from "@/features/evolution/services/stone-evolution-eligibility";
import { SpriteImage } from "@/components/media/SpriteImage";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import type { ShopItem } from "@/features/shop/types/shop.types";

interface StoneEvolutionPanelProps {
  stone: ShopItem;
  ownedPokemon: OwnedPokemon[];
}

// Appears under InventorySellPanel whenever a Stone is selected in the
// Inventory (see InventoryContent) — never for any other category. Filters
// the player's full owned-Pokémon list (party AND storage — see
// getAllOwnedPokemon) down to exactly the species this one stone can evolve
// (getStoneEvolutionCandidates), then opens the same-styled confirmation
// dialog level evolution uses (StoneEvolutionConfirmDialog) once a specific
// Pokémon is chosen. Selling this same stone is entirely unaffected — that
// stays InventorySellPanel/InventorySellConfirmDialog's own flow, untouched.
export function StoneEvolutionPanel({ stone, ownedPokemon }: StoneEvolutionPanelProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<StoneEvolutionCandidate | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  const candidates = getStoneEvolutionCandidates(stone.id, ownedPokemon);

  function handleSelectCandidate(candidate: StoneEvolutionCandidate) {
    setSelectedCandidate(candidate);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function handleCancel() {
    // Cancelling is never a permanent rejection — no server call is ever
    // made here, so the stone and the Pokémon are both left exactly as they
    // were; the player may pick the same (or another) Pokémon again later
    // while still owning this stone.
    setSelectedCandidate(null);
    setErrorMessage(null);
  }

  function handleConfirm() {
    if (!selectedCandidate) return;

    startTransition(async () => {
      const result = await acceptStoneEvolutionAction(selectedCandidate.playerPokemonId, stone.id);

      if (result.status === "success") {
        setSelectedCandidate(null);
        setSuccessMessage(`${result.oldSpeciesName} התפתח ל־${result.newSpeciesName}!`);
        return;
      }

      if (result.status === "insufficient-stone") {
        setErrorMessage("אין לך מספיק אבנים מסוג זה.");
      } else if (result.status === "already-evolved") {
        setErrorMessage("הפוקימון כבר התפתח.");
      } else {
        setErrorMessage("אירעה שגיאה, נסה שוב.");
      }
    });
  }

  return (
    <div dir="rtl" className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-slate-200">בחר פוקימון להתפתחות באמצעות {stone.name}</h3>

      {candidates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-slate-500">
          {noEligibleStonePokemonMessage}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {candidates.map((candidate) => {
            const displayName = candidate.nickname ?? candidate.currentSpecies.name;

            return (
              <button
                key={candidate.playerPokemonId}
                type="button"
                onClick={() => handleSelectCandidate(candidate)}
                className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-2 text-center transition-all hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-slate-900/80"
              >
                <SpriteImage
                  src={getFrontSpritePath(candidate.currentSpecies.dexNumber)}
                  alt={displayName}
                  className="h-12 w-12 object-contain"
                  fallbackClassName="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
                />
                <span className="truncate text-[11px] font-semibold text-slate-100">{displayName}</span>
                <span className="text-[10px] text-slate-400">
                  Lv.{candidate.level} · {candidate.currentSpecies.name}
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

      {selectedCandidate ? (
        <StoneEvolutionConfirmDialog
          candidate={selectedCandidate}
          stoneName={stone.name}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ) : null}
    </div>
  );
}
