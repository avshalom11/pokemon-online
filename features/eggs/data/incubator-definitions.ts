export type IncubatorTypeId = "regular" | "advanced" | "ultra" | "master";

export interface IncubatorDefinition {
  id: IncubatorTypeId;
  displayName: string;
  // INCUBATOR SPEED MODEL — divides the egg's own requiredBattlesStandard
  // (features/eggs/data/egg-definitions.ts) once, at incubation-start time,
  // to produce that incubation's own requiredBattleTarget (features/eggs/
  // services/incubation.service.ts's startIncubatingEgg — always
  // Math.ceil(requiredBattlesStandard / speedMultiplier)). This is the ONLY
  // place speedMultiplier is ever used in incubation math: every eligible
  // field-battle victory afterward always adds a flat +1 to
  // battleProgress, regardless of incubator — the speed lives entirely in
  // a SHORTER target, never in a bigger per-victory increment. (An earlier
  // revision of this feature scaled battleProgress itself by the
  // multiplier instead — deliberately reverted; see this phase's own
  // report for why.)
  speedMultiplier: number;
  imageUrl: string;
}

export const REGULAR_INCUBATOR_TYPE_ID: IncubatorTypeId = "regular";

// The one source of truth for every incubator type's static facts — same
// "definitions live in one data module, never duplicated in services/UI"
// rule egg-definitions.ts already follows. Shop price/currency deliberately
// do NOT live here (same split as EGG_DEFINITIONS vs. shop-items.ts's own
// EGG_PRICES): price is a Shop-domain fact, not an incubator-domain one —
// see features/shop/data/shop-items.ts's own INCUBATOR_PRICES.
export const INCUBATOR_DEFINITIONS: readonly IncubatorDefinition[] = [
  {
    id: "regular",
    displayName: "אינקובטור רגיל",
    speedMultiplier: 1,
    imageUrl: "/images/eggs/regular.png",
  },
  {
    id: "advanced",
    displayName: "אינקובטור מתקדם",
    speedMultiplier: 1.5,
    imageUrl: "/images/eggs/advanced.png",
  },
  {
    id: "ultra",
    displayName: "אינקובטור אולטרה",
    speedMultiplier: 2,
    imageUrl: "/images/eggs/ultra.png",
  },
  {
    id: "master",
    displayName: "אינקובטור מאסטר",
    speedMultiplier: 3,
    imageUrl: "/images/eggs/master.png",
  },
];

export function getIncubatorDefinition(incubatorTypeId: string): IncubatorDefinition {
  const definition = INCUBATOR_DEFINITIONS.find((candidate) => candidate.id === incubatorTypeId);
  if (!definition) {
    throw new Error(`No incubator definition exists for type "${incubatorTypeId}"`);
  }
  return definition;
}
