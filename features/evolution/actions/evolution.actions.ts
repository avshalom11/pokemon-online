"use server";

import { revalidatePath } from "next/cache";

import { acceptEvolution, type AcceptEvolutionResult } from "@/features/evolution/services/accept-evolution.service";
import { acceptEvolutionItem, type AcceptEvolutionItemResult } from "@/features/evolution/services/accept-evolution-item.service";
import { chooseEvolutionBranch, type ChooseEvolutionBranchResult } from "@/features/evolution/services/evolution-progress.service";
import { rejectEvolution, type RejectEvolutionResult } from "@/features/evolution/services/reject-evolution.service";
import { evolutionBranchChoiceSchema, evolutionDecisionSchema, evolutionItemDecisionSchema } from "@/features/evolution/validation/evolution.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type AcceptEvolutionActionResult = AcceptEvolutionResult | { status: "error" };
export type RejectEvolutionActionResult = RejectEvolutionResult | { status: "error" };
export type AcceptEvolutionItemActionResult = AcceptEvolutionItemResult | { status: "error" };
export type ChooseEvolutionBranchActionResult = ChooseEvolutionBranchResult | { status: "error" };

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

// Inventory's Evolution-Item evolution accept — same thin wrapper shape as
// acceptEvolutionAction above (resolve session, resolve profile, validate,
// delegate to the service, revalidate on success), reused as-is rather than
// forking a new pattern. Ownership, item ownership/quantity, and the
// species/item pairing are all re-enforced inside acceptEvolutionItem
// regardless of what the client sends. Covers Stones and the former
// Trade-item evolutions alike — no trade of any kind is ever involved.
export async function acceptEvolutionItemAction(
  playerPokemonId: string,
  itemId: string,
  targetSpeciesId?: string
): Promise<AcceptEvolutionItemActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = evolutionItemDecisionSchema.safeParse({ playerPokemonId, itemId, targetSpeciesId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await acceptEvolutionItem(profile.id, parsed.data.playerPokemonId, parsed.data.itemId, parsed.data.targetSpeciesId);

  if (result.status === "success") {
    // Item quantity + species/HP changed — same revalidation set
    // acceptEvolutionAction already uses, plus /inventory itself (the item
    // count shown there must never go stale).
    revalidatePath("/inventory");
    revalidatePath("/home");
    revalidatePath("/my-pokemon");
    revalidatePath("/pokemon-center");
  }

  return result;
}

// Eevee's (and any future species') Branch Evolution choice — the first
// step of a two-step flow: this only ever moves the Pokémon from "has an
// unresolved branch choice" to "has a normal single-target pending
// evolution" (see evolution-progress.service.ts's chooseEvolutionBranch's
// own doc comment); the player still confirms via the normal
// acceptEvolutionAction/rejectEvolutionAction afterward, exactly like any
// other level evolution. Revalidates the same routes acceptEvolutionAction
// does, since a successful choice changes what the pending-evolution
// prompt on those routes shows next.
export async function chooseEvolutionBranchAction(
  playerPokemonId: string,
  chosenSpeciesId: string
): Promise<ChooseEvolutionBranchActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = evolutionBranchChoiceSchema.safeParse({ playerPokemonId, chosenSpeciesId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await chooseEvolutionBranch(profile.id, parsed.data.playerPokemonId, parsed.data.chosenSpeciesId);

  if (result.status === "success") {
    revalidatePath("/home");
  }

  return result;
}
