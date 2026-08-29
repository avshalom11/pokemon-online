import type { MoveType } from "@/engine/moves";

const TM_IMAGE_ROOT = "/images/items/tms";

// One shared image per Pokémon type — capitalized type name (e.g.
// "fire" -> "/images/items/tms/Fire.png"), never a per-move asset: every TM
// of a given type (see ../data/tm-catalog.ts) points at this exact same
// path. TM SYSTEM PHASE 1 is data-only — the 18 underlying PNGs are a
// separate, later asset-drop task, and this function never checks that the
// file actually exists on disk.
export function tmTypeImagePath(type: MoveType): string {
  const capitalizedType = `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  return `${TM_IMAGE_ROOT}/${capitalizedType}.png`;
}
