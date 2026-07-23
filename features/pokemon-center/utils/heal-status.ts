import { isUsable } from "@/features/party/utils/party-rules";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

// Pure, framework-free classification of a party member's HP state for the
// Pokémon Center's healing UI — no React, no Prisma. Kept separate from
// features/party/utils/party-rules.ts (which only cares about "usable in
// battle", i.e. fainted vs. not) since the Center also needs to distinguish
// "injured" from "already full" to decide what needs healing at all.

export type HealStatus = "fainted" | "injured" | "full";

export function getHealStatus(pokemon: OwnedPokemon): HealStatus {
  if (!isUsable(pokemon)) return "fainted";
  return pokemon.currentHp < pokemon.maxHp ? "injured" : "full";
}

export function needsHealing(pokemon: OwnedPokemon): boolean {
  return pokemon.currentHp < pokemon.maxHp;
}

// Whether any party member would actually be changed by a heal — used to
// skip opening the selector entirely (and therefore skip any DB write) when
// the whole party is already at full HP.
export function partyNeedsHealing(party: OwnedPokemon[]): boolean {
  return party.some(needsHealing);
}
