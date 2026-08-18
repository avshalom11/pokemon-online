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

// GYM BATTLE RESULT DIALOG FIX (later task) — mirrors the real
// getCurrentSessionFast (lib/auth/auth-session.ts): a lighter session
// check with the exact same underlying session as getCurrentSession
// above, needed so gym-battle.actions.ts (which uses this for its hot,
// repeat-call turn-action paths) can be imported and exercised end-to-end
// under this fake, not just its own underlying service layer.
export async function getCurrentSessionFast(): Promise<FakeSession | null> {
  return currentSession;
}
