import { getCompatibleMoveIdsForPokemon } from "../registry/tm-compatibility-registry.ts";
import type { TmMachineId } from "../types/tm-compatibility.types.ts";

// The stable machine identifier for a TM move — always "tm-<moveId>", never
// a numeric TM slot. Derived here, on demand, rather than stored redundantly
// on every one of the ~13,000 compatibility entries (see
// ../schemas/tm-compatibility-schema.ts's own doc comment on
// tmMachineIdSchema) — this is the one place that string is ever built.
export function toTmMachineId(moveId: string): TmMachineId {
  return `tm-${moveId}`;
}

// DENY-BY-DEFAULT: true only if there is an explicit, verified compatibility
// entry for this exact pokemonId+moveId pair (engine/tm-compatibility/data).
// A pokemonId with no compatibility data at all, or with data that simply
// doesn't list this moveId, both resolve to false here — there is no
// fallback to type, to a related/evolved species, or to "seems logical".
// Species/forms are looked up by their own canonical id: an alternate form
// (e.g. "deoxys-attack") is never compatible merely because its base form
// ("deoxys") is, and vice versa.
export function canLearnTm(pokemonId: string, moveId: string): boolean {
  return getCompatibleMoveIdsForPokemon(pokemonId).has(moveId);
}

// Every TM moveId this exact pokemonId is verified-compatible with — the
// "what TMs work on this Pokémon" direction of the same deny-by-default
// data canLearnTm reads. Returns an empty array (never throws) for a
// pokemonId with no compatibility data at all.
export function getCompatibleTmMoveIds(pokemonId: string): readonly string[] {
  return [...getCompatibleMoveIdsForPokemon(pokemonId)];
}
