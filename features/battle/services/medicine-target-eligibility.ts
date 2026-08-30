import type { MajorStatus } from "@/features/battle/status/major-status";
import type { ShopItem } from "@/features/shop/types/shop.types";

// The minimal shape this check actually needs — deliberately NOT the full
// OwnedPokemon (or a raw Prisma PlayerPokemon row, or a Gym battle
// participant snapshot): every one of those satisfies this structurally,
// so this same function is reusable by every Medicine-consuming call site
// regardless of which richer shape it happens to be working with.
export interface MedicineEligibilityTarget {
  currentHp: number;
  status: string | null;
}

// Pure, framework-free — the ONE per-(item, target) eligibility rule
// shared by every battle mode/surface that supports Medicine items:
// BattleBagPanel.tsx's MedicineTargetPicker (Field Battle), use-medicine.
// service.ts (the server's own authoritative re-check for both Field
// Battle and Inventory-outside-battle), and gym-battle-item.service.ts
// (Gym Battle — reads the target's LIVE in-battle status from the
// session's own playerBattleStatus map, never the possibly-stale
// PlayerPokemon.status row, since Gym battles don't sync that back until
// certain checkpoints — see gym-battle-item.service.ts's own doc comment).
// A standalone .ts module (not inlined in a .tsx component) purely so it's
// directly unit-testable under this project's plain node:test harness,
// which cannot import a JSX-bearing .tsx file.
//
// Mirrors applyMedicineItemUse's own target rules exactly: Revive only
// enables a fainted target; every other kind requires non-fainted; a
// "cure-status" item additionally requires the target to currently carry a
// MajorStatus that matches curesStatus (or ANY MajorStatus, for Full
// Heal's curesStatus === "all"). Never a hardcoded item id/name check —
// driven entirely by the item's own medicineEffectKind/curesStatus fields.
export function isMedicineTargetEligible(item: ShopItem, pokemon: MedicineEligibilityTarget): boolean {
  const isFainted = pokemon.currentHp <= 0;

  if (item.medicineEffectKind === "revive") return isFainted;
  if (isFainted) return false;

  if (item.medicineEffectKind === "cure-status") {
    const status = pokemon.status as MajorStatus | null;
    if (status === null) return false;
    return item.curesStatus === "all" || status === item.curesStatus;
  }

  return true; // plain "heal"
}
