import type { OwnedPokemon } from "@/shared/types/player-pokemon";

// Pure, framework-free party rules — no React, no Prisma, no "server-only".
// Shared by both the My Pokémon party editor and the battle screen's
// switch/forced-replacement logic, so "what counts as usable" is defined
// in exactly one place.

export function isUsable(pokemon: OwnedPokemon): boolean {
  return pokemon.currentHp > 0;
}

export function hasUsableMember(party: OwnedPokemon[]): boolean {
  return party.some(isUsable);
}

export function getFirstUsableMember(party: OwnedPokemon[]): OwnedPokemon | null {
  return party.find(isUsable) ?? null;
}

export function isPartyDefeated(party: OwnedPokemon[]): boolean {
  return !hasUsableMember(party);
}

// Whether `target` is a legal voluntary/forced switch destination: a real
// party member (callers always pass the current party list, so ownership is
// implicit), not already the active Pokémon, and not fainted.
export function canSwitchTo(target: OwnedPokemon, activePokemonId: string): boolean {
  return target.id !== activePokemonId && isUsable(target);
}
