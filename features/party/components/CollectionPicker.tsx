"use client";

import { PokemonGrid } from "@/features/pokemon/components/PokemonGrid";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

interface CollectionPickerProps {
  slotIndex: number;
  collection: OwnedPokemon[];
  onSelect: (pokemonId: string) => void;
  onClose: () => void;
}

// Fills a specific empty (or being-replaced) party slot from the player's
// full collection — reuses PokemonGrid/PokemonCard as-is (no new card
// design), same centered-modal idiom as PokemonDetailsPanel. Only ever
// shown pokemon not already in the party; the caller (MyPokemonContent) is
// responsible for that filtering so this component stays a plain, dumb list.
export function CollectionPicker({ slotIndex, collection, onSelect, onClose }: CollectionPickerProps) {
  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-[0_0_40px_rgba(99,102,241,0.25)] sm:p-7"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-100">{`בחר פוקימון למשבצת ${slotIndex}`}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:text-white"
          >
            ✕
          </button>
        </div>

        {collection.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
            אין פוקימונים זמינים להוספה — כולם כבר בצוות.
          </p>
        ) : (
          <PokemonGrid pokemon={collection} onSelect={onSelect} />
        )}
      </div>
    </div>
  );
}
