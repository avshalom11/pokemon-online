"use server";

import { revalidatePath } from "next/cache";

import { acceptEvolution, type AcceptEvolutionResult } from "@/features/evolution/services/accept-evolution.service";
import { rejectEvolution, type RejectEvolutionResult } from "@/features/evolution/services/reject-evolution.service";
import { evolutionDecisionSchema } from "@/features/evolution/validation/evolution.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type AcceptEvolutionActionResult = AcceptEvolutionResult | { status: "error" };
export type RejectEvolutionActionResult = RejectEvolutionResult | { status: "error" };

// Both thin Server Action wrappers — same shape as every other action file
// in this codebase (resolve the session, resolve the profile, validate,
// delegate to the service). Ownership is re-enforced inside each service
// regardless, never trusted from the client.
export async function acceptEvolutionAction(playerPokemonId: string): Promise<AcceptEvolutionActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = evolutionDecisionSchema.safeParse({ playerPokemonId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await acceptEvolution(profile.id, parsed.data.playerPokemonId);

  if (result.status === "success") {
    // Species/HP changed — same revalidation precedent syncPartyHpAction/
    // applyMedicineItemAction already establish for every route that
    // renders this Pokémon outside of battle.
    revalidatePath("/home");
    revalidatePath("/my-pokemon");
    revalidatePath("/pokemon-center");
  }

  return result;
}

export async function rejectEvolutionAction(playerPokemonId: string): Promise<RejectEvolutionActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = evolutionDecisionSchema.safeParse({ playerPokemonId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await rejectEvolution(profile.id, parsed.data.playerPokemonId);

  if (result.status === "success") {
    revalidatePath("/home");
    revalidatePath("/my-pokemon");
  }

  return result;
}
