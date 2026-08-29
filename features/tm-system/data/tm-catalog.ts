import { getMoveById } from "@/engine/moves";
import type { MoveType } from "@/engine/moves";
import { tmTypeImagePath } from "../media/tm-item-media-paths";
import type { TmCatalogEntry } from "../types/tm.types";

export class TmCatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TmCatalogValidationError";
  }
}

// TM SYSTEM PHASE 1 — DATA FOUNDATION ONLY.
//
// The planned 54-TM catalog: 3 TMs per Pokémon type × 18 types. Every entry
// resolves to a real move in the move registry (engine/moves) — validated
// below, once, at module load — but nothing outside this module reads from
// it yet. It is deliberately NOT wired into the Shop (no ShopItem/category
// exists for it), Inventory, or Marketplace, and carries no price (pricing
// is a separate, later phase) and no per-species/form compatibility (also a
// later phase — this catalog only says WHICH 54 moves exist as TMs, never
// WHICH Pokémon can learn them).
//
// Grouped by type below purely for human readability; TM_CATALOG (the
// flattened, validated export every future consumer should import) carries
// no type-grouping structure of its own.
const TM_MOVE_IDS_BY_TYPE: Record<MoveType, readonly string[]> = {
  fire: ["flamethrower", "fire-blast", "fire-punch"],
  water: ["surf", "waterfall", "liquidation"],
  electric: ["thunderbolt", "thunder", "thunder-punch"],
  grass: ["energy-ball", "solar-beam", "giga-drain"],
  ice: ["ice-beam", "blizzard", "ice-punch"],
  psychic: ["psychic", "psyshock", "zen-headbutt"],
  ghost: ["shadow-ball", "shadow-claw", "hex"],
  dark: ["dark-pulse", "crunch", "foul-play"],
  dragon: ["dragon-pulse", "dragon-claw", "draco-meteor"],
  fairy: ["dazzling-gleam", "play-rough", "draining-kiss"],
  ground: ["earthquake", "dig", "bulldoze"],
  rock: ["rock-slide", "stone-edge", "rock-tomb"],
  fighting: ["brick-break", "close-combat", "drain-punch"],
  poison: ["sludge-bomb", "poison-jab", "venoshock"],
  bug: ["x-scissor", "bug-buzz", "u-turn"],
  steel: ["flash-cannon", "iron-head", "steel-wing"],
  flying: ["air-slash", "aerial-ace", "hurricane"],
  normal: ["body-slam", "hyper-beam", "facade"],
};

function buildCandidateEntries(): TmCatalogEntry[] {
  const entries: TmCatalogEntry[] = [];

  for (const [type, moveIds] of Object.entries(TM_MOVE_IDS_BY_TYPE) as [MoveType, readonly string[]][]) {
    for (const moveId of moveIds) {
      entries.push({
        itemId: `tm-${moveId}`,
        moveId,
        type,
        imagePath: tmTypeImagePath(type),
      });
    }
  }

  return entries;
}

// Validates every candidate entry against the real move registry — moveId
// must resolve there (never merely assumed from this catalog's own say-so),
// itemId must be exactly "tm-<moveId>", and the resolved move's own `type`
// must match the entry's declared `type` (catches a move filed under the
// wrong type group above). Collects every problem before throwing, same
// "report everything wrong in one pass" convention engine/moves'
// validateMoveList and engine/learnsets' validateLearnsetList already
// establish.
export function validateTmCatalog(candidates: readonly TmCatalogEntry[]): TmCatalogEntry[] {
  const problems: string[] = [];
  const seenItemIds = new Map<string, number>();
  const seenMoveIds = new Map<string, number>();

  candidates.forEach((entry, index) => {
    const expectedItemId = `tm-${entry.moveId}`;
    if (entry.itemId !== expectedItemId) {
      problems.push(`[index ${index}] itemId "${entry.itemId}" must be "${expectedItemId}"`);
    }

    const move = getMoveById(entry.moveId);
    if (!move) {
      problems.push(`[index ${index}] moveId "${entry.moveId}" does not exist in the move registry`);
    } else if (move.type !== entry.type) {
      problems.push(
        `[index ${index}] moveId "${entry.moveId}" has type "${move.type}", but this entry declares "${entry.type}"`
      );
    }

    const firstItemIdAt = seenItemIds.get(entry.itemId);
    if (firstItemIdAt !== undefined) {
      problems.push(`[index ${index}] duplicate itemId "${entry.itemId}" (already defined at index ${firstItemIdAt})`);
    } else {
      seenItemIds.set(entry.itemId, index);
    }

    const firstMoveIdAt = seenMoveIds.get(entry.moveId);
    if (firstMoveIdAt !== undefined) {
      problems.push(`[index ${index}] duplicate moveId "${entry.moveId}" (already defined at index ${firstMoveIdAt})`);
    } else {
      seenMoveIds.set(entry.moveId, index);
    }
  });

  if (problems.length > 0) {
    throw new TmCatalogValidationError(
      [`TM catalog validation failed with ${problems.length} problem(s):`, ...problems].join("\n\n")
    );
  }

  return [...candidates];
}

// Single source of truth for the planned TM catalog — validated once at
// module load, then trusted everywhere else, same convention as
// engine/moves' MOVE_REGISTRY/engine/learnsets' LEARNSET_REGISTRY.
export const TM_CATALOG: TmCatalogEntry[] = validateTmCatalog(buildCandidateEntries());

export function getTmCatalogEntryByItemId(itemId: string): TmCatalogEntry | undefined {
  return TM_CATALOG.find((entry) => entry.itemId === itemId);
}

export function getTmCatalogEntryByMoveId(moveId: string): TmCatalogEntry | undefined {
  return TM_CATALOG.find((entry) => entry.moveId === moveId);
}
