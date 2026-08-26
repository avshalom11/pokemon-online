import { SpriteImage } from "@/components/media/SpriteImage";
import { getSpeciesEncounterLocations } from "@/data/zones/zone-data";
import { formatDexNumber, getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { pokedexLocationHint, pokedexNoKnownLocationMessage } from "../messages/pokedex-location-messages";
import type { PokedexEntryView } from "../types/pokedex.types";

interface PokedexUnseenPanelProps {
  entry: PokedexEntryView;
  onClose: () => void;
}

// POKÉDEX — LOCATION HINTS FOR UNSEEN POKÉMON. The limited counterpart to
// PokedexDetailPanel, only ever rendered for an "unseen" entry (see
// PokedexContent's own status branch) — never shows the species' real
// name, sprite (still the same brightness-0 silhouette PokedexCard already
// uses, no separate asset), stats, moves, description, or evolution info;
// the ONLY new information beyond what the card already shows is a
// location hint, derived entirely from the real per-region zone encounter
// tables (getSpeciesEncounterLocations) — never a hardcoded per-species
// string.
// Same "seen"/"caught" info stays completely untouched by this component;
// it is never reached for those statuses.
export function PokedexUnseenPanel({ entry, onClose }: PokedexUnseenPanelProps) {
  const { species } = entry;
  const locations = getSpeciesEncounterLocations(species.id);
  const locationHint =
    locations.length > 0 ? pokedexLocationHint(species.rarity, locations) : pokedexNoKnownLocationMessage;

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
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 p-5 text-center shadow-[0_0_40px_rgba(99,102,241,0.25)] sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:text-white"
        >
          ✕
        </button>

        <div className="flex flex-col items-center gap-3">
          <SpriteImage
            src={getFrontSpritePath(species)}
            alt="פוקימון שטרם התגלה"
            className="h-32 w-32 object-contain brightness-0 drop-shadow-[0_0_20px_rgba(99,102,241,0.35)]"
            fallbackClassName="flex h-32 w-32 items-center justify-center rounded-xl border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />

          <div>
            <p dir="ltr" className="text-xs font-medium text-slate-500">{`#${formatDexNumber(species.dexNumber)}`}</p>
            <h2 className="text-2xl font-bold text-slate-100">???</h2>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-slate-300">{locationHint}</p>
        </div>
      </div>
    </div>
  );
}
