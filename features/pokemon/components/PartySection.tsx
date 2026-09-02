import { PartySlot } from "./PartySlot";
import { MAX_ACTIVE_TEAM_SIZE } from "@/shared/types/player";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

interface PartySectionProps {
  party: OwnedPokemon[];
  // Passed straight through to each PartySlot — see PartySlot's own doc
  // comment. Defaults to "compact" so existing callers (Home) are unaffected.
  variant?: "compact" | "detailed";
  // Optional per-slot-index interactivity — index is the 1-6 slot position
  // (not the array index into `party`, since empty slots aren't in that
  // array). Omitted by default so Home's usage is unaffected.
  onSlotSelect?: (slotIndex: number) => void;
  disabledSlotIndexes?: number[];
  // HOME VISUAL PROMINENCE — Home-only opt-in stronger framing (card
  // container + bolder header), passed through to every PartySlot below to
  // also boost empty/occupied-slot contrast. Purely additive styling, never
  // a behavior change; defaults to off so every other caller (My Pokémon's
  // own `variant="detailed"` usage, and PartySlot's own direct callers —
  // BattleBagPanel, PartyHealSelector, PartySelector) keeps its exact
  // previous presentation.
  emphasized?: boolean;
}

// Always renders exactly MAX_ACTIVE_TEAM_SIZE slots, keyed by their real 1-6
// slotIndex now that party order is persisted (PlayerPokemon.partySlot) —
// occupied slots render at their actual position, gaps render as empty.
export function PartySection({ party, variant = "compact", onSlotSelect, disabledSlotIndexes, emphasized = false }: PartySectionProps) {
  const bySlotIndex = new Map(party.map((pokemon) => [pokemon.partySlot, pokemon]));

  return (
    <section
      dir="rtl"
      className={emphasized ? "rounded-2xl border border-indigo-500/25 bg-slate-950/85 p-4 sm:p-5" : undefined}
    >
      <h2
        className={
          emphasized
            ? "mb-3 text-sm font-bold tracking-wide text-slate-200 uppercase sm:text-base"
            : "mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase"
        }
      >
        השישייה שלי
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: MAX_ACTIVE_TEAM_SIZE }, (_, index) => index + 1).map((slotIndex) => {
          const pokemon = bySlotIndex.get(slotIndex) ?? null;

          return (
            <PartySlot
              key={pokemon?.id ?? `empty-${slotIndex}`}
              pokemon={pokemon}
              isActive={slotIndex === 1 && pokemon !== null}
              variant={variant}
              onSelect={onSlotSelect ? () => onSlotSelect(slotIndex) : undefined}
              disabled={disabledSlotIndexes?.includes(slotIndex)}
              emphasized={emphasized}
            />
          );
        })}
      </div>
    </section>
  );
}
