"use client";

import { useState, useTransition } from "react";

import { SpriteImage } from "@/components/media/SpriteImage";
import { getMedicineStatusCandidates, type MedicineStatusCandidate } from "@/features/battle/services/medicine-status-eligibility";
import { MAJOR_STATUS_LABELS } from "@/features/battle/status/major-status-labels";
import { useStatusMedicineItemAction } from "@/features/inventory/actions/use-status-medicine-item.action";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import type { ShopItem } from "@/features/shop/types/shop.types";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

interface MedicineStatusPanelProps {
  item: ShopItem;
  // Party AND storage — same prop InventoryContent already threads into
  // EvolutionItemPanel, reused as-is here. Status-healing items deliberately
  // don't restrict to the active party: a status persists on a storage
  // Pokémon exactly the same way (see getMedicineStatusCandidates's own doc
  // comment), so excluding storage would hide genuinely eligible targets.
  ownedPokemon: OwnedPokemon[];
}

const NO_ELIGIBLE_MESSAGE = "אין לך כרגע פוקימון שזקוק לתרופה הזו.";

// INVENTORY USE OUTSIDE BATTLE — appears under InventorySellPanel whenever a
// status-curing Medicine item (medicineEffectKind === "cure-status" —
// Antidote/Burn Heal/Paralyze Heal/Awakening/Ice Heal/Full Heal) is selected
// in the Inventory, never for a plain heal/revive Potion (those stay
// battle-only — see this feature's own scope note). Same two-step
// "candidate grid -> confirm dialog" shape EvolutionItemPanel already
// establishes; the actual cure is applyMedicineItemUse
// (use-medicine.service.ts) via useStatusMedicineItemAction — the exact same
// server logic the battle Bag's MedicineTargetPicker uses, never duplicated.
export function MedicineStatusPanel({ item, ownedPokemon }: MedicineStatusPanelProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<MedicineStatusCandidate | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  const candidates = getMedicineStatusCandidates(item, ownedPokemon);

  function handleSelectCandidate(candidate: MedicineStatusCandidate) {
    setSelectedCandidate(candidate);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function handleCancel() {
    // Never a permanent rejection — no server call happens here, so the
    // item and every Pokémon are left exactly as they were.
    setSelectedCandidate(null);
    setErrorMessage(null);
  }

  function handleConfirm() {
    if (!selectedCandidate) return;

    startTransition(async () => {
      const result = await useStatusMedicineItemAction(item.id, selectedCandidate.playerPokemonId);

      if (result.status === "success") {
        const displayName = selectedCandidate.nickname ?? selectedCandidate.species.name;
        setSelectedCandidate(null);
        setSuccessMessage(`${displayName} רופא ממצב ${MAJOR_STATUS_LABELS[selectedCandidate.status]}!`);
        return;
      }

      if (result.status === "no-item") {
        setErrorMessage("אין לך מספיק פריטים מסוג זה.");
      } else if (result.status === "invalid-target") {
        // The candidate list above is a snapshot from page load — the
        // server always re-checks fresh, so this is the honest message for
        // "this Pokémon's status/HP already changed since you opened this
        // panel," not a generic catch-all.
        setErrorMessage("מצבו של הפוקימון כבר השתנה — ייתכן שהוא כבר טופל או שהתעלף.");
      } else {
        setErrorMessage("אירעה שגיאה, נסה שוב.");
      }
    });
  }

  return (
    <div dir="rtl" className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-slate-200">בחר פוקימון לריפוי באמצעות {item.name}</h3>

      {candidates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-slate-500">
          {NO_ELIGIBLE_MESSAGE}
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
                disabled={isSubmitting}
                className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-2 text-center transition-all hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-slate-900/80 disabled:cursor-not-allowed disabled:opacity-40"
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
                {/* The one explicit reason this Pokémon is shown at all —
                    required so the player can see WHY it's eligible, not
                    just that it is. */}
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                  {MAJOR_STATUS_LABELS[candidate.status]}
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
        <MedicineStatusConfirmDialog
          candidate={selectedCandidate}
          itemName={item.name}
          itemImageUrl={item.imageUrl}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      ) : null}
    </div>
  );
}

interface MedicineStatusConfirmDialogProps {
  candidate: MedicineStatusCandidate;
  itemName: string;
  itemImageUrl: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

// Same dialog shell as EvolutionItemConfirmDialog (no backdrop dismiss, no
// ✕ — only its own two buttons ever close it): a status cure permanently
// consumes one item exactly like an evolution-item use does, so the same
// "explicit confirm required" convention applies.
function MedicineStatusConfirmDialog({
  candidate,
  itemName,
  itemImageUrl,
  isSubmitting,
  errorMessage,
  onConfirm,
  onCancel,
}: MedicineStatusConfirmDialogProps) {
  const displayName = candidate.nickname ?? candidate.species.name;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-indigo-400/30 bg-slate-900 p-6 text-center shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100">שימוש בפריט</h2>

        <div className="mt-4 flex items-center justify-center gap-4">
          <SpriteImage
            src={itemImageUrl}
            alt={itemName}
            className="h-16 w-16 object-contain"
            fallbackClassName="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
          <span className="text-2xl text-indigo-300" aria-hidden="true">
            ←
          </span>
          <SpriteImage
            src={getFrontSpritePath(candidate.species)}
            alt={displayName}
            className="h-20 w-20 object-contain"
            fallbackClassName="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
        </div>

        <p className="mt-4 text-sm text-slate-300">
          להשתמש ב{itemName} על {displayName} כדי לרפא מצב {MAJOR_STATUS_LABELS[candidate.status]}?
        </p>

        {errorMessage ? <p className="mt-3 text-xs font-semibold text-rose-400">{errorMessage}</p> : null}

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "מרפא..." : "כן, רפא"}
          </button>
        </div>
      </div>
    </div>
  );
}
