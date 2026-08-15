export type IncubatorTypeId = "standard";

export interface IncubatorDefinition {
  id: IncubatorTypeId;
  displayName: string;
  // Divides an egg's own requiredBattlesStandard (features/eggs/data/
  // egg-definitions.ts) to produce that incubation's real target — 1 for
  // Standard means "no change", a future x2 incubator would use 2 here
  // (half the battles needed) with zero schema change: nothing in
  // prisma/schema.prisma stores this multiplier or assumes "1 battle = 1
  // progress" anywhere — see PlayerEggIncubation's own doc comment. Kept
  // configurable here, at the definition layer, exactly per this phase's
  // own "future speed support" requirement.
  speedMultiplier: number;
  // Every player receives this incubator permanently (see
  // features/eggs/services/incubator.service.ts's ensureStandardIncubator)
  // — never purchased, never consumed, never tradeable. Phase 1 defines
  // only this one entry; a future purchasable/consumable incubator type
  // would need its own acquisition flow this flag deliberately doesn't
  // attempt to anticipate yet.
  isPermanentDefault: boolean;
}

export const STANDARD_INCUBATOR_TYPE_ID: IncubatorTypeId = "standard";

// The one source of truth for every incubator type's static facts — same
// "definitions live in one data module, never duplicated in services/UI"
// rule egg-definitions.ts already follows. Exactly one entry for Phase 1;
// adding a future x2/faster incubator is a new entry here plus its own
// acquisition path (not yet in scope), never a change to this shape or to
// PlayerIncubator/PlayerEggIncubation's own columns.
export const INCUBATOR_DEFINITIONS: readonly IncubatorDefinition[] = [
  {
    id: "standard",
    displayName: "אינקובטור רגיל",
    speedMultiplier: 1,
    isPermanentDefault: true,
  },
];

export function getIncubatorDefinition(incubatorTypeId: string): IncubatorDefinition {
  const definition = INCUBATOR_DEFINITIONS.find((candidate) => candidate.id === incubatorTypeId);
  if (!definition) {
    throw new Error(`No incubator definition exists for type "${incubatorTypeId}"`);
  }
  return definition;
}
