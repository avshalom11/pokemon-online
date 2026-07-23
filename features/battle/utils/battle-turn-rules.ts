import { applyFixedAttack } from "@/engine/battle/battle-config";
import { hasUsableMember } from "@/features/party/utils/party-rules";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

// Pure turn-resolution helpers — no React, no DB, no timers. Kept separate
// from BattleContent so the actual branching rules (what happens after a
// hit lands) are testable/reviewable independent of the state machine's
// wiring.

export interface WildCounterAttackResult {
  newHp: number;
  fainted: boolean;
}

// Applies the wild Pokémon's one counter-attack to whichever party member is
// currently active. Reuses the existing, unmodified applyFixedAttack
// (engine/battle/battle-config.ts) rather than duplicating the damage
// constant/clamp logic.
export function resolveWildCounterAttack(currentHp: number): WildCounterAttackResult {
  const newHp = applyFixedAttack(currentHp);
  return { newHp, fainted: newHp <= 0 };
}

export type PostFaintPhase = "selectingForcedReplacement" | "partyDefeated";

// Given the party's LIVE hp state (not the stale server-fetched snapshot),
// decides whether the player must pick a replacement or the whole party is
// down. Callers pass a party list whose currentHp already reflects the
// in-session HP map — see BattleContent's `livePartyList`.
export function determineNextPhaseAfterFaint(livePartyList: OwnedPokemon[]): PostFaintPhase {
  return hasUsableMember(livePartyList) ? "selectingForcedReplacement" : "partyDefeated";
}
