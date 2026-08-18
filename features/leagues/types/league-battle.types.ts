import type { MajorStatus } from "@/features/battle/status/major-status";

// GYMS & LEAGUES PHASE 6 — the app-layer validated string unions behind
// LeagueBattleSession.status (plain string column, no Prisma enum — same
// convention every other status-ish column in this project already
// follows).
export type LeagueBattleSessionStatus = "waiting-for-players" | "in-progress" | "completed";

// One snapshotted Pokémon on either side of a League PvP match, frozen at
// that side's own join time (section 4/5). `slotId` is the ONE stable
// identifier used everywhere else in the session (battle-local HP map,
// status map, active-slot pointer): for a real player's Pokémon it's that
// Pokémon's own real playerPokemonId (so ownership/known-move lookups stay
// trivial); for a computer-filler Pokémon there is no PlayerPokemon row at
// all, so it's a generated stable id instead (see
// league-computer-team.service.ts's own computerSlotId).
export interface LeagueBattlePokemonSnapshot {
  readonly slotId: string;
  readonly speciesId: string;
  readonly level: number;
  // Present only for a real player's own Pokémon — undefined for a
  // computer-filler slot, which has no backing PlayerPokemon row.
  readonly playerPokemonId?: string;
}

// One participant side's own per-Pokémon major-status entry — status alone
// isn't enough to correctly resume a sleeping Pokémon (its own turn
// counter must persist across a switch too), same
// NpcBattleParticipantStatus pairing Phase 3/4 already established for Gym
// battles.
export interface LeagueBattleParticipantStatus {
  readonly status: MajorStatus | null;
  readonly turnsRemaining: number | null;
}
