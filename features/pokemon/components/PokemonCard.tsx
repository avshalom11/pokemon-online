import { HealthBar } from "@/components/battle/HealthBar";
import { PokemonXpBar } from "@/components/battle/PokemonXpBar";
import { SpriteImage } from "@/components/media/SpriteImage";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { POKEMON_TYPE_LABELS } from "@/shared/types/pokemon-labels";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

interface PokemonCardProps {
  pokemon: OwnedPokemon;
  onClick: () => void;
}

// A single Collection grid entry. Presentational + one callback — no
// internal state — so PokemonGrid stays a plain map and all interactive
// state (which card is selected) lives in the page-level MyPokemonContent.
//
// Deliberately smaller/denser than PartySlot (the active party's card) —
// the collection is expected to eventually hold hundreds of entries, so it
// must scale as a compact grid, while the 6-slot party stays the visually
// larger, "hero" section of the page.
export function PokemonCard({ pokemon, onClick }: PokemonCardProps) {
  const displayName = pokemon.nickname ?? pokemon.species.name;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-2 text-center transition-all hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-slate-900/80 hover:shadow-[0_0_14px_rgba(99,102,241,0.25)]"
    >
      {pokemon.isStarter ? (
        <span className="absolute right-1 top-1 rounded-full bg-amber-400/90 px-1.5 py-0 text-[8px] font-bold text-slate-950">
          מקורי
        </span>
      ) : null}

      {/* Never true today — no shiny-capture system exists yet (see
          OwnedPokemon.isShiny). The badge is ready for when it does. */}
      {pokemon.isShiny ? (
        <span className="absolute left-1 top-1 text-xs" title="נוצץ">
          ✨
        </span>
      ) : null}

      <SpriteImage
        src={getFrontSpritePath(pokemon.species)}
        alt={displayName}
        className="h-12 w-12 object-contain transition-transform group-hover:scale-110 sm:h-14 sm:w-14"
        fallbackClassName="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 sm:h-14 sm:w-14"
      />

      <div className="flex w-full items-center justify-between gap-1">
        <span className="truncate text-[11px] font-semibold text-slate-100">{displayName}</span>
        <span className="shrink-0 text-[10px] font-medium text-slate-400">Lv.{pokemon.level}</span>
      </div>

      <div className="w-full">
        <HealthBar current={pokemon.currentHp} max={pokemon.maxHp} />
      </div>

      <div className="w-full">
        <PokemonXpBar experience={pokemon.experience} />
      </div>

      <div className="flex flex-wrap justify-center gap-1">
        {pokemon.species.types.map((type) => (
          <span key={type} className="rounded-full bg-slate-800/80 px-1.5 py-0 text-[8px] font-medium text-slate-300">
            {POKEMON_TYPE_LABELS[type]}
          </span>
        ))}
      </div>
    </button>
  );
}
