"use server";

import { syncActivePokemon, type SyncActivePokemonResult } from "@/features/battle-session/services/battle-session.service";
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
//
// Phase 7 — `force` must be true for a forced replacement after fainting
// (BattleContent's handleForcedReplacementSelect) and omitted/false for a
// voluntary switch (handleVoluntarySwitchSelect), which the underlying
// service now rejects while the active Pokémon is trapped. The client
// already gates this itself for a fast UX (playerVolatile.trapped), but
// this remains fire-and-forget — the actual source of truth is that the
// switch simply never persists when rejected, exactly like every other
// invalid-state case this action already silently no-ops on above.
export async function syncActivePokemonAction(playerPokemonId: string, force?: boolean): Promise<SyncActivePokemonResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "ok" };

  const parsed = syncActivePokemonSchema.safeParse({ playerPokemonId });
  if (!parsed.success) return { status: "ok" };

  const profile = await getPlayerProfile(session.user.id);
  const party = await getPlayerParty(profile.id);
  const isOwnPartyMember = party.some((pokemon) => pokemon.id === parsed.data.playerPokemonId);
  if (!isOwnPartyMember) return { status: "ok" };

  return syncActivePokemon(profile.id, parsed.data.playerPokemonId, { force });
}
