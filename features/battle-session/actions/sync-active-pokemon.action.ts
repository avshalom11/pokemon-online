"use server";

import { syncActivePokemon } from "@/features/battle-session/services/battle-session.service";
import { syncActivePokemonSchema } from "@/features/battle-session/validation/battle-session.schema";
import { getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// The only place FieldBattleSession.activePlayerPokemonId is written after
// creation — called fire-and-forget from BattleContent on every voluntary
// switch and forced replacement. Re-validates that the claimed id is
// actually a current, owned party member before persisting it — a client
// can request "make this my active Pokémon", but never supply an id
// belonging to another player or one that isn't currently in the party.
export async function syncActivePokemonAction(playerPokemonId: string): Promise<void> {
  const session = await getCurrentSession();
  if (!session) return;

  const parsed = syncActivePokemonSchema.safeParse({ playerPokemonId });
  if (!parsed.success) return;

  const profile = await getPlayerProfile(session.user.id);
  const party = await getPlayerParty(profile.id);
  const isOwnPartyMember = party.some((pokemon) => pokemon.id === parsed.data.playerPokemonId);
  if (!isOwnPartyMember) return;

  await syncActivePokemon(profile.id, parsed.data.playerPokemonId);
}
