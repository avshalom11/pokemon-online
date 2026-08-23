import { MAX_ACTIVE_TEAM_SIZE } from "@/shared/types/player";
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

// FIELD CAPTURE — AUTO-ADD TO PARTY IF SPACE. The one place "which slot
// does a newly-added Pokémon land in" is decided — the lowest-numbered
// slot (1..MAX_ACTIVE_TEAM_SIZE) not already present in `occupiedSlots`,
// or null if every slot is taken (party full; caller keeps the Pokémon in
// storage instead, never replacing an existing member). Shared by any
// future auto-add-to-party flow — today, capture.service.ts's own
// attemptCapture, right after a newly-captured Pokémon is created.
export function getFirstEmptyPartySlot(occupiedSlots: readonly number[]): number | null {
  const occupied = new Set(occupiedSlots);
  for (let slot = 1; slot <= MAX_ACTIVE_TEAM_SIZE; slot++) {
    if (!occupied.has(slot)) return slot;
  }
  return null;
}
