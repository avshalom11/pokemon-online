import { getSpeciesEncounterLocations } from "@/data/zones/zone-data";
import { isMegaEvolutionTarget } from "@/features/evolution/services/evolution-item-catalog";
import type { PokemonSpecies } from "@/shared/types/pokemon";
import { pokedexLocationHint, pokedexMegaAcquisitionHint, pokedexNoKnownLocationMessage } from "../messages/pokedex-location-messages";

// POKÉDEX — FORM VISIBILITY + ACQUISITION HINT FIX. One shared "what do we
// tell the player about an unseen form" rule, used by BOTH PokedexDetailPanel
// (a sibling form left unseen within an otherwise seen/caught entry — e.g.
// owning Mega Charizard X without ever having seen normal Charizard) and
// PokedexUnseenPanel (every form, when the WHOLE entry is still unseen) —
// so the two panels can never drift on this decision, and neither one ever
// falls back to a generic "form not seen" placeholder that hides a real,
// known acquisition hint.
//
// A Mega-form species (isMegaEvolutionTarget, derived live from the
// canonical Mega Stone registry — never a naming/spriteId guess) never gets
// a wild-location hint, since Mega species are never wild-encounterable by
// design — it gets a fixed, generic Mega acquisition hint instead. Every
// other species/form reuses the real per-region zone encounter data
// (getSpeciesEncounterLocations); a form with no real zone-encounter entry
// (a starter, an evolution-only form, a regional form with no valid wild
// source, ...) falls back to the existing "not yet known" message — NEVER a
// fabricated location.
export function getPokedexUnseenFormHint(species: PokemonSpecies): string {
  if (isMegaEvolutionTarget(species.id)) return pokedexMegaAcquisitionHint;

  const locations = getSpeciesEncounterLocations(species.id);
  return locations.length > 0 ? pokedexLocationHint(species.rarity, locations) : pokedexNoKnownLocationMessage;
}
