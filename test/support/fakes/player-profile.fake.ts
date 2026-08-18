import { prisma } from "./prisma.fake.ts";

// Stand-in for `@/lib/auth/player-profile`. Identity mapping (profile id ==
// session user id) is deliberate: tests control ownership entirely through
// the session user id (see auth-session.fake.ts's __setSession) and the
// playerId seeded on a fake PlayerPokemon row, so no extra mapping table is
// needed to exercise the "different player" rejection path.
export async function getPlayerProfile(userId: string): Promise<{ id: string }> {
  return { id: userId };
}

// GYMS & LEAGUES PHASE 9 — mirrors the real getPlayerProfilesByIds against
// the same in-memory fake PlayerProfile rows every other fake table here
// already uses, so a test that seeds a displayName via seedPlayerProfile
// sees that exact name resolved back out.
export async function getPlayerProfilesByIds(playerIds: readonly string[]): Promise<Map<string, string>> {
  if (playerIds.length === 0) return new Map();
  const rows = await prisma.playerProfile.findMany({ where: { id: { in: [...new Set(playerIds)] } } });
  return new Map(rows.map((row: { id: string; displayName: string }) => [row.id, row.displayName]));
}
