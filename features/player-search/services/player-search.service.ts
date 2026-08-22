import "server-only";

import { PLAYER_SEARCH_RESULT_LIMIT } from "@/features/player-search/config/player-search.config";
import type { PlayerSearchResultView } from "@/features/player-search/types";
import { getAvatarImageUrl } from "@/features/profile/themes/profile-avatars";
import { prisma } from "@/lib/db/prisma";

// PLAYER SEARCH — the one clean service every search entry point (the
// sidebar modal today; anything else later) calls through — never a direct
// Prisma query from a client/React component. Server-side only:
//
//  - trims the query; an empty query returns no results (never "the full
//    player database" — this project's own established search-pattern
//    default for "nothing typed yet", same as e.g. an unset filter
//    elsewhere in this codebase never silently listing everyone).
//  - case-insensitive PARTIAL match on User.username (`contains` +
//    `mode: "insensitive"` — Postgres-native, no extra normalization
//    needed).
//  - capped at PLAYER_SEARCH_RESULT_LIMIT.
//  - selects ONLY safe public identity fields (username, displayName, and
//    an avatar resolved through the existing curated-avatar helper —
//    features/profile/themes/profile-avatars.ts, the same one
//    ProfileHeader already uses) — never email, any other User/Auth
//    column, or any privacy-gated PublicProfileView field (party, stats,
//    aboutMe, achievements). Finding a player through search grants
//    exactly this, nothing more; visiting their real profile still goes
//    through getPublicProfileView's own full privacy rules unchanged.
export async function searchPlayersByUsername(rawQuery: string): Promise<PlayerSearchResultView[]> {
  const query = rawQuery.trim();
  if (query.length === 0) return [];

  const rows = await prisma.user.findMany({
    where: { username: { contains: query, mode: "insensitive" } },
    select: { username: true, playerProfile: { select: { displayName: true, avatarDexNumber: true } } },
    take: PLAYER_SEARCH_RESULT_LIMIT,
  });

  const results: PlayerSearchResultView[] = [];
  for (const row of rows) {
    if (!row.username || !row.playerProfile) continue;
    results.push({
      username: row.username,
      displayName: row.playerProfile.displayName,
      avatarUrl: getAvatarImageUrl(row.playerProfile.avatarDexNumber ?? null),
    });
  }
  return results;
}
