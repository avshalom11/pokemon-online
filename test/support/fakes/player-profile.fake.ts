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

export interface PlayerIdentity {
  displayName: string;
  username: string | null;
}

// CLICKABLE USERNAMES — mirrors the real getPlayerIdentitiesByIds
// (lib/auth/player-profile.ts) against the same in-memory fake tables
// every other fake function here already uses: PlayerProfile for
// displayName, User for username, joined by the same "one id, both
// tables" identity convention seedPlayerProfile's own `username` option
// establishes (test/support/fakes/prisma.fake.ts).
export async function getPlayerIdentitiesByIds(playerIds: readonly string[]): Promise<Map<string, PlayerIdentity>> {
  if (playerIds.length === 0) return new Map();
  const uniqueIds = [...new Set(playerIds)];
  const rows = await prisma.playerProfile.findMany({ where: { id: { in: uniqueIds } } });
  const result = new Map<string, PlayerIdentity>();
  for (const row of rows as { id: string; displayName: string }[]) {
    const userRow = await prisma.user.findUnique({ where: { id: row.id }, select: { username: true } });
    result.set(row.id, { displayName: row.displayName, username: (userRow as { username: string | null } | null)?.username ?? null });
  }
  return result;
}
