import { deriveGymNpcLevelRange } from "../config/gym-level-scaling-lookup";
import type { GymDifficulty } from "../types/gym.types";

// GYMS & LEAGUES PHASE 2 — the reusable pure resolver Phase 3 will call to
// turn a fixed team + a specific battle attempt's player level into actual
// battle levels. Deliberately simple and generic: it only ever reads
// Phase 1's Gym scaling range (deriveGymNpcLevelRange) — it does NOT
// consult evolution-stage legality (see
// gym-npc-evolution-legality-audit.ts for that separate, DETECTION-ONLY
// concern). Baking an automatic legality-based clamp in here would be
// exactly the "silently invent a rule" / "make a game-design decision on
// your behalf" this Phase's spec (section 11) explicitly forbids — that
// decision belongs to Phase 3, once the conflicts this Phase's audit
// surfaces have actually been resolved by the project owner.
//
// Never persists anything — "do not persist a Gym opponent team yet"
// (section 10). Each Pokémon receives its OWN independently-resolved
// level within the same range, never one shared level for the whole team.
export interface ResolvedNpcTeamMember {
  readonly speciesId: string;
  readonly level: number;
}

// Same injectable-randomSource convention as engine/damage/random.ts and
// executeBattleAction's own randomSource param — production callers omit
// it (falls back to Math.random), tests pass a fixed function for
// deterministic, reproducible results.
export function resolveNpcTeamLevels(
  playerLevel: number,
  difficulty: GymDifficulty,
  speciesIds: readonly string[],
  randomSource: () => number = Math.random
): ResolvedNpcTeamMember[] {
  const { minLevel, maxLevel } = deriveGymNpcLevelRange(playerLevel, difficulty);

  return speciesIds.map((speciesId) => ({
    speciesId,
    level: resolveLevelInRange(minLevel, maxLevel, randomSource),
  }));
}

function resolveLevelInRange(minLevel: number, maxLevel: number, randomSource: () => number): number {
  if (maxLevel <= minLevel) return minLevel;

  const span = maxLevel - minLevel + 1;
  const roll = Math.floor(randomSource() * span);
  // Clamped defensively: a randomSource that returns exactly 1 (out of the
  // normal [0, 1) Math.random contract) would otherwise roll one past the
  // top of the range.
  return minLevel + Math.min(roll, span - 1);
}
