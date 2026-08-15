import type { PokemonRarity } from "@/shared/types/pokemon";

// EGGS PHASE 1 — Core Data & Database.

// How a PlayerOwnedEgg row (prisma/schema.prisma) came to exist. Neither
// acquisition path is implemented yet (Phase 2+ — a 0.25% battle drop and
// a shop purchase flow) — this type exists now purely so the column has a
// real, closed set of values to validate against from day one, the same
// "define the closed value set before anything writes it" precedent
// features/notifications/types.ts's NotificationType already follows.
export type EggAcquisitionSource = "battle" | "shop";

export const EGG_ACQUISITION_SOURCES: readonly EggAcquisitionSource[] = ["battle", "shop"];

// EGGS PHASE 2 — the battle-response shape for "did this victory drop an
// egg". Deliberately minimal/generic per this phase's own scope (no visual
// notification data, no incubator info) — rides along inside
// BattleVictoryReward (features/battle-session/services/
// battle-session.service.ts), the exact same object experienceGranted
// already carries to the client, rather than a second field on
// BattleActionSuccess.
export type EggDropOutcome =
  | { dropped: false }
  | { dropped: true; ownedEggId: string; rarity: PokemonRarity; regionId: string };

// EGGS PHASE 3 — the battle-response shape for "did this victory progress
// the player's active incubation". `incubationId` is the incubation's own
// primary key (PlayerEggIncubation.ownedEggId — see that model's own doc
// comment for why the egg's id doubles as the incubation's id). Today a
// player only ever has one active incubation, so this is a single nullable
// summary rather than an array — see progressActiveIncubations's own doc
// comment (incubation.service.ts) for why the SERVICE itself still stays
// generic over "every active incubation this player owns" underneath.
export type IncubationProgressSummary =
  | null
  | { incubationId: string; battleProgress: number; requiredBattleTarget: number; isReady: boolean };
