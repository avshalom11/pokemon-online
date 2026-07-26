// Stand-in for `@/lib/auth/auth-session`, redirected in by ../alias-loader.mjs
// for the same reason as prisma.fake.ts: the real module depends on
// next/headers + better-auth + a live DB, none of which are available or
// wanted for these isolated persistence tests. Only the one shape the
// actions layer actually reads (`session.user.id`) is modeled.
export interface FakeSession {
  user: { id: string };
}

let currentSession: FakeSession | null = { user: { id: "test-player" } };

export function __setSession(session: FakeSession | null) {
  currentSession = session;
}

export async function getCurrentSession(): Promise<FakeSession | null> {
  return currentSession;
}
