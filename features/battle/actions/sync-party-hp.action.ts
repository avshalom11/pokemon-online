"use server";

import { calculateBattleStats } from "@/engine/battle/stat-calculation";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import { prisma } from "@/lib/db/prisma";

// The only place PlayerPokemon.currentHp is ever written after creation.
// See BattleContent's doc comment for the full "HP authority" decision: the
// DB is always the single authoritative source, and this write-through
// action is what keeps it that way during a battle session — React state in
// BattleContent is a live mirror, not a second source of truth.
//
// Never trusts a client-sent max HP or a client-sent playerId: `maxHp` is
// recomputed here from the row's own species/level, and the row is only
// updated if it actually belongs to the session's own player.
export async function syncPartyHpAction(playerPokemonId: string, currentHp: number): Promise<void> {
  const session = await getCurrentSession();
  if (!session) return;

  const profile = await getPlayerProfile(session.user.id);
  const pokemon = await prisma.playerPokemon.findUnique({ where: { id: playerPokemonId } });

  if (!pokemon || pokemon.playerId !== profile.id) {
    return;
  }

  const species = getSpeciesById(pokemon.speciesId);
  if (!species) return;

  const maxHp = calculateBattleStats(species.baseStats, pokemon.level).health;
  const clampedHp = Math.max(0, Math.min(maxHp, currentHp));

  await prisma.playerPokemon.update({
    where: { id: playerPokemonId },
    data: { currentHp: clampedHp },
  });
}
