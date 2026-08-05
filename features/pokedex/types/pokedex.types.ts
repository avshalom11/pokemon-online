import type { PokemonSpecies } from "@/shared/types/pokemon";

// Three, and only three, progress states per species — "caught" always
// implies "seen" (an owned Pokémon was, by construction, encountered or
// obtained some other way), so a single status field is enough; there is
// never a case where a species is simultaneously "caught" and "not seen".
export type PokedexStatus = "unseen" | "seen" | "caught";

// One form belonging to a PokedexEntryView (see forms below) — its own
// species data, its own display label (features/pokemon/forms's
// getFormLabel), and its own progress status, all independent of its
// sibling forms'.
export interface PokedexFormView {
  species: PokemonSpecies;
  label: string;
  status: PokedexStatus;
}

// One Pokédex grid entry — ONE row per National Dex number, per this
// feature's own "must remain 100% compatible with the official National
// Dex" requirement (see features/pokemon/forms's own doc comment for how
// alternate-form species are grouped out of the flat per-id list and folded
// in here instead). `species` is always the BASE/headline species for this
// dex entry (the full canonical species — never trimmed: hiding fields for
// an unseen entry is the UI's job, see PokedexCard — never this data
// shape's). `status` is the best status across every form (so the entry
// unlocks the moment ANY form has been seen/caught, exactly like a real
// Pokédex). `forms` always has at least one entry — length 1, containing
// just the base species itself, for every one of today's single-form
// species — so a caller never needs a separate "does this have forms"
// branch before rendering the forms list.
export interface PokedexEntryView {
  species: PokemonSpecies;
  status: PokedexStatus;
  forms: PokedexFormView[];
}
