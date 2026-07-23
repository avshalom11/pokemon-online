"use client";

import { PartySlot } from "@/features/pokemon/components/PartySlot";
import { getHealStatus } from "@/features/pokemon-center/utils/heal-status";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

const HEAL_STATUS_LABELS: Record<ReturnType<typeof getHealStatus>, string> = {
  fainted: "התעלף",
  injured: "פצוע",
  full: "בריאות מלאה",
};

interface PartyHealSelectorProps {
  // Already just the active party, in party-slot order (getPlayerParty
  // orders by partySlot asc) — every id rendered here is guaranteed to be
  // both owned by the current player and currently in the active party, so
  // there is nothing outside that set the player could ever select.
  party: OwnedPokemon[];
  selectedIds: ReadonlySet<string>;
  onToggle: (pokemonId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  isHealing: boolean;
  errorMessage?: string | null;
}

// The healing selection panel — reuses PartySlot exactly as-is (sprite/name/
// level/HP bar/fainted badge already built in) rather than a new card
// design, same reuse idiom as features/party/components/PartySelector.tsx.
// PartySlot's `isActive`/`activeLabel` normally mean "currently in battle";
// repurposed here to mean "selected for healing" instead, since PartySlot
// already supports an onSelect callback and a non-default active label.
export function PartyHealSelector({
  party,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearSelection,
  onConfirm,
  onCancel,
  isHealing,
  errorMessage,
}: PartyHealSelectorProps) {
  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-xl sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">בחר פוקימונים לריפוי</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={isHealing}
            className="rounded-full border border-white/10 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            בחר הכל
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isHealing || selectedIds.size === 0}
            className="rounded-full border border-white/10 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            נקה בחירה
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {party.map((pokemon) => (
          <div key={pokemon.id} className="flex flex-col items-center gap-1">
            <PartySlot
              pokemon={pokemon}
              isActive={selectedIds.has(pokemon.id)}
              activeLabel="נבחר"
              onSelect={isHealing ? undefined : () => onToggle(pokemon.id)}
              disabled={isHealing}
            />
            <span className="text-[10px] font-medium text-slate-500">
              {HEAL_STATUS_LABELS[getHealStatus(pokemon)]}
            </span>
          </div>
        ))}
      </div>

      {errorMessage ? <p className="mt-3 text-xs text-rose-400">{errorMessage}</p> : null}

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isHealing}
          className="rounded-full border border-white/10 bg-slate-900/60 px-5 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-white/20 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ביטול
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isHealing || selectedIds.size === 0}
          className="rounded-full border border-indigo-400/70 bg-indigo-500/20 px-5 py-2 text-sm font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isHealing ? "מרפא..." : "רפא את הנבחרים"}
        </button>
      </div>
    </div>
  );
}
