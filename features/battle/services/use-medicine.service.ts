import "server-only";

import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { getInventoryItemQuantity, removeInventoryItem } from "@/features/inventory/services/inventory.service";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import { prisma } from "@/lib/db/prisma";

export type MedicineItemUseResult =
  | { status: "success"; itemName: string; newHp: number; remainingQuantity: number }
  | { status: "invalid-item" }
  | { status: "not-owned" }
  | { status: "no-item" }
  | { status: "invalid-target" };

// Server-side resolution of one in-battle medicine use — the only place a
// medicine item's effect is ever applied. Ownership/quantity/effect are
// always resolved here against the player's own inventory and the static
// Shop catalog; a client-sent heal amount, percent, or target is never
// trusted. The effect kind and percentage are always read straight off the
// item's own catalog entry (item.medicineEffectKind/healPercent —
// features/shop/data/shop-items.ts, features/shop/types/shop.types.ts) —
// never a separate hardcoded map here, and never derived from price: two
// items could share a price tier with entirely different healing amounts,
// and price changes must never silently change what an item actually does.
//
// The inventory decrement (removeInventoryItem — the same atomic
// gte-guarded idiom the Shop's own sell flow and capture.service.ts's ball
// consumption use) and the HP write always happen inside one transaction,
// so "an item is only ever consumed together with its effect actually
// landing" can't desync — an invalid target (see the isFainted checks
// below) is rejected before the transaction even opens, so it never
// touches inventory at all.
export async function applyMedicineItemUse(
  playerId: string,
  itemId: string,
  playerPokemonId: string
): Promise<MedicineItemUseResult> {
  const item = getShopItemById(itemId);
  if (!item || item.categoryId !== "potions" || !item.medicineEffectKind || item.healPercent === undefined) {
    return { status: "invalid-item" };
  }

  const pokemon = await prisma.playerPokemon.findUnique({ where: { id: playerPokemonId } });
  if (!pokemon || pokemon.playerId !== playerId) {
    return { status: "not-owned" };
  }

  const species = getSpeciesById(pokemon.speciesId);
  if (!species) {
    return { status: "invalid-target" };
  }

  const maxHp = calculatePokemonHpStat(species.baseStats.health, pokemon.level);
  const isFainted = pokemon.currentHp <= 0;

  // Healing items cannot target a fainted Pokémon; Revive items can only
  // ever target one — see this function's own doc comment.
  if (item.medicineEffectKind === "revive" && !isFainted) {
    return { status: "invalid-target" };
  }
  if (item.medicineEffectKind === "heal" && isFainted) {
    return { status: "invalid-target" };
  }

  // Always calculated from MAX HP, never current HP — a percentage-based
  // item restores the same fraction of a Pokémon's total health regardless
  // of how much it's already lost. Heal amounts round to the nearest whole
  // number (Math.round — e.g. 15 × 0.5 = 7.5 rounds up to 8) per this
  // task's own spec; Revive/Max Revive keep their pre-existing rounding
  // (Math.floor) unchanged so their exact restored amount never shifts —
  // at healPercent 1 (Max Revive) the two are identical anyway (maxHp is
  // already a whole number), so this only matters for plain Revive's 0.5.
  const newHp =
    item.medicineEffectKind === "revive"
      ? Math.min(maxHp, Math.floor(maxHp * item.healPercent))
      : Math.min(maxHp, pokemon.currentHp + Math.round(maxHp * item.healPercent));

  return prisma.$transaction(async (tx) => {
    const removed = await removeInventoryItem(tx, playerId, itemId, 1);
    if (!removed) {
      return { status: "no-item" };
    }
    const remainingQuantity = await getInventoryItemQuantity(tx, playerId, itemId);

    await tx.playerPokemon.update({ where: { id: playerPokemonId }, data: { currentHp: newHp } });

    return { status: "success", itemName: item.name, newHp, remainingQuantity };
  });
}
