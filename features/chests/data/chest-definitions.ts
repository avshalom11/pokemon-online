export type ChestTypeId = "silver" | "gold" | "diamond";

export interface ChestDefinition {
  id: ChestTypeId;
  displayName: string;
  imageUrl: string;
  // Ordinal rank (1 = lowest), for later reward-weighting/opening phases
  // (Phase 2+) to key their own tables off of — deliberately the ONLY
  // "future" metadata this phase adds; no reward pool, no drop weight, no
  // acquisition rule lives here yet (see this module's own doc comment
  // below).
  tier: number;
}

const CHEST_MEDIA_ROOT = "/images/chests";

// CHESTS PHASE 1 — the one source of truth for every chest type's static
// facts, same "definitions live in one data module, never duplicated in
// services/UI" rule egg-definitions.ts/incubator-definitions.ts already
// follow. Exactly 3 entries for Phase 1. Deliberately carries NO reward
// pool, drop weight, price, or acquisition data — this phase is ownership/
// data only; a future phase adds that without ever needing to touch this
// shape again beyond a genuinely new fact.
//
// Image paths point at /images/chests/<id>.png — referenced exactly as
// specified, even though the files don't exist on disk yet (never
// generated as placeholders here).
export const CHEST_DEFINITIONS: readonly ChestDefinition[] = [
  { id: "silver", displayName: "תיבת כסף", imageUrl: `${CHEST_MEDIA_ROOT}/silver.png`, tier: 1 },
  { id: "gold", displayName: "תיבת זהב", imageUrl: `${CHEST_MEDIA_ROOT}/gold.png`, tier: 2 },
  { id: "diamond", displayName: "תיבת יהלום", imageUrl: `${CHEST_MEDIA_ROOT}/diamond.png`, tier: 3 },
];

export function getChestDefinition(chestTypeId: string): ChestDefinition {
  const definition = CHEST_DEFINITIONS.find((candidate) => candidate.id === chestTypeId);
  if (!definition) {
    throw new Error(`No chest definition exists for type "${chestTypeId}"`);
  }
  return definition;
}
