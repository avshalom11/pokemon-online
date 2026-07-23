"use server";

import { revalidatePath } from "next/cache";

import { releasePokemon, type ReleasePokemonResult } from "@/features/pokemon/services/release-pokemon.service";
import { releasePokemonSchema } from "@/features/pokemon/validation/release-pokemon.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// Plain async-callable Server Action (not a <form> action), same pattern as
// features/party/actions/party.actions.ts — the My Pokémon release dialog
// wants an inline result, not a page navigation. Resolves the caller's own
// profile id from the session itself; a client can request a release, but
// never supply which player it applies to, and the id it names is
// re-validated for ownership inside releasePokemon regardless.
export type ReleasePokemonActionResult = ReleasePokemonResult | { status: "error" };

export async function releasePokemonAction(playerPokemonId: string): Promise<ReleasePokemonActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = releasePokemonSchema.safeParse({ playerPokemonId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await releasePokemon(profile.id, parsed.data.playerPokemonId);

  revalidatePath("/my-pokemon");
  return result;
}
