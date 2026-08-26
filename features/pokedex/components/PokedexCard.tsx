import { SpriteImage } from "@/components/media/SpriteImage";
import { formatDexNumber, getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { POKEMON_TYPE_LABELS } from "@/shared/types/pokemon-labels";
import type { PokedexEntryView } from "../types/pokedex.types";

interface PokedexCardProps {
  entry: PokedexEntryView;
  onSelect: () => void;
}

// One Pokédex grid entry. The dex number is always visible (per this
// feature's own spec — it never reveals anything about an undiscovered
// species), but every other field is gated behind `status`:
//
// - "unseen": the sprite is rendered but silhouetted (brightness-0 — same
//   real sprite, no separate asset, so this never needs its own art), the
//   name is replaced with "???", and types are hidden entirely — same
//   visual treatment as before. UNLIKE before, the card IS clickable: it
//   opens PokedexUnseenPanel (PokedexContent's own status branch), a
//   strictly limited view (same dark sprite/"???" name, plus a location
//   hint derived from real zone data) — never the full PokedexDetailPanel,
//   which stays reserved for "seen"/"caught" entries only.
// - "seen"/"caught": full name, real sprite, types, and (caught only) a
//   small badge — clicking opens the full detail panel.
export function PokedexCard({ entry, onSelect }: PokedexCardProps) {
  const { species, status } = entry;
  const isUnseen = status === "unseen";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all ${
        isUnseen
          ? "border-white/5 bg-slate-900/30 hover:border-indigo-400/30 hover:bg-slate-900/50"
          : "border-white/10 bg-slate-900/60 hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-slate-900/80 hover:shadow-[0_0_14px_rgba(99,102,241,0.25)]"
      }`}
    >
      {status === "caught" ? (
        <span className="absolute right-1 top-1 rounded-full bg-emerald-400/90 px-1.5 py-0 text-[8px] font-bold text-slate-950">
          נתפס
        </span>
      ) : status === "seen" ? (
        <span className="absolute right-1 top-1 rounded-full bg-slate-700/90 px-1.5 py-0 text-[8px] font-semibold text-slate-300">
          נצפה
        </span>
      ) : null}

      <span dir="ltr" className="text-[10px] font-medium text-slate-500">{`#${formatDexNumber(species.dexNumber)}`}</span>

      <SpriteImage
        src={getFrontSpritePath(species)}
        alt={isUnseen ? "פוקימון שטרם התגלה" : species.name}
        className={`h-12 w-12 object-contain transition-transform sm:h-14 sm:w-14 ${
          isUnseen ? "opacity-80 brightness-0" : "group-hover:scale-110"
        }`}
        fallbackClassName="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 sm:h-14 sm:w-14"
      />

      <span className="truncate text-[11px] font-semibold text-slate-100">{isUnseen ? "???" : species.name}</span>

      {!isUnseen ? (
        <div className="flex flex-wrap justify-center gap-1">
          {species.types.map((type) => (
            <span key={type} className="rounded-full bg-slate-800/80 px-1.5 py-0 text-[8px] font-medium text-slate-300">
              {POKEMON_TYPE_LABELS[type]}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
