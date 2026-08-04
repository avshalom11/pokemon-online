import "server-only";

import { calculateBaseBattlePokemonXp, distributeBattlePokemonXp, getPokemonLevelProgress } from "./pokemon-progression-calculations";
import type { PokemonLevelUpResult, PokemonXpRewardRole, PokemonXpSource } from "./pokemon-progression-types";
import { applyLevelUpToCurrentHp, calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { tryCreatePendingEvolution } from "@/features/evolution/services/evolution-progress.service";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { applyLevelUpMoveLearning } from "@/features/move-learning/move-learning-service";
import type { Prisma } from "@/lib/generated/prisma/client";

// The only place PlayerPokemon.level/experience are ever written. Always
// takes an existing transaction client rather than opening its own — every
// current caller (grantBattlePokemonXp below, itself only ever called from
// syncWildHp's own exactly-once-guarded transaction) must grant XP
// atomically alongside the rest of that battle's victory resolution, so a
// standalone non-transactional variant would just invite a caller to skip
// that atomicity by accident. Mirrors features/player-progression/
// progression-service.ts's addPlayerExperience field-for-field, but capped
// at MAX_POKEMON_LEVEL instead of uncapped.
//
// `source` isn't persisted anywhere yet (no reward-history table exists) —
// accepted now purely so every call site already states *why* XP was
// granted, so a future reward-history/audit feature or a second XP source
// (trainer battles, raids, quests, items) never has to change this
// function's signature to add it.
export async function applyPokemonXpGrant(
  tx: Prisma.TransactionClient,
  playerPokemonId: string,
  xpAmount: number,
  role: PokemonXpRewardRole,
  xpShare: number,
  source: PokemonXpSource
): Promise<PokemonLevelUpResult> {
  void source;

  const safeXpGained = Math.max(0, Math.floor(xpAmount) || 0);

  const pokemon = await tx.playerPokemon.findUniqueOrThrow({ where: { id: playerPokemonId } });
  const previousLevel = pokemon.level;
  const previousTotalXp = pokemon.experience;
  const newTotalXp = previousTotalXp + safeXpGained;
  const progress = getPokemonLevelProgress(newTotalXp);

  const species = getSpeciesById(pokemon.speciesId);

  // Stats (Phase 2) are always derived from species base stats + level,
  // never persisted — but currentHp *is* persisted, so a level-up must
  // immediately rescale it here rather than leaving it stale against the
  // new maxHp until the next unrelated HP sync. Centralized in
  // engine/battle/pokemon-stat-calculations.ts's applyLevelUpToCurrentHp:
  // gains exactly the max-HP increase, never fully heals, and a fainted
  // Pokémon (0 HP) stays fainted. Falls back to a 1-HP baseline in the
  // (never-expected) case the species can't be found, matching this
  // function's existing species?.name fallback below.
  const previousMaxHp = calculatePokemonHpStat(species?.baseStats.health ?? 1, previousLevel);
  const newMaxHp = calculatePokemonHpStat(species?.baseStats.health ?? 1, progress.level);
  const newCurrentHp = applyLevelUpToCurrentHp({
    previousCurrentHp: pokemon.currentHp,
    previousMaxHp,
    newMaxHp,
  });

  await tx.playerPokemon.update({
    where: { id: playerPokemonId },
    data: { level: progress.level, experience: progress.totalXp, currentHp: newCurrentHp },
  });

  // Same transaction as the level/XP/HP update above — a Known Move or
  // Pending Move Learning row this call creates commits or rolls back
  // together with this Pokémon's new level, never separately. Called
  // unconditionally (even when previousLevel === progress.level): the
  // planner treats an empty level interval as an ordinary no-op and
  // performs no writes, so this stays correct without a separate
  // "did we actually level up" branch here. A non-"success" result here
  // means genuinely malformed persisted state (every structural
  // precondition — the Pokémon existing, oldLevel <= newLevel — already
  // holds by construction at this point in the transaction), so it's
  // surfaced loudly rather than silently discarded.
  const moveLearningResult = await applyLevelUpMoveLearning(tx, playerPokemonId, pokemon.speciesId, previousLevel, progress.level);

  if (moveLearningResult.status !== "success") {
    throw new Error(`applyLevelUpMoveLearning failed unexpectedly: ${JSON.stringify(moveLearningResult)}`);
  }

  // Deliberately AFTER move learning above — the documented, deterministic
  // order for when both a pending move and a pending evolution could exist
  // from the same grant (see tryCreatePendingEvolution's own doc comment
  // for why that ordering is safe even though the two are surfaced to the
  // player through entirely different UI moments). Checked against the
  // Pokémon's OWN current species/level/evolution-state — never
  // client-supplied, never re-derived from anything other than this same
  // transaction's own reads.
  const pendingEvolutionCreation = await tryCreatePendingEvolution(
    tx,
    playerPokemonId,
    pokemon.speciesId,
    progress.level,
    pokemon.pendingEvolutionSpeciesId,
    pokemon.pendingEvolutionBranch,
    pokemon.evolutionPermanentlyBlocked
  );

  return {
    playerPokemonId,
    speciesId: pokemon.speciesId,
    speciesName: species?.name ?? pokemon.speciesId,
    rewardRole: role,
    xpShare,
    xpGained: safeXpGained,
    previousTotalXp,
    newTotalXp: progress.totalXp,
    previousLevel,
    newLevel: progress.level,
    levelsGained: progress.level - previousLevel,
    currentLevelXp: progress.currentLevelXp,
    xpRequiredForNextLevel: progress.xpRequiredForNextLevel,
    remainingXp: progress.remainingXp,
    progressPercent: progress.progressPercent,
    isMaxLevel: progress.isMaxLevel,
    newMaxHp,
    newCurrentHp,
    moveLearning: moveLearningResult.plan,
    pendingEvolutionSpeciesId: pendingEvolutionCreation.pendingEvolutionSpeciesId,
    pendingEvolutionBranch: pendingEvolutionCreation.pendingEvolutionBranch,
  };
}

export interface GrantBattlePokemonXpParams {
  defeatedWildLevel: number;
  // Already filtered to non-fainted participants of the current encounter
  // by the caller (syncWildHp) — this function trusts the list as given
  // rather than re-deriving eligibility itself, since "what counts as
  // eligible" (fainted-exclusion) is a battle-session concern, not a
  // progression-math one. See battle-session.service.ts's syncWildHp for
  // where fainted participants are filtered out.
  eligibleParticipantIds: string[];
  finisherId: string;
  source: PokemonXpSource;
}

// Grants the BaseBattleXp reward pool for one wild-Pokémon victory, split
// across every eligible participant (distributeBattlePokemonXp) and applied
// to each one's row (applyPokemonXpGrant) — always call this from inside
// the same transaction/exactly-once guard that grants the player-account
// XP reward for the same victory (see syncWildHp), so "player XP granted
// but Pokémon XP wasn't" can never happen from a partial failure or a
// retry.
export async function grantBattlePokemonXp(
  tx: Prisma.TransactionClient,
  params: GrantBattlePokemonXpParams
): Promise<PokemonLevelUpResult[]> {
  const { defeatedWildLevel, eligibleParticipantIds, finisherId, source } = params;

  if (eligibleParticipantIds.length === 0) return [];

  // The finisher's *current* level (before this grant) is what the
  // level-difference multiplier scales the whole pool by — read once, here,
  // before the pool is computed, since calculateBaseBattlePokemonXp needs it
  // and distributeBattlePokemonXp only ever splits the single number that
  // comes out of that call.
  const finisher = await tx.playerPokemon.findUniqueOrThrow({
    where: { id: finisherId },
    select: { level: true },
  });

  const baseXp = calculateBaseBattlePokemonXp(defeatedWildLevel, finisher.level);
  const shares = distributeBattlePokemonXp(baseXp, eligibleParticipantIds, finisherId);

  // Sequential, not Promise.all — every grant goes through the same
  // transaction client, and Prisma's interactive transactions don't support
  // concurrent queries against one tx.
  const results: PokemonLevelUpResult[] = [];
  for (const share of shares) {
    const result = await applyPokemonXpGrant(tx, share.playerPokemonId, share.xpAmount, share.role, share.xpShare, source);
    results.push(result);
  }

  return results;
}
