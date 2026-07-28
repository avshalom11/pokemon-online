import type { PokemonSpecies } from "./pokemon";

// A PlayerPokemon row hydrated with its species, for read-only ownership
// displays (party, "My Pokémon", ...). Deliberately distinct from
// BattlePokemon: that type requires isShiny/moveIds, which don't exist on
// the PlayerPokemon model and would have to be fabricated here.
export interface OwnedPokemon {
  id: string;

  species: PokemonSpecies;

  nickname?: string | null;

  level: number;
  experience: number;

  currentHp: number;

  // Derived (species base stat + level growth), not a persisted column — see
  // engine/battle/pokemon-stat-calculations.ts's calculatePokemonHpStat, the
  // same formula every other HP consumer uses. Included here so display
  // components (HealthBar) never need to recompute it themselves.
  maxHp: number;

  isStarter: boolean;

  // When this PlayerPokemon row was created — "date obtained" in the My
  // Pokémon details panel.
  caughtAt: Date;

  // No isShiny column exists on PlayerPokemon yet — always false until a
  // real shiny-capture system exists. Kept here (rather than left off the
  // type) so display components (PokemonCard's shiny badge) already have
  // the field wired up and only the hydration source needs to change later.
  isShiny: boolean;

  // Persisted party membership (PlayerPokemon.partySlot in the DB) — 1-6,
  // or null when this Pokémon isn't in the active party. Slot 1 is the
  // battle starter. See getPlayerParty in
  // features/pokemon/services/player-pokemon.ts.
  partySlot: number | null;

  // Phase 6F — the single major status condition this Pokémon currently
  // carries (persists across battles, exactly like currentHp, until
  // cured at the Pokémon Center) — see features/battle/status/major-status.ts
  // for the MajorStatus union this string is validated against.
  status: string | null;
  // Sleep's remaining-turn counter; meaningful only while status === "sleep".
  statusTurnsRemaining: number | null;
}
