"use server";

import { revalidatePath } from "next/cache";

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

  // Every route that renders this Pokémon's HP outside of battle was
  // rendered (and client-side Router Cached) before the battle started, so
  // without this, navigating back there via Link/router.push/replace/back
  // reuses that pre-battle cached RSC payload instead of asking the server
  // for the value just written above — only a full manual reload bypassed
  // the client cache and showed the truth. revalidatePath here marks each
  // path's client-side cache entry stale so the *next* navigation to it
  // (however the player got there — escape, faint, capture, or otherwise)
  // always re-fetches fresh, no matter which route this action is called
  // from mid-battle.
  revalidatePath("/home");
  revalidatePath("/my-pokemon");
  revalidatePath("/pokemon-center");
}
