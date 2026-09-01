import "server-only";

import { prisma } from "@/lib/db/prisma";

// STAFF / MODERATION — PHASE 6. The staff-admin counterpart to Phase 5's
// resolveChatMessageTarget: the client never sends a raw playerId for a
// staff appointment/removal target — only the username a player-search
// result already carries (features/player-search/types.ts's
// PlayerSearchResultView has no playerId at all, by design — see that
// file's own doc comment). This resolves that public username to the
// real PlayerProfile.id server-side, the one place a staff-management
// Server Action ever turns client input into a trusted target identity.
//
// PlayerProfile.id is NOT the same as User.id (a real, separate cuid —
// unlike this project's own test fakes, which deliberately collapse the
// two for simplicity, see test/support/fakes/prisma.fake.ts's own doc
// comment) — this is why the lookup goes through the `playerProfile`
// relation rather than returning the User row's own id directly.
export async function resolveUsernameToPlayerId(username: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { playerProfile: { select: { id: true } } },
  });
  return user?.playerProfile?.id ?? null;
}
