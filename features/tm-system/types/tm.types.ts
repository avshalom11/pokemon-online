import type { MoveType } from "@/engine/moves";

// TM SYSTEM PHASE 1 — data foundation only. Not yet wired into the Shop,
// Inventory, or Marketplace (see features/tm-system/data/tm-catalog.ts's own
// doc comment) — this type exists purely so the catalog has a validated
// shape to conform to.
//
// itemId is always "tm-<moveId>" (e.g. "tm-thunderbolt") — deliberately
// never a numeric TM slot ("tm24"), per this feature's own "no
// generation-specific TM numbers" product rule. A future Shop-facing display
// name is always built as `TM – ${move.name}`, never derived from itemId.
//
// moveId always resolves against the real move registry (engine/moves) —
// enforced at module load by validateTmCatalog in ../data/tm-catalog.ts, the
// same "validate the static list once at load, then trust it everywhere
// else" convention engine/moves' own ALL_MOVE_DEFINITIONS and
// engine/learnsets' ALL_LEARNSET_DEFINITIONS already establish.
export interface TmCatalogEntry {
  itemId: string;
  moveId: string;

  // The move's own Pokémon type — also what selects this TM's shared image
  // (see tmTypeImagePath in ../media/tm-item-media-paths.ts): every TM of
  // the same type shares one image, never a per-move file. Cross-checked
  // against the real move's own `type` at validation time, so this can
  // never silently drift from the move it names.
  type: MoveType;

  // Shared per-type artwork path — always tmTypeImagePath(type), never
  // hand-typed, so every entry of the same type can never point at a
  // different file. The 18 underlying PNGs are a separate asset-drop task;
  // this phase is data-only and never checks the file exists on disk.
  imagePath: string;
}
