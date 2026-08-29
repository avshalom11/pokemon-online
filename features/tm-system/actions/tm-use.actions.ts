"use server";

import { revalidatePath } from "next/cache";

import { getTmUseCandidates, type TmUseCandidatesResult } from "@/features/tm-system/services/tm-use-eligibility.service";
import { teachTm, type TeachTmResult } from "@/features/tm-system/services/teach-tm.service";
import { teachTmDecisionSchema, tmUseCandidatesRequestSchema } from "@/features/tm-system/validation/teach-tm.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type TmUseCandidatesActionResult = TmUseCandidatesResult | { status: "error" };
export type TeachTmActionResult = TeachTmResult | { status: "error" };

// Both thin Server Action wrappers — same shape as every other action file
// in this codebase (resolve the session, resolve the profile, validate,
// delegate to the service). Ownership, compatibility, availability, and
// every other real rule are re-enforced inside the services regardless,
// never trusted from the client — this file never duplicates that logic.
export async function getTmUseCandidatesAction(itemId: string): Promise<TmUseCandidatesActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = tmUseCandidatesRequestSchema.safeParse({ itemId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  return getTmUseCandidates(profile.id, parsed.data.itemId);
}

export async function teachTmAction(
  playerPokemonId: string,
  itemId: string,
  forgetSlot?: number
): Promise<TeachTmActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = teachTmDecisionSchema.safeParse({ playerPokemonId, itemId, forgetSlot });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await teachTm(profile.id, parsed.data.playerPokemonId, parsed.data.itemId, parsed.data.forgetSlot);

  if (result.status === "success") {
    // TM quantity changed (Inventory) and this Pokémon's moveset changed
    // (My Pokémon) — same revalidation precedent acceptEvolutionItemAction
    // already establishes for its own item-consumption + Pokémon-mutation
    // shape.
    revalidatePath("/inventory");
    revalidatePath("/my-pokemon");
  }

  return result;
}
