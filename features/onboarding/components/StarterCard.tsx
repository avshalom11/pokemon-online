import { SpriteImage } from "@/components/media/SpriteImage";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { POKEMON_TYPE_LABELS } from "@/shared/types/pokemon-labels";
import type { PokemonSpecies } from "@/shared/types/pokemon";

interface StarterCardProps {
  species: PokemonSpecies;
  isSelected: boolean;
  onSelect: () => void;
}

export function StarterCard({ species, isSelected, onSelect }: StarterCardProps) {
  return (
    <div
      dir="rtl"
      className={`flex flex-col items-center gap-3 rounded-xl border p-5 transition-colors ${
        isSelected ? "border-amber-400 bg-slate-800/80" : "border-white/10 bg-slate-900/60"
      }`}
    >
      <SpriteImage
        src={getFrontSpritePath(species.dexNumber)}
        alt={species.name}
        className="h-28 w-28 object-contain"
        fallbackClassName="flex h-28 w-28 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
      />

      <h2 className="text-lg font-semibold text-slate-100">{species.name}</h2>

      <div className="flex gap-2">
        {species.types.map((type) => (
          <span key={type} className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-200">
            {POKEMON_TYPE_LABELS[type]}
          </span>
        ))}
      </div>

      <p className="text-center text-sm text-slate-400">{species.description}</p>

      <button
        type="button"
        onClick={onSelect}
        className="mt-2 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
      >
        בחר
      </button>
    </div>
  );
}
