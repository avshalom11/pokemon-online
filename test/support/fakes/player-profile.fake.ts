// Stand-in for `@/lib/auth/player-profile`. Identity mapping (profile id ==
// session user id) is deliberate: tests control ownership entirely through
// the session user id (see auth-session.fake.ts's __setSession) and the
// playerId seeded on a fake PlayerPokemon row, so no extra mapping table is
// needed to exercise the "different player" rejection path.
export async function getPlayerProfile(userId: string): Promise<{ id: string }> {
  return { id: userId };
}
