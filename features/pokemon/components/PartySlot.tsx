import { HealthBar } from "@/components/battle/HealthBar";
import { PokemonXpBar } from "@/components/battle/PokemonXpBar";
import { SpriteImage } from "@/components/media/SpriteImage";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { POKEMON_TYPE_LABELS } from "@/shared/types/pokemon-labels";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

interface PartySlotProps {
  pokemon: OwnedPokemon | null;
  isActive: boolean;
  // "compact" (default): Home's original slot — sprite/name/level/HP/types
  // only. "detailed": My Pokémon's party section additionally shows the
  // Nature/Held Item placeholder rows. Kept as one component (not two) so
  // both surfaces share the exact same slot rendering/behavior — only the
  // amount of info shown differs.
  variant?: "compact" | "detailed";
  // Optional interactivity, used by My Pokémon's edit mode and by
  // PartySelector (features/party/components/PartySelector.tsx) — omitted
  // by every other caller (Home), which keeps slots non-interactive exactly
  // as before.
  onSelect?: () => void;
  disabled?: boolean;
  // What the `isActive` badge says — "leader" (party slot 1, the default)
  // in My Pokémon/Home, but "currently in battle" in PartySelector, where
  // isActive tracks the mid-battle active Pokémon instead, which can be a
  // different member than the leader after a switch.
  activeLabel?: string;
}

// Pure/presentational by design — takes exactly the slot it should render
// and nothing else, so a future drag & drop reorder only needs to change
// what array position feeds this component, not this component itself.
export function PartySlot({ pokemon, isActive, variant = "compact", onSelect, disabled, activeLabel = "מוביל" }: PartySlotProps) {
  const interactive = Boolean(onSelect) && !disabled;

  if (!pokemon) {
    return (
      <div
        onClick={interactive ? onSelect : undefined}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-slate-900/30 p-3 text-slate-600 ${
          interactive ? "cursor-pointer hover:border-indigo-400/40 hover:text-slate-400" : ""
        }`}
      >
        <EmptyOrbIcon />
        <span className="text-xs font-medium">ריק</span>
      </div>
    );
  }

  const displayName = pokemon.nickname ?? pokemon.species.name;
  const isFainted = pokemon.currentHp <= 0;

  return (
    <div
      onClick={interactive ? onSelect : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
        isActive ? "animate-home-glow border-indigo-400/70 bg-indigo-500/10" : "border-white/10 bg-slate-900/60"
      } ${interactive ? "cursor-pointer hover:border-indigo-400/50" : ""} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {isActive ? (
        <span className="absolute -top-2 right-1/2 translate-x-1/2 rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          {activeLabel}
        </span>
      ) : null}

      {isFainted ? (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300 shadow">
          התעלף
        </span>
      ) : null}

      <SpriteImage
        src={getFrontSpritePath(pokemon.species.dexNumber)}
        alt={displayName}
        className="h-16 w-16 object-contain sm:h-20 sm:w-20"
        fallbackClassName="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 sm:h-20 sm:w-20"
      />

      <div className="flex w-full items-center justify-between gap-1">
        <span className="truncate text-sm font-semibold text-slate-100">{displayName}</span>
        <span className="shrink-0 text-xs font-medium text-slate-400">Lv.{pokemon.level}</span>
      </div>

      <div className="w-full">
        <HealthBar current={pokemon.currentHp} max={pokemon.maxHp} />
      </div>

      <div className="w-full">
        <PokemonXpBar experience={pokemon.experience} />
      </div>

      <div className="flex flex-wrap justify-center gap-1">
        {pokemon.species.types.map((type) => (
          <span
            key={type}
            className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-300"
          >
            {POKEMON_TYPE_LABELS[type]}
          </span>
        ))}
      </div>

      {variant === "detailed" ? (
        <div className="w-full space-y-0.5 border-t border-white/5 pt-1.5 text-[10px] text-slate-500">
          <div className="flex items-center justify-between">
            <span>טבע</span>
            <span className="text-slate-400">טרם הוגדר</span>
          </div>
          <div className="flex items-center justify-between">
            <span>פריט מוחזק</span>
            <span className="text-slate-400">אין</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Original "capture orb" glyph for an empty slot — deliberately not a
// red/white Poké Ball (this project avoids recognizable Pokémon IP, see
// lib/battle/battleThemes.ts's GHOST_THEME note).
function EmptyOrbIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10 opacity-40">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="3 3" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}
