import "server-only";

import { getTodayBattleCount } from "@/features/daily-battles/services/daily-battle-count.service";
import { getRecentGlobalChatMessages } from "@/features/chat/services/global-chat.service";
import type { GlobalChatMessageView } from "@/features/chat/types";
import { getFirstPendingEvolutionBranchView, getFirstPendingEvolutionView } from "@/features/evolution/queries/evolution-queries";
import type { PendingEvolutionBranchView, PendingEvolutionView } from "@/features/evolution/types/evolution.types";
import { getOwnedPokemonStats, getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getSignificantCaptures, type SignificantCaptures } from "@/features/home/services/significant-captures.service";
import { getOnlinePlayerCount } from "@/features/presence/services/presence.service";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

export interface HomeViewData {
  party: OwnedPokemon[];

  stats: {
    totalCaught: number;
    dexCompletionPercent: number;
  };

  // Today's (Asia/Jerusalem) wild-Pokémon-victory count — see
  // features/daily-battles/services/daily-battle-count.service.ts for what
  // counts as an increment (only a confirmed defeat, never starting/
  // restoring a battle, escaping, or capturing). Home-only: never fetched
  // or shown by Map/Battle.
  dailyBattleCount: number;

  // The safety-net evolution prompt (features/evolution/components/
  // PendingEvolutionGate.tsx) — null unless the player has an unresolved
  // evolution decision left over from a battle they didn't finish
  // deciding on (the primary trigger is in-battle, BattleContent itself;
  // see features/evolution's own architecture notes for why both exist).
  pendingEvolution: PendingEvolutionView | null;

  // Same safety net, for an unresolved Branch Evolution CHOICE instead
  // (Eevee's Espeon/Umbreon fork) — mutually exclusive with pendingEvolution
  // above for any one Pokémon, but both are independently queried since two
  // different owned Pokémon could theoretically each have one pending at
  // once; PendingEvolutionGate only ever surfaces the first one it's given.
  pendingEvolutionBranch: PendingEvolutionBranchView | null;

  // HOME — SIGNIFICANT CAPTURES — a site-wide (not per-player) feed: the
  // latest Very Rare/Legendary capture from ANY player, across all time
  // (not daily-reset). See significant-captures.service.ts.
  significantCaptures: SignificantCaptures;

  // GLOBAL CHAT — HOME EMBED. Home is the one page that presents chat as an
  // actual page section (features/chat/components/HomeChatPanel.tsx)
  // instead of the fixed bottom overlay every other page gets — this seeds
  // that panel's first paint with the real latest messages, the exact same
  // read app/(game)/layout.tsx already uses to seed the overlay bar
  // elsewhere. The panel's own polling (features/chat/actions/
  // global-chat.actions.ts) keeps it live after that.
  globalChatMessages: GlobalChatMessageView[];

  // ONLINE PRESENCE — HOME ONLINE COUNT. Seeds OnlinePlayersCounter's first
  // paint; that component's own light poll (features/presence/config/
  // presence.config.ts's PRESENCE_READ_POLL_INTERVAL_MS) keeps it live
  // after that, same "server seeds first paint, client poll keeps it live"
  // pattern globalChatMessages above already establishes.
  onlinePlayerCount: number;
}

// Single aggregator for everything app/(game)/home/page.tsx needs, so the
// page itself stays a thin display layer (per PROJECT_RULES: "pages should
// display data") instead of juggling calls itself. Profile-level display
// fields (displayName, level, xp, coins, gold) live in
// features/player/services/player-header-data.service.ts instead — the
// global header (app/(game)/layout.tsx) is the only thing that needs them,
// so they're not duplicated here.
export async function getHomeViewData(userId: string): Promise<HomeViewData> {
  const profile = await getPlayerProfile(userId);
  const [
    party,
    stats,
    dailyBattleCount,
    pendingEvolution,
    pendingEvolutionBranch,
    significantCaptures,
    globalChatMessages,
    onlinePlayerCount,
  ] = await Promise.all([
    getPlayerParty(profile.id),
    getOwnedPokemonStats(profile.id),
    getTodayBattleCount(profile.id),
    getFirstPendingEvolutionView(profile.id),
    getFirstPendingEvolutionBranchView(profile.id),
    getSignificantCaptures(),
    getRecentGlobalChatMessages(),
    getOnlinePlayerCount(),
  ]);

  const dexSize = POKEMON_DATA.length;
  const dexCompletionPercent = dexSize > 0 ? Math.round((stats.uniqueSpeciesCaught / dexSize) * 100) : 0;

  return {
    party,
    stats: {
      totalCaught: stats.totalCaught,
      dexCompletionPercent,
    },
    dailyBattleCount,
    pendingEvolution,
    pendingEvolutionBranch,
    significantCaptures,
    globalChatMessages,
    onlinePlayerCount,
  };
}
