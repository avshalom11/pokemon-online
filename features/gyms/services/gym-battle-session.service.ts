import "server-only";

import { calculatePokemonStats } from "@/engine/battle/pokemon-stat-calculations";
import type { MajorStatus } from "@/features/battle/status/major-status";
import type { VolatileState } from "@/features/battle/volatile/volatile-condition.types";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
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
  | { status: "no-usable-party" }
  // PRE-BATTLE PARTY SELECTION (later task, section 6) — `selectedPlayerPokemonIds`
  // failed validation: not a subset of the player's own current party, a
  // duplicate id, a fainted (currentHp <= 0) Pokémon, or a count other than
  // the required selection size for this battle format (see
  // requiredSelectionCount below).
  | { status: "invalid-selection" };

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

type TargetValidationResult =
  | { status: "ok"; playerLevel: number; fixedTeam: readonly { speciesId: string }[] }
  | { status: "invalid-target" | "locked-level" | "locked-previous-region" | "locked" | "already-completed" };

// PRE-BATTLE PARTY SELECTION (later task) — every level/sequence/unlock/
// already-completed rule from Phase 4's section 4, extracted so BOTH
// startNpcBattle (which also creates the session) and the new read-only
// getGymBattlePartyOptions (the selection screen's own data source, which
// must show the exact same lock reasons without ever creating anything) go
// through the identical checks, in the identical order — never two
// slightly different copies of "is this Gym/Champion actually available".
async function validateNpcBattleTarget(playerId: string, target: StartNpcBattleTarget): Promise<TargetValidationResult> {
  const fixedTeam = fixedTeamFor(target);
  if (!fixedTeam || fixedTeam.length === 0) {
    return { status: "invalid-target" };
  }

  const playerLevel = await getPlayerLevel(playerId);
  if (playerLevel < MIN_GYM_PLAYER_LEVEL) {
    return { status: "locked-level" };
  }

  const regionSequenceUnlocked = await isRegionGymSequenceUnlocked(playerId, target.regionId);
  if (!regionSequenceUnlocked) {
    return { status: "locked-previous-region" };
  }

  const unlocked =
    target.source === "regional-champion"
      ? await isRegionalChampionUnlocked(playerId, target.regionId)
      : await isGymBattleUnlocked(playerId, target.regionId, target.gymNumber, target.battleSlot);
  if (!unlocked) {
    return { status: "locked" };
  }

  const alreadyCompleted =
    target.source === "regional-champion"
      ? await isRegionalChampionDefeated(playerId, target.regionId)
      : await isGymBattleCompleted(playerId, target.regionId, target.gymNumber, target.battleSlot);
  if (alreadyCompleted) {
    return { status: "already-completed" };
  }

  return { status: "ok", playerLevel, fixedTeam };
}

export interface GymPartySelectionOption {
  readonly id: string;
  readonly speciesId: string;
  readonly name: string;
  readonly level: number;
  readonly frontSpriteUrl: string;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly fainted: boolean;
}

export type GymPartySelectionResult =
  | { status: "ok"; requiredCount: number; maxCount: number; options: readonly GymPartySelectionOption[]; resuming: boolean }
  | { status: Exclude<StartNpcBattleResult["status"], "started" | "resumed" | "invalid-selection"> };

// PRE-BATTLE PARTY SELECTION (later task, section 6/7) — the selection
// screen's own read-only data source: every lock/already-completed rule
// startNpcBattle itself enforces (via validateNpcBattleTarget, unmodified),
// plus the player's own CURRENT party with its REAL currentHp/maxHp (never
// battle-local — there is no battle yet), so the player can see exactly
// which Pokémon are healthy/injured/fainted before choosing. Creates
// nothing; a resumed in-progress session is reported via `resuming` so the
// UI can skip straight to it instead of asking the player to re-select.
export async function getGymBattlePartyOptions(playerId: string, target: StartNpcBattleTarget): Promise<GymPartySelectionResult> {
  const validation = await validateNpcBattleTarget(playerId, target);
  if (validation.status !== "ok") return { status: validation.status };

  const existing = await prisma.npcBattleSession.findUnique({ where: { playerId } });
  if (existing && !sameTarget(existing, target)) {
    return { status: "in-progress-elsewhere" };
  }

  const { format } = battleFormatFor(target);
  const party = await getPlayerParty(playerId);
  const aliveParty = party.filter((pokemon) => pokemon.currentHp > 0);
  const requiredCount = requiredSelectionCount(format.maxPlayerPokemon, aliveParty.length);

  return {
    status: "ok",
    requiredCount,
    maxCount: format.maxPlayerPokemon,
    resuming: existing !== null,
    options: party.map((pokemon) => ({
      id: pokemon.id,
      speciesId: pokemon.species.id,
      name: pokemon.nickname ?? pokemon.species.name,
      level: pokemon.level,
      frontSpriteUrl: getFrontSpritePath(pokemon.species),
      currentHp: pokemon.currentHp,
      maxHp: pokemon.maxHp,
      fainted: pokemon.currentHp <= 0,
    })),
  };
}

// If the player's own current party has fewer than `formatMax` Pokémon
// still standing, the existing architecture already allows an undersized
// team (startNpcBattle's own long-standing "no-usable-party only if truly
// zero" rule) — never invent Pokémon to fill the gap. The required
// selection count is therefore whichever is smaller.
function requiredSelectionCount(formatMax: number, aliveCount: number): number {
  return Math.min(formatMax, aliveCount);
}

// Starts (or resumes) an NPC battle attempt for `target`, after validating
// every server-side rule from this Phase's spec, in the exact order Phase
// 4's section 4 lists: (1) player level >= MIN_GYM_PLAYER_LEVEL, (2) this
// region's Gym sequence gate, (3) the existing Phase 1 Gym/battle-slot
// unlock rule, (4) not already completed. Never trusts a client's own
// belief about any of these — every check re-derives from the DB.
//
// PRE-BATTLE PARTY SELECTION + HP PERSISTENCE (later task, sections 6/8) —
// `selectedPlayerPokemonIds` is now REQUIRED and is exactly what
// participates, never an auto-sliced first-N; every id must belong to the
// player's own current party, be alive, appear at most once, and the count
// must match requiredSelectionCount's own rule. The OLD "battle participants
// always start at full HP" rule is explicitly gone: playerBattleHp is
// seeded from each selected Pokémon's REAL, CURRENT PlayerPokemon.currentHp
// (and playerBattleStatus from its real status/statusTurnsRemaining) — a
// damaged or statused Pokémon enters the Gym battle exactly as damaged/
// statused as it already was. Resuming an existing in-progress attempt
// (`sameTarget`) never re-validates or re-applies a selection — the
// original one, frozen at that attempt's own start, still stands.
export async function startNpcBattle(
  playerId: string,
  target: StartNpcBattleTarget,
  selectedPlayerPokemonIds: readonly string[],
  randomSource?: () => number
): Promise<StartNpcBattleResult> {
  const validation = await validateNpcBattleTarget(playerId, target);
  if (validation.status !== "ok") return { status: validation.status };
  const { playerLevel, fixedTeam } = validation;

  const existing = await prisma.npcBattleSession.findUnique({ where: { playerId } });
  if (existing) {
    if (sameTarget(existing, target)) {
      return { status: "resumed", session: existing };
    }
    return { status: "in-progress-elsewhere" };
  }

  const { format, difficulty } = battleFormatFor(target);

  // PLAYER PARTY SELECTION VALIDATION (section 6) — every selected id must
  // belong to the player's own CURRENT party, be alive right now, and never
  // repeat; the exact count is re-derived server-side from the same rule
  // the selection screen itself used to show it, never trusted from the
  // client's own count.
  const party = await getPlayerParty(playerId);
  const partyById = new Map(party.map((pokemon) => [pokemon.id, pokemon]));
  const aliveParty = party.filter((pokemon) => pokemon.currentHp > 0);
  const requiredCount = requiredSelectionCount(format.maxPlayerPokemon, aliveParty.length);

  const uniqueSelectedIds = new Set(selectedPlayerPokemonIds);
  if (uniqueSelectedIds.size !== selectedPlayerPokemonIds.length) {
    return { status: "invalid-selection" };
  }
  if (requiredCount === 0 || uniqueSelectedIds.size !== requiredCount) {
    return requiredCount === 0 ? { status: "no-usable-party" } : { status: "invalid-selection" };
  }

  const participants = [];
  for (const id of selectedPlayerPokemonIds) {
    const pokemon = partyById.get(id);
    if (!pokemon || pokemon.currentHp <= 0) {
      return { status: "invalid-selection" };
    }
    participants.push(pokemon);
  }

  // HP PERSISTENCE — REMOVES THE OLD "FULL HP AT START" RULE (later task,
  // section 8, explicitly overriding Phase 3/4's original battle-local-only
  // design). Seeded from each participant's REAL currentHp/status right
  // now — never recalculated max HP, never a fresh, unstatused Pokémon.
  const playerBattleHp: Record<string, number> = {};
  const playerBattleStatus: Record<string, { status: string | null; turnsRemaining: number | null }> = {};
  for (const pokemon of participants) {
    playerBattleHp[pokemon.id] = pokemon.currentHp;
    playerBattleStatus[pokemon.id] = { status: pokemon.status ?? null, turnsRemaining: pokemon.statusTurnsRemaining ?? null };
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
      playerBattleStatus: playerBattleStatus as unknown as Prisma.InputJsonValue,
      playerStatStages: {},
      playerVolatileState: {},
    },
  });

  return { status: "started", session };
}

// HP PERSISTENCE (later task, section 9) — the ONE place a Gym battle's
// battle-local player HP/status is written back to the REAL, permanent
// PlayerPokemon row. Called by every action that changes a participant's
// battle-local HP/status (a normal turn, a Bag item, the final state at
// victory/loss) — never by switching (no HP change) and never by abandon
// (deliberately no-op: an abandoned attempt's damage already persisted
// incrementally on whichever earlier turn caused it, and abandon itself
// must not additionally touch HP). Always takes an existing transaction
// client so this write is atomic with whatever else that same action does
// (session update, completion, reward). Only ever targets the ONE
// participant that actually changed — every other party/storage Pokémon is
// untouched by construction (this function never even sees their ids).
export async function syncParticipantToRealPokemon(
  tx: Prisma.TransactionClient,
  playerPokemonId: string,
  update: { currentHp: number; status: string | null; statusTurnsRemaining: number | null }
): Promise<void> {
  await tx.playerPokemon.update({
    where: { id: playerPokemonId },
    data: { currentHp: Math.max(0, update.currentHp), status: update.status, statusTurnsRemaining: update.statusTurnsRemaining },
  });
}

export async function getNpcBattleSession(playerId: string): Promise<NpcBattleSession | null> {
  return prisma.npcBattleSession.findUnique({ where: { playerId } });
}

// TURN SAFETY / RACE GUARD (GYM BATTLE POLISH task, section 2) — a small
// internal sentinel thrown from inside a `$transaction` callback when a
// guarded write's CAS check (guardedSessionUpdate/guardedSessionDelete
// below) finds the session has already been mutated by some OTHER action
// since the caller's own pre-transaction read. Thrown only inside a
// transaction, which rolls the whole thing back (Prisma's own behavior on
// a thrown error) — a caller that got this far already computed its result
// (turn resolution, heal amount, switch target) off what turned out to be
// a stale snapshot, so nothing that action did may be written. Every public
// action below catches this and converts it to its own "stale-action"
// result rather than letting it escape as a raw exception.
export class StaleNpcBattleSessionError extends Error {}

// The ONE guarded write every session-mutating action's FIRST write must
// go through. Folds the CAS check into the SAME query that would run
// anyway (never a separate check-then-write, which would just move the
// race rather than closing it) by adding `updatedAt: expectedUpdatedAt` to
// the `where` — NpcBattleSession's own Prisma `@updatedAt` column, bumped
// on every write, doubling as a version token with zero schema change.
// `expectedUpdatedAt` must always be the value read by the caller BEFORE
// its own transaction started. A second/later write by the SAME action,
// inside the SAME already-guarded transaction, never needs to re-guard —
// nothing else can have interleaved once inside it.
export async function guardedSessionUpdate(
  tx: Prisma.TransactionClient,
  playerId: string,
  expectedUpdatedAt: Date,
  data: Record<string, unknown>
): Promise<void> {
  const result = await tx.npcBattleSession.updateMany({ where: { playerId, updatedAt: expectedUpdatedAt }, data });
  if (result.count === 0) throw new StaleNpcBattleSessionError();
}

export async function guardedSessionDelete(tx: Prisma.TransactionClient, playerId: string, expectedUpdatedAt: Date): Promise<void> {
  const result = await tx.npcBattleSession.deleteMany({ where: { playerId, updatedAt: expectedUpdatedAt } });
  if (result.count === 0) throw new StaleNpcBattleSessionError();
}

// BAG / VOLUNTARY SWITCH — PLAYER TURN ONLY (GYM BATTLE POLISH task,
// section 2) — true exactly when the currently-active participant has
// already fainted, i.e. the client's forced-replacement panel is the only
// action that should be reachable right now. Read straight off the live
// battle-local HP map, never a separate/duplicated flag, so it can never
// drift from switchNpcBattleActivePokemon's/executeGymBattleAction's own
// notion of "needs a replacement".
export function isActiveParticipantFainted(session: NpcBattleSession): boolean {
  const playerBattleHp = parseNpcBattleHpMap(session.playerBattleHp);
  return (playerBattleHp[session.activePlayerPokemonId] ?? 0) <= 0;
}

export type SwitchNpcBattleActivePokemonResult =
  | { status: "ok" }
  | { status: "not-owned" }
  | { status: "no-session" }
  | { status: "stale-action" };

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

  const updated = await prisma.npcBattleSession.updateMany({
    where: { playerId, updatedAt: session.updatedAt },
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
  if (updated.count === 0) return { status: "stale-action" };

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
