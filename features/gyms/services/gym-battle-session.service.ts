import "server-only";

import { calculatePokemonStats } from "@/engine/battle/pokemon-stat-calculations";
import type { MajorStatus } from "@/features/battle/status/major-status";
import type { VolatileState } from "@/features/battle/volatile/volatile-condition.types";
import { getAllOwnedPokemon, getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getPlayerLevel } from "@/features/player-progression/progression-service";
import { prisma } from "@/lib/db/prisma";
import type { NpcBattleSession, Prisma } from "@/lib/generated/prisma/client";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import type { RegionId } from "@/shared/types/region";
import { MIN_GYM_PLAYER_LEVEL } from "../config/gym-access-rules.config";
import { deriveGymNpcLevelRange } from "../config/gym-level-scaling-lookup";
import { GYM_BATTLE_FORMATS, GYM_BATTLE_SLOT_DIFFICULTY, REGIONAL_CHAMPION_BATTLE_FORMAT, REGIONAL_CHAMPION_DIFFICULTY } from "../data/gym-registry";
import { getGymNpcTeam } from "../data/gym-npc-teams";
import { getRegionalChampionTeam } from "../data/regional-champion-teams";
import { resolveNpcTeamLevels } from "./gym-npc-level-resolver";
import {
  isGymBattleCompleted,
  isGymBattleUnlocked,
  isRegionalChampionDefeated,
  isRegionalChampionUnlocked,
  isRegionGymSequenceUnlocked,
} from "./gym-progression.service";
import type { GymBattleSlotId } from "../types/gym.types";
import type { NpcBattleTeamMember } from "../types/npc-battle.types";

// GYMS & LEAGUES PHASE 3 — Gym Battle Engine session lifecycle. See
// NpcBattleSession's own doc comment (prisma/schema.prisma) for the full
// architecture rationale (separate from FieldBattleSession, battle-local
// HP/status only, shared turn engine). This file owns: starting a new
// attempt (with every server-side unlock/completion/party-limit/full-HP
// rule from this Phase's spec), reading the live session, switching the
// player's active participant, and abandoning without completion.
// Turn-by-turn combat resolution lives in gym-battle-action.service.ts.

export type StartNpcBattleTarget =
  | { source: "gym"; regionId: RegionId; gymNumber: 1 | 2 | 3; battleSlot: GymBattleSlotId }
  | { source: "regional-champion"; regionId: RegionId };

export type StartNpcBattleResult =
  | { status: "started"; session: NpcBattleSession }
  | { status: "resumed"; session: NpcBattleSession }
  // A different NPC battle is already in progress — the caller must
  // abandon it first (abandonNpcBattleSession) rather than this silently
  // discarding whatever progress that other attempt had.
  | { status: "in-progress-elsewhere" }
  | { status: "already-completed" }
  // Existing Phase 1 Gym-order/battle-slot lock, or "not all 3 Badges
  // earned yet" for a Regional Champion (gym-progression-rules.ts).
  | { status: "locked" }
  // GYMS & LEAGUES PHASE 4 — the player's account level is below
  // MIN_GYM_PLAYER_LEVEL (gym-access-rules.config.ts). Checked before every
  // other gate, for every Gym AND Regional Champion target alike.
  | { status: "locked-level" }
  // GYMS & LEAGUES PHASE 4 — this region's Gym sequence gate
  // (region-gym-sequence.ts) isn't satisfied yet: the immediately-previous
  // region's Regional Champion hasn't been defeated. Distinct from "locked"
  // so the UI/tests can tell "wrong region order" apart from "wrong
  // within-region order".
  | { status: "locked-previous-region" }
  | { status: "invalid-target" }
  | { status: "no-usable-party" };

function parseJsonRecord<T>(value: Prisma.JsonValue, fallback: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  return value as unknown as T;
}

// Deliberately separate from parseJsonRecord above — that helper's own
// "reject an array as invalid" rule is correct for RECORD-shaped fields
// (playerBattleHp, playerBattleStatus, ...) but would be wrong here: a
// plain string[] IS the valid, expected shape for playerPokemonIds.
function parseStringArray(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => (typeof entry === "string" ? [entry] : []));
}

function parseNpcTeam(value: Prisma.JsonValue): NpcBattleTeamMember[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).speciesId === "string" && typeof (entry as Record<string, unknown>).level === "number") {
      return [entry as unknown as NpcBattleTeamMember];
    }
    return [];
  });
}

function battleFormatFor(target: StartNpcBattleTarget) {
  if (target.source === "regional-champion") {
    return { format: REGIONAL_CHAMPION_BATTLE_FORMAT, difficulty: REGIONAL_CHAMPION_DIFFICULTY };
  }
  return { format: GYM_BATTLE_FORMATS[target.battleSlot], difficulty: GYM_BATTLE_SLOT_DIFFICULTY[target.battleSlot] };
}

function fixedTeamFor(target: StartNpcBattleTarget): readonly { speciesId: string }[] | null {
  if (target.source === "regional-champion") {
    return getRegionalChampionTeam(target.regionId)?.members ?? null;
  }
  return getGymNpcTeam(target.regionId, target.gymNumber, target.battleSlot)?.members ?? null;
}

function sameTarget(session: NpcBattleSession, target: StartNpcBattleTarget): boolean {
  if (session.battleSource !== target.source || session.regionId !== target.regionId) return false;
  if (target.source === "gym") return session.gymNumber === target.gymNumber && session.battleSlot === target.battleSlot;
  return true;
}

// Starts (or resumes) an NPC battle attempt for `target`, after validating
// every server-side rule from this Phase's spec, in the exact order Phase
// 4's section 4 lists: (1) player level >= MIN_GYM_PLAYER_LEVEL, (2) this
// region's Gym sequence gate, (3) the existing Phase 1 Gym/battle-slot
// unlock rule, (4) not already completed. Never trusts a client's own
// belief about any of these — every check re-derives from the DB.
export async function startNpcBattle(playerId: string, target: StartNpcBattleTarget, randomSource?: () => number): Promise<StartNpcBattleResult> {
  const fixedTeam = fixedTeamFor(target);
  if (!fixedTeam || fixedTeam.length === 0) {
    return { status: "invalid-target" };
  }

  // GYMS & LEAGUES PHASE 4, section 1 — the global minimum-level gate.
  // Applies uniformly to every Gym battle slot AND every Regional Champion,
  // checked before any other rule. Fetched once and reused below (NPC-team
  // level resolution) rather than a second query later.
  const playerLevel = await getPlayerLevel(playerId);
  if (playerLevel < MIN_GYM_PLAYER_LEVEL) {
    return { status: "locked-level" };
  }

  // GYMS & LEAGUES PHASE 4, section 2 — sequential Region Gym progression.
  // A no-op (always true) for Kanto and for any region whose previous
  // region's Regional Champion is already defeated.
  const regionSequenceUnlocked = await isRegionGymSequenceUnlocked(playerId, target.regionId);
  if (!regionSequenceUnlocked) {
    return { status: "locked-previous-region" };
  }

  // Unlock check — Gym order (1 -> 2 -> 3, Easy -> Medium -> Leader) or
  // "all 3 Badges earned" for a Regional Champion.
  const unlocked =
    target.source === "regional-champion"
      ? await isRegionalChampionUnlocked(playerId, target.regionId)
      : await isGymBattleUnlocked(playerId, target.regionId, target.gymNumber, target.battleSlot);
  if (!unlocked) {
    return { status: "locked" };
  }

  // Already-completed check — permanent, no replay, regardless of any
  // other state (approved design, section 4/5).
  const alreadyCompleted =
    target.source === "regional-champion"
      ? await isRegionalChampionDefeated(playerId, target.regionId)
      : await isGymBattleCompleted(playerId, target.regionId, target.gymNumber, target.battleSlot);
  if (alreadyCompleted) {
    return { status: "already-completed" };
  }

  const existing = await prisma.npcBattleSession.findUnique({ where: { playerId } });
  if (existing) {
    if (sameTarget(existing, target)) {
      return { status: "resumed", session: existing };
    }
    return { status: "in-progress-elsewhere" };
  }

  const { format, difficulty } = battleFormatFor(target);

  // PLAYER PARTY LIMIT (section 5) — the player's CURRENT party, first N
  // valid slots per this format's own max, in existing party-slot order.
  // Never mutates the real party; never invents a separate Gym-party
  // storage system — this is only ever a read-only snapshot of ids.
  const party = await getPlayerParty(playerId);
  const participants = party.slice(0, format.maxPlayerPokemon);
  if (participants.length === 0) {
    return { status: "no-usable-party" };
  }

  // FULL HP AT START (section 6) — battle-local only, see this model's own
  // doc comment (prisma/schema.prisma): PlayerPokemon.currentHp is never
  // read or written here, so a fainted/damaged real Pokémon can still
  // enter this battle at full strength without that ever "healing" it in
  // the outside world.
  const playerBattleHp: Record<string, number> = {};
  for (const pokemon of participants) {
    playerBattleHp[pokemon.id] = calculatePokemonStats({ baseStats: pokemon.species.baseStats, level: pokemon.level }).maxHp;
  }

  // FIXED NPC TEAM LOADING (section 7) — Phase 2's own fixed species,
  // never re-selected here; levels resolved ONCE via Phase 2's pure
  // resolver and frozen into npcTeam for the rest of the attempt. Reuses
  // the same playerLevel already fetched for the Level-10 gate above.
  const resolvedNpcTeam = resolveNpcTeamLevels(
    playerLevel,
    difficulty,
    fixedTeam.map((m) => m.speciesId),
    randomSource
  );
  const npcTeam: NpcBattleTeamMember[] = resolvedNpcTeam.map((m) => ({ speciesId: m.speciesId, level: m.level }));

  const firstNpc = getSpeciesById(npcTeam[0].speciesId);
  if (!firstNpc) {
    return { status: "invalid-target" };
  }
  const npcMaxHp = calculatePokemonStats({ baseStats: firstNpc.baseStats, level: npcTeam[0].level }).maxHp;

  const session = await prisma.npcBattleSession.create({
    data: {
      playerId,
      battleSource: target.source,
      regionId: target.regionId,
      gymNumber: target.source === "gym" ? target.gymNumber : null,
      battleSlot: target.source === "gym" ? target.battleSlot : null,
      npcTeam: npcTeam as unknown as Prisma.InputJsonValue,
      npcActiveIndex: 0,
      npcCurrentHp: npcMaxHp,
      npcStatus: null,
      npcStatusTurnsRemaining: null,
      npcStatStages: {},
      npcVolatileState: {},
      playerPokemonIds: participants.map((p) => p.id) as unknown as Prisma.InputJsonValue,
      activePlayerPokemonId: participants[0].id,
      playerBattleHp: playerBattleHp as unknown as Prisma.InputJsonValue,
      playerBattleStatus: {},
      playerStatStages: {},
      playerVolatileState: {},
    },
  });

  return { status: "started", session };
}

export async function getNpcBattleSession(playerId: string): Promise<NpcBattleSession | null> {
  return prisma.npcBattleSession.findUnique({ where: { playerId } });
}

export type SwitchNpcBattleActivePokemonResult = { status: "ok" } | { status: "not-owned" } | { status: "no-session" };

// Switches the player's active participant within an in-progress NPC
// battle — the "existing forced-replacement flow" this Phase's spec asks
// for, adapted to this session's own battle-local state (never touches
// PlayerPokemon). `playerPokemonId` must already be one of this attempt's
// own snapshotted participants (playerPokemonIds) — never trusts a
// client-supplied id blindly.
export async function switchNpcBattleActivePokemon(playerId: string, playerPokemonId: string): Promise<SwitchNpcBattleActivePokemonResult> {
  const session = await prisma.npcBattleSession.findUnique({ where: { playerId } });
  if (!session) return { status: "no-session" };

  const participantIds = parseStringArray(session.playerPokemonIds);
  if (!participantIds.includes(playerPokemonId)) return { status: "not-owned" };

  await prisma.npcBattleSession.updateMany({
    where: { playerId },
    data: {
      activePlayerPokemonId: playerPokemonId,
      // Same rule Field Battle's syncActivePokemon already follows: stat
      // stages reset for whoever is now active; battle-local status/HP
      // persist per-Pokémon across a switch (see playerBattleStatus/
      // playerBattleHp, both keyed by playerPokemonId, never reset here).
      playerStatStages: {},
      playerVolatileState: {},
    },
  });

  return { status: "ok" };
}

// ESCAPE/ABANDON (section 13) — deletes the session with NO completion
// marked, exactly the "smallest clean behavior" this Phase's spec calls
// for. No client Escape action exists yet (no Gym UI this Phase) — this
// exists as the safe primitive Phase 4's UI will call, and as the same
// navigate-away hygiene FieldBattleSession's own cleanup already
// establishes elsewhere in this codebase.
export async function abandonNpcBattleSession(playerId: string): Promise<void> {
  await prisma.npcBattleSession.deleteMany({ where: { playerId } });
}

export async function hasActiveNpcBattleSession(playerId: string): Promise<boolean> {
  const session = await prisma.npcBattleSession.findUnique({ where: { playerId }, select: { playerId: true } });
  return session !== null;
}

export function parseNpcBattleStatStages(value: Prisma.JsonValue) {
  return parseJsonRecord<Record<string, number>>(value, {});
}

export function parseNpcBattleVolatileState(value: Prisma.JsonValue): VolatileState {
  return parseJsonRecord<VolatileState>(value, {});
}

export function parseNpcBattleHpMap(value: Prisma.JsonValue): Record<string, number> {
  return parseJsonRecord<Record<string, number>>(value, {});
}

// One participant's battle-local major status — status alone isn't enough
// to correctly resume a sleeping Pokémon (sleep's own turn counter must
// persist across a switch exactly like the status itself), so each map
// entry carries both, mirroring PlayerPokemon's own status +
// statusTurnsRemaining pairing for Field Battle.
export interface NpcBattleParticipantStatus {
  readonly status: MajorStatus | null;
  readonly turnsRemaining: number | null;
}

const EMPTY_PARTICIPANT_STATUS: NpcBattleParticipantStatus = { status: null, turnsRemaining: null };

export function parseNpcBattleStatusMap(value: Prisma.JsonValue): Record<string, NpcBattleParticipantStatus> {
  return parseJsonRecord<Record<string, NpcBattleParticipantStatus>>(value, {});
}

export function statusFor(map: Record<string, NpcBattleParticipantStatus>, playerPokemonId: string): NpcBattleParticipantStatus {
  return map[playerPokemonId] ?? EMPTY_PARTICIPANT_STATUS;
}

export function parseNpcBattleParticipantIds(value: Prisma.JsonValue): string[] {
  return parseStringArray(value);
}

export { parseNpcTeam };

// Resolves a player's currently-participating OwnedPokemon list for a live
// NpcBattleSession, in their original snapshotted order — used by
// gym-battle-action.service.ts so it never has to re-derive participation
// itself. Deliberately reads via getAllOwnedPokemon (ownership only), never
// getPlayerParty (current active-party-slot membership): the snapshot was
// taken once at battle start, and this Phase's spec explicitly allows the
// player to change their real party while a Gym attempt might still be
// resumed later — a participant that has since been moved out of the
// active party slots must still be resolvable here by ownership alone.
export async function getParticipatingParty(playerId: string, session: NpcBattleSession): Promise<OwnedPokemon[]> {
  const ids = parseNpcBattleParticipantIds(session.playerPokemonIds);
  const owned = await getAllOwnedPokemon(playerId);
  const byId = new Map(owned.map((pokemon) => [pokemon.id, pokemon]));
  return ids.flatMap((id) => {
    const pokemon = byId.get(id);
    return pokemon ? [pokemon] : [];
  });
}
