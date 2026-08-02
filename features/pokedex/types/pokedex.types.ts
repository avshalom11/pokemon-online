import type { PokemonSpecies } from "@/shared/types/pokemon";

// Three, and only three, progress states per species — "caught" always
// implies "seen" (an owned Pokémon was, by construction, encountered or
// obtained some other way), so a single status field is enough; there is
// never a case where a species is simultaneously "caught" and "not seen".
export type PokedexStatus = "unseen" | "seen" | "caught";

// One Pokédex grid entry — the full canonical species (never trimmed:
// hiding fields for an unseen entry is the UI's job — see PokedexCard —
// never this data shape's) plus this player's own progress against it.
export interface PokedexEntryView {
  species: PokemonSpecies;
  status: PokedexStatus;
}
