"use server";

import { searchPlayersByUsername } from "@/features/player-search/services/player-search.service";
import type { PlayerSearchResultView } from "@/features/player-search/types";
import { getCurrentSession } from "@/lib/auth/auth-session";

// Server-side only, same "resolve the session, delegate to the service"
// shape as every other action file in this codebase. Only an authenticated
// player may search — an unauthenticated caller gets an empty list, never
// throws (same defensive shape Global Chat's own read action already
// establishes).
export async function searchPlayersByUsernameAction(rawQuery: string): Promise<PlayerSearchResultView[]> {
  const session = await getCurrentSession();
  if (!session) return [];

  return searchPlayersByUsername(rawQuery);
}
