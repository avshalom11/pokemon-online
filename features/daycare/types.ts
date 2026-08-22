// Plain shared shapes for POKÉMON DAYCARE — PHASE 1 (features/daycare) —
// deliberately no "server-only" import here (unlike the *.service.ts
// files), so client components can import these types directly, same
// "server-only service, plain shared types" split features/chat/types.ts /
// features/friends/types.ts already establish.

import type { DaycareStoppedReason } from "./daycare-calculations";

export interface DaycareEligiblePokemonView {
  id: string;
  speciesId: string;
  displayName: string;
  spriteUrl: string;
  level: number;
  // This Pokémon's OWN next-level timing/cost, at its current level — used
  // to render "current timing bracket / price per next level" in the
  // deposit selector (Section 12).
  hoursForNextLevel: number;
  costForNextLevel: number;
}

export interface DaycareActiveStayView {
  playerPokemonId: string;
  speciesId: string;
  displayName: string;
  spriteUrl: string;
  // ISO timestamp.
  depositedAt: string;
  startingLevel: number;
  earnedLevels: number;
  // "Level after pickup" if collected right now.
  effectiveLevel: number;
  debt: number;
  progressionStopped: boolean;
  stoppedReason: DaycareStoppedReason;
  // 0-100, earnedLevels / DAYCARE_MAX_LEVELS_PER_STAY.
  progressPercent: number;
  // ISO timestamp, null once progressionStopped.
  nextLevelDueAt: string | null;
  // Null once progressionStopped — there is no "next" bracket to show.
  hoursForNextLevel: number | null;
  costForNextLevel: number | null;
}

export interface DaycareViewData {
  // PHASE 2 — 5 SLOTS. Every Pokémon this player currently has deposited,
  // 0 to DAYCARE_MAX_SLOTS entries, each fully independent (own
  // depositedAt, own progress, own debt). The deposit selector
  // (eligiblePokemon) is shown alongside this list whenever it has fewer
  // than DAYCARE_MAX_SLOTS entries — never gated on it being empty, unlike
  // Phase 1's single-slot "either/or" UI.
  activeStays: DaycareActiveStayView[];
  eligiblePokemon: DaycareEligiblePokemonView[];
  // The player's current Money balance (PlayerProfile.coins) — shown
  // alongside each stay's own current debt so the UI can indicate whether
  // the player can currently afford that specific pickup, and the UI never
  // has to make a second round trip just to know the balance.
  playerMoney: number;
}

export type DepositToDaycareError =
  | "unauthenticated"
  | "not-owned"
  | "already-max-level"
  | "in-party"
  // PHASE 2 — this exact Pokémon already has an active stay (the
  // playerPokemonId primary key's own real guarantee — unchanged from
  // Phase 1, just renamed from "player-already-has-stay" now that a
  // player having OTHER active stays is no longer itself a rejection
  // reason).
  | "already-in-daycare"
  // PHASE 2 — the player already has DAYCARE_MAX_SLOTS active stays.
  | "daycare-full"
  // PHASE 2 — the player has less than DAYCARE_DEPOSIT_FEE Money.
  | "insufficient-funds";

export type DepositToDaycareResult = { ok: true } | { ok: false; error: DepositToDaycareError };

export type CollectFromDaycareError = "unauthenticated" | "not-found" | "insufficient-funds";

export interface CollectFromDaycareSuccess {
  ok: true;
  displayName: string;
  previousLevel: number;
  newLevel: number;
  levelsGained: number;
  moneySpent: number;
}

export type CollectFromDaycareResult = CollectFromDaycareSuccess | { ok: false; error: CollectFromDaycareError };
