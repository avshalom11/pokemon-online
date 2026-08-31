import { useState } from "react";

import { SpriteImage } from "@/components/media/SpriteImage";
import { formatDexNumber, getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import type { PokedexEntryView } from "../types/pokedex.types";
import { getPokedexUnseenFormHint } from "../utils/pokedex-form-hints";

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
//
// POKÉDEX FORM NAVIGATION — an "unseen" entry's own `forms` (the exact same
// array PokedexDetailPanel navigates — see that file's own doc comment) can
// still have more than one member (e.g. a regional form nobody has
// encountered yet). Every one of them is necessarily "unseen" too, since
// PokedexContent only ever routes here when the ENTRY's own best-of-forms
// status is "unseen" (an entry becomes "seen"/"caught" the instant ANY form
// is — see PokedexEntryView's own doc comment), so there is no per-form
// seen/unseen gate to handle here: every form gets the identical
// silhouette + location-hint treatment, just re-derived for whichever form
// is currently selected. Left/right arrows cycle with wraparound, reusing
// entry.forms directly — never a second/hardcoded form list.
export function PokedexUnseenPanel({ entry, onClose }: PokedexUnseenPanelProps) {
  const [selectedFormSpeciesId, setSelectedFormSpeciesId] = useState(entry.forms[0]!.species.id);
  const selectedFormIndex = Math.max(
    0,
    entry.forms.findIndex((form) => form.species.id === selectedFormSpeciesId)
  );
  const { species } = entry.forms[selectedFormIndex] ?? entry.forms[0]!;
  // POKÉDEX — FORM VISIBILITY + ACQUISITION HINT FIX — same shared hint
  // rule PokedexDetailPanel now uses for a sibling unseen form: a Mega-form
  // species gets its own dedicated acquisition hint instead of a wild
  // location hint (Mega species are never wild-encounterable), everything
  // else reuses the real per-region zone encounter data, and a species with
  // no real zone entry falls back to the existing "not yet known" message.
  const locationHint = getPokedexUnseenFormHint(species);

  function goToForm(offset: number) {
    const nextIndex = (selectedFormIndex + offset + entry.forms.length) % entry.forms.length;
    setSelectedFormSpeciesId(entry.forms[nextIndex]!.species.id);
  }

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
          {entry.forms.length > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => goToForm(-1)}
                aria-label="הצורה הקודמת"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-slate-800/80 text-slate-300 hover:text-white"
              >
                ‹
              </button>
              <span dir="ltr" className="text-xs text-slate-500">
                {selectedFormIndex + 1} / {entry.forms.length}
              </span>
              <button
                type="button"
                onClick={() => goToForm(1)}
                aria-label="הצורה הבאה"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-slate-800/80 text-slate-300 hover:text-white"
              >
                ›
              </button>
            </div>
          ) : null}

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
