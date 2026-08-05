import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import type { PokemonSpecies } from "@/shared/types/pokemon";

// Generic Pokémon Forms grouping — built entirely from the two optional
// PokemonSpecies fields `formOf`/`formLabel` (see shared/types/pokemon.ts's
// own doc comments), never a hardcoded per-species list. Any future
// multi-form Pokémon (Castform, Burmy, Rotom, Giratina, regional forms, ...)
// is picked up here purely by giving its alternate-form catalog entries a
// `formOf` pointing at their base species id — no change to this module is
// ever required for a new one.
//
// A species with no `formOf` is either an ordinary single-form species, or
// the BASE (headline) entry of a multi-form Pokémon — the one the Pokédex
// groups every sibling form under and lists first (see getFormEntries
// below). A species WITH `formOf` is an alternate form: it shares its
// base's dexNumber (data/pokemon/pokemon-data.test.ts's own dex-number
// invariants enforce this) and never appears as its own row in the Pokédex
// grid — see features/pokedex/services/pokedex-view.service.ts.

// baseSpeciesId -> every alternate-form species whose formOf points at it,
// in catalog order. Exported as a pure builder (rather than only the
// module-load singleton below) so a test can exercise the grouping logic
// against small fixture arrays without needing real catalog entries — same
// "build once, O(1) lookups after" + fixture-testable-builder precedent
// engine/learnsets/registry/learnset-registry.ts's own buildLearnsetRegistry
// already established.
export function buildAlternateFormsIndex(allSpecies: readonly PokemonSpecies[]): Map<string, PokemonSpecies[]> {
  const index = new Map<string, PokemonSpecies[]>();

  for (const species of allSpecies) {
    if (species.formOf === undefined) continue;
    const siblings = index.get(species.formOf) ?? [];
    siblings.push(species);
    index.set(species.formOf, siblings);
  }

  return index;
}

const ALTERNATE_FORMS_BY_BASE_ID = buildAlternateFormsIndex(POKEMON_DATA);

export function isAlternateForm(species: PokemonSpecies): boolean {
  return species.formOf !== undefined;
}

// True only for a BASE species that has at least one sibling alternate form
// — never true for an alternate form itself (it belongs to a group, it
// doesn't head one) and never true for an ordinary single-form species.
export function hasForms(species: PokemonSpecies): boolean {
  return !isAlternateForm(species) && (ALTERNATE_FORMS_BY_BASE_ID.get(species.id)?.length ?? 0) > 0;
}

// A form's own display label — falls back to the species' real name for a
// species that predates (or simply never needs) the Forms system, so every
// ordinary single-form species keeps working with zero data migration.
export function getFormLabel(species: PokemonSpecies): string {
  return species.formLabel ?? species.name;
}

// Every form belonging to the same Pokédex entry as `species` — the base
// species first, then every alternate form in catalog order. Length 1 for a
// species with no forms at all (just itself), so callers never need a
// separate "does this even have forms" branch before iterating. Works
// starting from EITHER the base species OR one of its alternate forms.
export function getFormEntries(species: PokemonSpecies): PokemonSpecies[] {
  const baseSpecies = isAlternateForm(species) ? (getSpeciesById(species.formOf!) ?? species) : species;

  return [baseSpecies, ...(ALTERNATE_FORMS_BY_BASE_ID.get(baseSpecies.id) ?? [])];
}
