"use server";

import { revalidatePath } from "next/cache";

import { applyMedicineItemUse, type MedicineItemUseResult } from "@/features/battle/services/use-medicine.service";
import { useMedicineItemSchema } from "@/features/battle/validation/use-medicine.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type UseStatusMedicineItemActionResult = MedicineItemUseResult | { status: "error" };

// INVENTORY USE OUTSIDE BATTLE — the Inventory-screen counterpart to
// features/battle/actions/use-medicine.action.ts's applyMedicineItemAction.
// Deliberately its own thin action (same "resolve session, validate input,
// delegate to the service" shape as every other action in this codebase)
// rather than reusing that battle action directly: this one revalidates
// Inventory's own routes instead of the battle screen's, and keeping the
// two call sites separate means neither has to guess which caller it's
// being invoked from. The actual cure logic is never duplicated — both
// this action and the battle one call the exact same
// applyMedicineItemUse, which is itself completely unaware of whether the
// caller is in battle or not (no battle-session dependency of any kind).
export async function useStatusMedicineItemAction(itemId: string, playerPokemonId: string): Promise<UseStatusMedicineItemActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = useMedicineItemSchema.safeParse({ itemId, playerPokemonId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await applyMedicineItemUse(profile.id, parsed.data.itemId, parsed.data.playerPokemonId);

  if (result.status === "success") {
    revalidatePath("/inventory");
    revalidatePath("/my-pokemon");
    revalidatePath("/home");
  }

  return result;
}
