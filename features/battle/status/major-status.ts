import type { StatusCondition } from "@/engine/moves";
import type { PokemonType } from "@/shared/types/pokemon";

// Phase 6F — the 5 persistent major status conditions this project
// supports (a subset of the Move Registry's own broader StatusCondition,
// which also covers volatile single-turn conditions like confusion/flinch
// and the not-yet-implemented badly-poisoned escalation — deliberately
// out of scope here).
export type MajorStatus = "burn" | "poison" | "paralysis" | "sleep" | "freeze";

const MAJOR_STATUSES: readonly MajorStatus[] = ["burn", "poison", "paralysis", "sleep", "freeze"];

export function isMajorStatus(status: StatusCondition): status is MajorStatus {
  return (MAJOR_STATUSES as readonly string[]).includes(status);
}

// Canonical Gen-standard type immunities, checked against the target's own
// Species Registry types — never a hardcoded Pokémon id. Steel is included
// for poison since it exists in this project's type system (18 standard
// types, engine/damage/type-chart.ts).
export function isImmuneToStatus(types: readonly PokemonType[], status: MajorStatus): boolean {
  switch (status) {
    case "burn":
      return types.includes("fire");
    case "paralysis":
      return types.includes("electric");
    case "freeze":
      return types.includes("ice");
    case "poison":
      return types.includes("poison") || types.includes("steel");
    default:
      return false;
  }
}

export type StatusApplicationResult =
  | { applied: true }
  | { applied: false; reason: "already-statused" | "immune" };

// A Pokémon can only ever carry one major status at a time — a new
// application is rejected outright (not queued, not overwritten) when one
// is already present, exactly like a real already-statused target.
export function canApplyStatus(
  currentStatus: MajorStatus | null,
  status: MajorStatus,
  targetTypes: readonly PokemonType[]
): StatusApplicationResult {
  if (currentStatus !== null) return { applied: false, reason: "already-statused" };
  if (isImmuneToStatus(targetTypes, status)) return { applied: false, reason: "immune" };
  return { applied: true };
}
