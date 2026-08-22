// Plain shared shape for PLAYER SEARCH (features/player-search) —
// deliberately no "server-only" import here, so the client modal can
// import this type directly, same "server-only service, plain shared
// types" split every other feature in this codebase already establishes.

// Only safe public identity fields — never email, an internal id, or any
// other private/hidden profile data. See player-search.service.ts's own
// doc comment for exactly what's selected to build this.
export interface PlayerSearchResultView {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}
