// PLAYER SEARCH — the single tunable this feature needs.

// Maximum results a single search ever returns — enough to be useful,
// never the full player database. player-search.service.ts's own
// searchPlayersByUsername is the one place this is enforced.
export const PLAYER_SEARCH_RESULT_LIMIT = 15;
