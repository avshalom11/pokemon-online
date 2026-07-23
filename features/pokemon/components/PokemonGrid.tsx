import { PokemonCard } from "./PokemonCard";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

interface PokemonGridProps {
  pokemon: OwnedPokemon[];
  onSelect: (id: string) => void;
}

export function PokemonGrid({ pokemon, onSelect }: PokemonGridProps) {
  if (pokemon.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
        עדיין אין לך פוקימונים באוסף.
      </p>
    );
  }

  return (
    // Deliberately dense — this grid is expected to eventually hold
    // hundreds of Pokémon, so it favors more, smaller cards per row over
    // the larger card sizing used elsewhere (e.g. PartySlot).
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
      {pokemon.map((p) => (
        <PokemonCard key={p.id} pokemon={p} onClick={() => onSelect(p.id)} />
      ))}
    </div>
  );
}
