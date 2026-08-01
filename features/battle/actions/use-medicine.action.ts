"use server";

import { revalidatePath } from "next/cache";

import { applyMedicineItemUse, type MedicineItemUseResult } from "@/features/battle/services/use-medicine.service";
import { useMedicineItemSchema } from "@/features/battle/validation/use-medicine.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type MedicineItemUseActionResult = MedicineItemUseResult | { status: "error" };

// Invoked directly from the battle screen's Bag (not a <form>), same shape
// as attemptCaptureAction/purchaseShopItemAction — session resolution,
// schema validation, and the actual item/target/ownership checks
// (use-medicine.service.ts) all run server-side, never trusting the
// client's idea of heal amount or which Pokémon is eligible.
export async function applyMedicineItemAction(itemId: string, playerPokemonId: string): Promise<MedicineItemUseActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = useMedicineItemSchema.safeParse({ itemId, playerPokemonId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await applyMedicineItemUse(profile.id, parsed.data.itemId, parsed.data.playerPokemonId);

  if (result.status === "success") {
    // Same revalidation syncPartyHpAction/executeBattleActionAction already
    // do whenever a party Pokémon's HP changed something a pre-battle-
    // cached route displays.
    revalidatePath("/home");
    revalidatePath("/my-pokemon");
    revalidatePath("/pokemon-center");
  }

  return result;
}
