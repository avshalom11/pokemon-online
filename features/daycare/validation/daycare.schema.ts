import * as z from "zod";

// Structural validation only — whether the id resolves to a real,
// eligible, player-owned Pokémon is the service's job (depositToDaycare),
// never this schema's. Same convention features/hatchery/validation/
// hatchery.schema.ts already establishes.
export const depositToDaycareSchema = z.object({
  playerPokemonId: z.string().min(1),
});

// PHASE 2 — 5 SLOTS. Pickup is now per-Pokémon (a player may have several
// independent active stays), so the client must say which one.
export const collectFromDaycareSchema = z.object({
  playerPokemonId: z.string().min(1),
});
