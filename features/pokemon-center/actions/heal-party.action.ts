"use server";

import { revalidatePath } from "next/cache";

import { healParty, type HealPartyResult } from "@/features/pokemon-center/services/heal-party.service";
import { healPartySchema } from "@/features/pokemon-center/validation/heal-party.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// Plain async-callable Server Action (not a <form> action) — same pattern as
// features/party/actions/party.actions.ts: the Pokémon Center's healing
// panel wants an inline result, not a page navigation. Resolves the caller's
// own profile id from the session itself; the client can request a heal, but
// never supply which player it applies to.
export type HealPartyActionResult = HealPartyResult | { status: "error" };

export async function healPartyAction(playerPokemonIds: string[]): Promise<HealPartyActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = healPartySchema.safeParse({ playerPokemonIds });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await healParty(profile.id, parsed.data.playerPokemonIds);

  revalidatePath("/pokemon-center");
  return result;
}
