// GYMS & LEAGUES PHASE 3 — Gym Battle Engine shapes.
export type NpcBattleSource = "gym" | "regional-champion";

// One resolved NPC team member for a live attempt — the fixed species
// (Phase 2) plus its ONE level, resolved once at battle start via
// resolveNpcTeamLevels (Phase 2's pure resolver) and frozen for the whole
// attempt (see gym-battle-session.service.ts's own doc comment).
export interface NpcBattleTeamMember {
  readonly speciesId: string;
  readonly level: number;
}
