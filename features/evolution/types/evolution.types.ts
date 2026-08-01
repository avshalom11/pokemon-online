import type { PokemonSpecies } from "@/shared/types/pokemon";

// The Bag/battle-agnostic view of one PlayerPokemon's pending evolution
// decision — everything a prompt needs to render (current + proposed
// species, both already resolved against the Species Registry) without the
// component itself ever touching Prisma or the registry. Used by both the
// in-battle prompt (BattleContent, built inline from a battle-victory
// response) and the Home-page safety net (PendingEvolutionGate, from
// features/evolution/queries/evolution-queries.ts) — the same shape either
// way, so EvolutionPromptDialog never needs to know which flow it's in.
export interface PendingEvolutionView {
  playerPokemonId: string;
  nickname: string | null;
  currentSpecies: PokemonSpecies;
  evolvedSpecies: PokemonSpecies;
}
