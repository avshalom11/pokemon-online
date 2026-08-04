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

// The Bag/battle-agnostic view of one PlayerPokemon's pending BRANCH
// evolution choice (Eevee's Espeon/Umbreon fork today — see
// data/pokemon/pokemon-evolutions.ts's BRANCH_EVOLUTIONS) — everything a
// choice prompt needs to render (current species plus every candidate
// target, already resolved against the Species Registry) without the
// component itself ever touching Prisma or the registry. Used by both the
// in-battle prompt (BattleContent) and the Home-page safety net
// (PendingEvolutionGate), same shape either way. Choosing one of `targets`
// (via chooseEvolutionBranchAction) turns this into a normal
// PendingEvolutionView above — see evolution-progress.service.ts's
// chooseEvolutionBranch.
export interface PendingEvolutionBranchView {
  playerPokemonId: string;
  nickname: string | null;
  currentSpecies: PokemonSpecies;
  targets: PokemonSpecies[];
}
