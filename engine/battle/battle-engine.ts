import { MOVE_DATA } from "@/data/moves/move-data";
import { chooseOpponentMove } from "./battle-ai";
import { didMoveHit } from "./accuracy";
import { calculateDamage } from "./damage-calculation";
import { calculatePokemonStats, type PokemonStats } from "./pokemon-stat-calculations";
import { determineFirstMover } from "./turn-order";
import type {
  Battle,
  BattleActionOutcome,
  BattleParticipant,
  BattleStatus,
  BattleTurnOwner,
  BattleTurnResult,
} from "@/shared/types/battle";
import type { Move } from "@/shared/types/move";
import type { PokemonType } from "@/shared/types/pokemon";

function findMoveById(moveId: string): Move {
  const move = MOVE_DATA.find((currentMove) => currentMove.id === moveId);

  if (!move) {
    throw new Error(`Move not found: ${moveId}`);
  }

  return move;
}

function resolveAction(params: {
  actor: BattleTurnOwner;
  move: Move;
  attackerLevel: number;
  attackerStats: PokemonStats;
  defenderStats: PokemonStats;
  defenderTypes: PokemonType[];
}): Omit<BattleActionOutcome, "targetFainted"> {
  const {
    actor,
    move,
    attackerLevel,
    attackerStats,
    defenderStats,
    defenderTypes,
  } = params;

  const didHit = didMoveHit(move);

  if (!didHit) {
    return {
      actor,
      moveId: move.id,
      moveName: move.name,
      didHit: false,
      damageDealt: 0,
      isCritical: false,
      effectivenessMultiplier: 1,
    };
  }

  const { damage, isCritical, effectivenessMultiplier } = calculateDamage({
    attackerLevel,
    attackerStats,
    defenderStats,
    defenderTypes,
    move,
  });

  return {
    actor,
    moveId: move.id,
    moveName: move.name,
    didHit: true,
    damageDealt: damage,
    isCritical,
    effectivenessMultiplier,
  };
}

export function createBattle(
  player: BattleParticipant,
  opponent: BattleParticipant
): Battle {
  return {
    id: crypto.randomUUID(),
    player,
    opponent,
    currentTurn: "player",
    turnNumber: 1,
    status: "active",
  };
}

export function executeBattleTurn(
  battle: Battle,
  playerMoveId: string
): BattleTurnResult {
  if (battle.status !== "active") {
    throw new Error(
      `Cannot execute a turn on a battle with status: ${battle.status}`
    );
  }

  if (!battle.player.pokemon.moveIds.includes(playerMoveId)) {
    throw new Error(
      `Player's Pokémon does not know move: ${playerMoveId}`
    );
  }

  const playerMove = findMoveById(playerMoveId);

  const playerRemainingUses =
    battle.player.currentMoveUses[playerMoveId] ?? playerMove.maxUses;

  if (playerRemainingUses <= 0) {
    throw new Error(`Move has no remaining uses: ${playerMoveId}`);
  }

  const opponentMove = chooseOpponentMove(
    battle.opponent.pokemon.moveIds,
    battle.opponent.currentMoveUses
  );

  const playerStats = calculatePokemonStats({
    baseStats: battle.player.pokemon.species.baseStats,
    level: battle.player.pokemon.level,
  });

  const opponentStats = calculatePokemonStats({
    baseStats: battle.opponent.pokemon.species.baseStats,
    level: battle.opponent.pokemon.level,
  });

  const firstMover = determineFirstMover({
    playerMove,
    playerSpeed: playerStats.speed,
    opponentMove,
    opponentSpeed: opponentStats.speed,
  });

  const turnOrder: BattleTurnOwner[] =
    firstMover === "player" ? ["player", "opponent"] : ["opponent", "player"];

  const actions: BattleActionOutcome[] = [];

  let playerHealth = battle.player.currentHealth;
  let opponentHealth = battle.opponent.currentHealth;

  const playerMoveUses = {
    ...battle.player.currentMoveUses,
    [playerMoveId]: playerRemainingUses - 1,
  };

  const opponentRemainingUses =
    battle.opponent.currentMoveUses[opponentMove.id] ?? opponentMove.maxUses;

  const opponentMoveUses = {
    ...battle.opponent.currentMoveUses,
    [opponentMove.id]: Math.max(0, opponentRemainingUses - 1),
  };

  for (const actor of turnOrder) {
    if (playerHealth <= 0 || opponentHealth <= 0) {
      break;
    }

    if (actor === "player") {
      const outcome = resolveAction({
        actor: "player",
        move: playerMove,
        attackerLevel: battle.player.pokemon.level,
        attackerStats: playerStats,
        defenderStats: opponentStats,
        defenderTypes: battle.opponent.pokemon.species.types,
      });

      opponentHealth = Math.max(0, opponentHealth - outcome.damageDealt);

      actions.push({ ...outcome, targetFainted: opponentHealth <= 0 });
    } else {
      const outcome = resolveAction({
        actor: "opponent",
        move: opponentMove,
        attackerLevel: battle.opponent.pokemon.level,
        attackerStats: opponentStats,
        defenderStats: playerStats,
        defenderTypes: battle.player.pokemon.species.types,
      });

      playerHealth = Math.max(0, playerHealth - outcome.damageDealt);

      actions.push({ ...outcome, targetFainted: playerHealth <= 0 });
    }
  }

  const status: BattleStatus =
    playerHealth <= 0 ? "lost" : opponentHealth <= 0 ? "won" : "active";

  const updatedBattle: Battle = {
    ...battle,
    player: {
      ...battle.player,
      currentHealth: playerHealth,
      currentMoveUses: playerMoveUses,
    },
    opponent: {
      ...battle.opponent,
      currentHealth: opponentHealth,
      currentMoveUses: opponentMoveUses,
    },
    currentTurn: "player",
    turnNumber: battle.turnNumber + 1,
    status,
  };

  return { battle: updatedBattle, actions };
}
