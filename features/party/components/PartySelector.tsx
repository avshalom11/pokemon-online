"use client";

import { PartySlot } from "@/features/pokemon/components/PartySlot";
import { canSwitchTo } from "@/features/party/utils/party-rules";
import { MAX_ACTIVE_TEAM_SIZE } from "@/shared/types/player";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

interface PartySelectorProps {
  party: OwnedPokemon[];
  activePokemonId: string;
  onSelect: (pokemonId: string) => void;
  // "voluntary": the player chose to open this from the battle menu — can be
  // cancelled without consuming a turn. "forced": the active Pokémon just
  // fainted — no cancel affordance, a replacement is mandatory.
  mode: "voluntary" | "forced";
  onClose?: () => void;
}

// The reusable party-selection surface the task asks for — shared by
// Battle's voluntary switch and forced-replacement flows. Reuses PartySlot
// itself for each card (sprite/name/level/HP, same visual language as My
// Pokémon's party section) rather than a new card design. Rendered as a
// full opaque backdrop (absolute inset-0, scoped to the battle panel like
// BattleResultOverlay) — that backdrop is what blocks clicks on the attack/
// menu panels underneath while a selection is pending.
export function PartySelector({ party, activePokemonId, onSelect, mode, onClose }: PartySelectorProps) {
  const bySlotIndex = new Map(party.map((pokemon) => [pokemon.partySlot, pokemon]));

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-100 sm:text-lg">
            {mode === "forced" ? "הפוקימון שלך התעלף — בחר פוקימון אחר" : "בחר פוקימון להחלפה"}
          </h2>
          {mode === "voluntary" && onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="סגור"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:text-white"
            >
              ✕
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: MAX_ACTIVE_TEAM_SIZE }, (_, index) => index + 1).map((slotIndex) => {
            const pokemon = bySlotIndex.get(slotIndex) ?? null;
            const disabled = pokemon ? !canSwitchTo(pokemon, activePokemonId) : true;

            return (
              <PartySlot
                key={pokemon?.id ?? `empty-${slotIndex}`}
                pokemon={pokemon}
                isActive={pokemon?.id === activePokemonId}
                activeLabel="פעיל בקרב"
                onSelect={pokemon && !disabled ? () => onSelect(pokemon.id) : undefined}
                disabled={disabled}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
