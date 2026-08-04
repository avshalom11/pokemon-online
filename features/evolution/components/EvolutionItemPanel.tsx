"use client";

import { useState, useTransition } from "react";

import { EvolutionItemConfirmDialog } from "@/features/evolution/components/EvolutionItemConfirmDialog";
import { acceptEvolutionItemAction } from "@/features/evolution/actions/evolution.actions";
import { noEligibleEvolutionItemPokemonMessage } from "@/features/evolution/messages/evolution-messages";
import { getEvolutionItemCandidates, type EvolutionItemCandidate } from "@/features/evolution/services/evolution-item-eligibility";
import { SpriteImage } from "@/components/media/SpriteImage";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import type { ShopItem } from "@/features/shop/types/shop.types";

interface EvolutionItemPanelProps {
  item: ShopItem;
  ownedPokemon: OwnedPokemon[];
}

// Appears under InventorySellPanel whenever an Evolution Item (a Stone, or
// a former Trade-item like King's Rock/Metal Coat/Dragon Scale/Upgrade — see
// data/pokemon/pokemon-evolutions.ts's EVOLUTION_ITEM_EVOLUTIONS) is
// selected in the Inventory (see InventoryContent) — never for any other
// category. Filters the player's full owned-Pokémon list (party AND
// storage — see getAllOwnedPokemon) down to exactly the species this one
// item can evolve (getEvolutionItemCandidates), then opens the same-styled
// confirmation dialog level evolution uses (EvolutionItemConfirmDialog)
// once a specific Pokémon is chosen. Selling this same item is entirely
// unaffected — that stays InventorySellPanel/InventorySellConfirmDialog's
// own flow, untouched. No trade of any kind is ever involved in this flow.
export function EvolutionItemPanel({ item, ownedPokemon }: EvolutionItemPanelProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<EvolutionItemCandidate | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  const candidates = getEvolutionItemCandidates(item.id, ownedPokemon);

  function handleSelectCandidate(candidate: EvolutionItemCandidate) {
    setSelectedCandidate(candidate);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function handleCancel() {
    // Cancelling is never a permanent rejection — no server call is ever
    // made here, so the item and the Pokémon are both left exactly as they
    // were; the player may pick the same (or another) Pokémon again later
    // while still owning this item.
    setSelectedCandidate(null);
    setErrorMessage(null);
  }

  function handleConfirm() {
    if (!selectedCandidate) return;

    startTransition(async () => {
      const result = await acceptEvolutionItemAction(selectedCandidate.playerPokemonId, item.id);

      if (result.status === "success") {
        setSelectedCandidate(null);
        setSuccessMessage(`${result.oldSpeciesName} התפתח ל־${result.newSpeciesName}!`);
        return;
      }

      if (result.status === "insufficient-item") {
        setErrorMessage("אין לך מספיק פריטים מסוג זה.");
      } else if (result.status === "already-evolved") {
        setErrorMessage("הפוקימון כבר התפתח.");
      } else {
        setErrorMessage("אירעה שגיאה, נסה שוב.");
      }
    });
  }

  return (
    <div dir="rtl" className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-slate-200">בחר פוקימון להתפתחות באמצעות {item.name}</h3>

      {candidates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-slate-500">
          {noEligibleEvolutionItemPokemonMessage}
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
        <EvolutionItemConfirmDialog
          candidate={selectedCandidate}
          itemName={item.name}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ) : null}
    </div>
  );
}
