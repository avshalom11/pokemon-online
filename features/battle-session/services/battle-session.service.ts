import "server-only";

import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { startPokemonEncounter, type EncounterResult } from "@/engine/encounter/pokemon-encounter-engine";
import { ZONE_DATA } from "@/data/zones/zone-data";
import { ALL_STAT_NAMES } from "@/engine/moves";
import type { StatStages } from "@/features/battle/stats/stat-stages";
import { resetVolatileOnSwitch, type VolatileState } from "@/features/battle/volatile/volatile-condition.types";
import { getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getFirstUsableMember, hasUsableMember, isUsable } from "@/features/party/utils/party-rules";
import { getEligibleParticipantIds, withParticipant, withParticipantFainted } from "@/features/pokemon-progression/pokemon-progression-calculations";
import { grantBattlePokemonXp } from "@/features/pokemon-progression/pokemon-progression-service";
import type { BattleParticipantRecord, PokemonLevelUpResult } from "@/features/pokemon-progression/pokemon-progression-types";
import { calculateVictoryXpReward } from "@/features/player-progression/progression-calculations";
import { addPlayerExperience } from "@/features/player-progression/progression-service";
import type { LevelUpResult } from "@/features/player-progression/progression-types";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import type { ZoneId } from "@/shared/types/zone";

// The authoritative result of a wild-Pokémon victory: both the
// player-account reward (unchanged) and every eligible owned Pokémon's own
// reward, granted atomically together — see syncWildHp below.
export interface BattleVictoryReward {
  player: LevelUpResult;
  pokemon: PokemonLevelUpResult[];
}

// FieldBattleSession.participants is stored as Prisma.JsonValue — never
// trusted directly (a legacy row from before this column existed, or any
// unexpected shape, must never crash a read). Anything that doesn't match
// the expected shape is dropped rather than throwing, the same "invalid ->
// safe fallback" philosophy restoreFromRow already uses for a stale session
// row.
function parseParticipants(value: Prisma.JsonValue): BattleParticipantRecord[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (
      entry &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      typeof (entry as Record<string, unknown>).playerPokemonId === "string" &&
      typeof (entry as Record<string, unknown>).fainted === "boolean" &&
      typeof (entry as Record<string, unknown>).order === "number"
    ) {
      return [entry as unknown as BattleParticipantRecord];
    }
    return [];
  });
}

function serializeParticipants(participants: BattleParticipantRecord[]): Prisma.InputJsonValue {
  return participants as unknown as Prisma.InputJsonValue;
}

// Phase 6E — FieldBattleSession.wildStatStages/playerStatStages, stored as
// Prisma.JsonValue same as participants above: never trusted directly,
// dropped down to "no stages" ({}) for anything that doesn't match the
// expected shape (a legacy row from before these columns existed, or any
// unexpected value) rather than crashing a read.
export function parseStatStages(value: Prisma.JsonValue): StatStages {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const stages: StatStages = {};
  for (const stat of ALL_STAT_NAMES) {
    const raw = (value as Record<string, unknown>)[stat];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      stages[stat] = raw;
    }
  }
  return stages;
}

export function serializeStatStages(stages: StatStages): Prisma.InputJsonValue {
  return stages as unknown as Prisma.InputJsonValue;
}

const EMPTY_STAT_STAGES: Prisma.InputJsonValue = {};

// Phase 7 — FieldBattleSession.wildVolatileState/playerVolatileState,
// stored as Prisma.JsonValue same as the stages above: never trusted
// directly, dropped field-by-field for anything that doesn't match the
// expected shape (a legacy row from before these columns existed, or any
// unexpected value) rather than crashing a read. See
// features/battle/volatile/volatile-condition.types.ts for the shape this
// mirrors.
export function parseVolatileState(value: Prisma.JsonValue): VolatileState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const result: VolatileState = {};

  if (typeof raw.lastUsedMoveId === "string") result.lastUsedMoveId = raw.lastUsedMoveId;
  if (typeof raw.flinch === "boolean") result.flinch = raw.flinch;

  if (raw.confusion && typeof raw.confusion === "object") {
    const turnsRemaining = (raw.confusion as Record<string, unknown>).turnsRemaining;
    if (typeof turnsRemaining === "number") result.confusion = { turnsRemaining };
  }

  if (raw.protect && typeof raw.protect === "object") {
    const protect = raw.protect as Record<string, unknown>;
    if (typeof protect.active === "boolean" && typeof protect.consecutiveUses === "number") {
      result.protect = { active: protect.active, consecutiveUses: protect.consecutiveUses };
    }
  }

  if (raw.disable && typeof raw.disable === "object") {
    const disable = raw.disable as Record<string, unknown>;
    if (typeof disable.moveId === "string" && typeof disable.turnsRemaining === "number") {
      result.disable = { moveId: disable.moveId, turnsRemaining: disable.turnsRemaining };
    }
  }

  if (raw.encore && typeof raw.encore === "object") {
    const encore = raw.encore as Record<string, unknown>;
    if (typeof encore.moveId === "string" && typeof encore.turnsRemaining === "number") {
      result.encore = { moveId: encore.moveId, turnsRemaining: encore.turnsRemaining };
    }
  }

  if (raw.leechSeed && typeof raw.leechSeed === "object") {
    const leechSeed = raw.leechSeed as Record<string, unknown>;
    if (leechSeed.source === "player" || leechSeed.source === "enemy") {
      result.leechSeed = { source: leechSeed.source };
    }
  }

  if (raw.trapping && typeof raw.trapping === "object") {
    const trapping = raw.trapping as Record<string, unknown>;
    if ((trapping.source === "player" || trapping.source === "enemy") && typeof trapping.turnsRemaining === "number") {
      result.trapping = { source: trapping.source, turnsRemaining: trapping.turnsRemaining };
    }
  }

  return result;
}

export function serializeVolatileState(volatile: VolatileState): Prisma.InputJsonValue {
  return volatile as unknown as Prisma.InputJsonValue;
}

const EMPTY_VOLATILE_STATE: Prisma.InputJsonValue = resetVolatileOnSwitch() as unknown as Prisma.InputJsonValue;

// Owns the FieldBattleSession row — the authoritative, persisted record of a
// player's single in-progress wild encounter (see the model's own doc
// comment in prisma/schema.prisma). Every mutation here is scoped by
// `playerId` alone (never a client-sent session id), and uses updateMany/
// deleteMany rather than update/delete so a call racing against — or
// arriving after — the session already ending is a safe no-op instead of a
// thrown "record not found".

export interface RestoredBattle {
  zoneId: ZoneId;
  wild: EncounterResult;
  party: OwnedPokemon[];
  activePokemonId: string;
}

export type GetOrStartBattleResult =
  | { status: "ready"; battle: RestoredBattle }
  // The player already has an active session, but for a different zone —
  // never silently abandon or duplicate it; send them back to where their
  // real battle actually is instead of trusting the requested zone.
  | { status: "redirect"; zoneId: ZoneId }
  | { status: "no-usable-party" };

function isValidZoneId(value: string): value is ZoneId {
  return ZONE_DATA.some((zone) => zone.id === value);
}

interface PersistedSessionRow {
  zoneId: string;
  wildSpeciesId: string;
  wildLevel: number;
  wildCurrentHp: number;
  wildMaxHp: number;
  activePlayerPokemonId: string;
}

// Reconstructs the in-memory battle shape from a persisted row, re-deriving
// everything against *current* app state (species catalog, current party)
// rather than trusting the row blindly — returns null for any condition
// that makes the row stale/invalid (see this function's callers for the
// recovery strategy: discard and start fresh, never crash or restore
// inconsistent data).
function restoreFromRow(row: PersistedSessionRow, party: OwnedPokemon[]): RestoredBattle | null {
  if (!isValidZoneId(row.zoneId)) return null;

  const species = getSpeciesById(row.wildSpeciesId);
  if (!species) return null;

  // The active battler must still be owned by this player and currently in
  // their party — covers "removed from party", "released", and "row
  // belongs to a Pokémon that no longer exists" in one check, since
  // `party` (getPlayerParty) already only ever contains the caller's own,
  // currently-slotted Pokémon.
  const activePokemon = party.find((pokemon) => pokemon.id === row.activePlayerPokemonId);
  if (!activePokemon) return null;

  // Shouldn't normally happen (party defeat already ends the session), but
  // a restored battle must never open onto a fully-fainted party.
  if (!hasUsableMember(party)) return null;

  return {
    zoneId: row.zoneId,
    wild: {
      zoneId: row.zoneId,
      pokemon: species,
      level: row.wildLevel,
      currentHealth: row.wildCurrentHp,
      maximumHealth: row.wildMaxHp,
    },
    party,
    activePokemonId: activePokemon.id,
  };
}

// The single entry point for "the player is opening the battle screen for
// this zone" — restores an existing session for that zone if one exists,
// redirects to the player's real session if it's for a different zone,
// discards and recovers from a stale/invalid session, or starts a brand
// new one via the existing, unmodified weighted encounter engine
// (startPokemonEncounter). This is the only place a FieldBattleSession row
// is ever created.
export async function getOrStartBattle(playerId: string, requestedZoneId: ZoneId): Promise<GetOrStartBattleResult> {
  const party = await getPlayerParty(playerId);
  const existing = await prisma.fieldBattleSession.findUnique({ where: { playerId } });

  if (existing) {
    if (existing.zoneId !== requestedZoneId) {
      return { status: "redirect", zoneId: existing.zoneId as ZoneId };
    }

    const restored = restoreFromRow(existing, party);
    if (restored) {
      return { status: "ready", battle: restored };
    }

    // Stale/invalid — clean recovery: discard rather than restore
    // inconsistent data or crash, then fall through to a fresh start below.
    await prisma.fieldBattleSession.deleteMany({ where: { playerId } });
  }

  if (!hasUsableMember(party)) {
    // Defensive cleanup — shouldn't normally leave a row behind (party
    // defeat already ends the session), but never leave one dangling.
    await prisma.fieldBattleSession.deleteMany({ where: { playerId } });
    return { status: "no-usable-party" };
  }

  const starter = party[0];
  const activePokemon = isUsable(starter) ? starter : getFirstUsableMember(party)!;
  const wild = startPokemonEncounter(requestedZoneId);

  await prisma.fieldBattleSession.create({
    data: {
      playerId,
      zoneId: requestedZoneId,
      wildSpeciesId: wild.pokemon.id,
      wildLevel: wild.level,
      wildCurrentHp: wild.currentHealth,
      wildMaxHp: wild.maximumHealth,
      activePlayerPokemonId: activePokemon.id,
      // The starting active Pokémon is a participant in this first
      // encounter from the moment the session exists — see
      // BattleParticipantRecord's own doc comment.
      participants: serializeParticipants([{ playerPokemonId: activePokemon.id, fainted: false, order: 0 }]),
    },
  });

  return {
    status: "ready",
    battle: { zoneId: requestedZoneId, wild, party, activePokemonId: activePokemon.id },
  };
}

// Re-derives max HP from the row's own species/level rather than trusting a
// client-sent value — same rule syncPartyHpAction already follows for party
// HP (features/battle/actions/sync-party-hp.action.ts).
//
// Also the one place a wild-defeat reward (both the player-account XP and
// every eligible owned Pokémon's own XP — see BattleVictoryReward) is
// granted: when the clamped HP lands at 0 and the reward hasn't already
// been claimed for this encounter, the HP write and both reward grants
// happen in one transaction, gated by `wildDefeatRewardGranted: false` in
// the update's WHERE clause — a racing duplicate call's updateMany then
// matches 0 rows and returns null before granting anything, the same idiom
// capture.service.ts's attemptCapture already uses (a deleteMany-count race
// guard). This single guard now protects both rewards together, so
// "player XP granted but Pokémon XP wasn't" can never happen from a retry
// or a race. Returns null whenever no reward was granted by this call
// (non-lethal hit, no session, or already claimed) so callers can tell
// "nothing to show" from "here's the result".
//
// The finisher is simply `session.activePlayerPokemonId` at this exact
// moment — never a client-supplied id. Only the currently-active Pokémon
// can ever be the one whose attack reduced the wild's HP to 0 in this
// fixed-attack battle system (see engine/battle/battle-config.ts), and
// activePlayerPokemonId is itself only ever written by syncActivePokemon
// below, which already re-validates ownership/party-membership server-side
// before persisting it (sync-active-pokemon.action.ts) — so trusting it
// here carries that same validation forward rather than re-doing it.
export async function syncWildHp(playerId: string, zoneId: ZoneId, currentHp: number): Promise<BattleVictoryReward | null> {
  const session = await prisma.fieldBattleSession.findUnique({ where: { playerId } });
  if (!session || session.zoneId !== zoneId) return null;

  const species = getSpeciesById(session.wildSpeciesId);
  if (!species) return null;

  const maxHp = calculatePokemonHpStat(species.baseStats.health, session.wildLevel);
  const clampedHp = Math.max(0, Math.min(maxHp, currentHp));

  if (clampedHp > 0 || session.wildDefeatRewardGranted) {
    await prisma.fieldBattleSession.updateMany({
      where: { playerId, zoneId },
      data: { wildCurrentHp: clampedHp },
    });
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.fieldBattleSession.updateMany({
      where: { playerId, zoneId, wildDefeatRewardGranted: false },
      data: { wildCurrentHp: clampedHp, wildDefeatRewardGranted: true },
    });

    if (claimed.count === 0) return null;

    const player = await addPlayerExperience(tx, playerId, calculateVictoryXpReward(session.wildLevel));

    const eligibleParticipantIds = getEligibleParticipantIds(parseParticipants(session.participants));
    const pokemon = await grantBattlePokemonXp(tx, {
      defeatedWildLevel: session.wildLevel,
      eligibleParticipantIds,
      finisherId: session.activePlayerPokemonId,
      source: "wildBattleVictory",
    });

    return { player, pokemon };
  });
}

// `playerPokemonId` ownership/party-membership is the caller's
// responsibility to have already validated (see
// sync-active-pokemon.action.ts) before this is reached.
//
// Also records this Pokémon as a participant of the current encounter (see
// BattleParticipantRecord) — a plain read-then-write rather than an atomic
// JSON update because Prisma has no partial-array-update operator for
// Postgres Json columns, and this write is never concurrent with itself in
// practice: the battle's own turn-based phase guard (BattleContent's
// BattlePhase state machine) already ensures only one switch can be
// in-flight for a given player at a time. withParticipant is idempotent
// (a Pokémon switching in and out repeatedly is recorded only once), so
// even a hypothetical duplicate/racing call is safe.
export type SyncActivePokemonResult = { status: "ok" } | { status: "trapped" };

// Phase 7 — `force` must be true for a forced replacement after fainting
// (never rejected — a fainted Pokémon obviously can't stay trapped-in),
// and omitted/false for every voluntary switch, which IS rejected while
// the current active Pokémon is trapped (Bind/Wrap/Fire Spin/Clamp — see
// features/battle/volatile/volatile-condition.types.ts). Both call sites
// already exist and are already distinguished in BattleContent
// (handleVoluntarySwitchSelect vs. handleForcedReplacementSelect); this
// only adds the trapped check to the voluntary one.
export async function syncActivePokemon(
  playerId: string,
  playerPokemonId: string,
  options?: { force?: boolean }
): Promise<SyncActivePokemonResult> {
  const session = await prisma.fieldBattleSession.findUnique({ where: { playerId } });
  if (!session) return { status: "ok" };

  if (!options?.force) {
    const currentVolatile = parseVolatileState(session.playerVolatileState);
    if (currentVolatile.trapping) {
      return { status: "trapped" };
    }
  }

  const participants = withParticipant(parseParticipants(session.participants), playerPokemonId);

  await prisma.fieldBattleSession.updateMany({
    where: { playerId },
    data: {
      activePlayerPokemonId: playerPokemonId,
      participants: serializeParticipants(participants),
      // Phase 6E: battle-local stat stages belong to whichever Pokémon is
      // currently active, never carried over to whoever switches in next
      // — the incoming Pokémon (whether newly switched in or switched
      // back to later) always starts this encounter's stages at neutral.
      // Major status (PlayerPokemon.status) is untouched here on purpose
      // — it persists on the Pokémon itself, exactly like currentHp.
      playerStatStages: EMPTY_STAT_STAGES,
      // Phase 7: same rule for Volatile Conditions (confusion, flinch,
      // protect, disable, encore, Leech Seed, trapping) — a freshly
      // switched-in Pokémon always starts this encounter with none of
      // them, whether switching out clears them (leaving) or in (never
      // inherits the previous occupant's). The wild's OWN volatile state
      // (e.g. Leech Seed it planted on the player, sourced from
      // "player") is untouched here on purpose — see this project's own
      // "preserve the seed when the source switches" rule: only the
      // switching side's own state resets.
      playerVolatileState: EMPTY_VOLATILE_STATE,
    },
  });

  return { status: "ok" };
}

// Marks an existing participant of the current encounter as fainted, making
// it permanently ineligible for that encounter's Pokémon-XP reward (see
// getEligibleParticipantIds) — even if it's switched back in or targeted
// again later in the same encounter. Called from
// features/battle/actions/sync-party-hp.action.ts whenever a party HP sync
// lands at exactly 0. Same read-then-write shape and idempotency guarantee
// as syncActivePokemon above.
export async function markParticipantFainted(playerId: string, playerPokemonId: string): Promise<void> {
  const session = await prisma.fieldBattleSession.findUnique({ where: { playerId } });
  if (!session) return;

  const participants = withParticipantFainted(parseParticipants(session.participants), playerPokemonId);

  await prisma.fieldBattleSession.updateMany({
    where: { playerId },
    data: { participants: serializeParticipants(participants) },
  });
}

export async function endBattleSession(playerId: string): Promise<void> {
  await prisma.fieldBattleSession.deleteMany({ where: { playerId } });
}

// Defeating a wild Pokémon and continuing in the same zone reuses the same
// session row — only the wild* fields are overwritten — rather than ending
// and recreating it, so party HP and the active Pokémon carry over
// untouched. Returns null if there's no matching session to advance
// (stale/duplicate call after the session already ended), so a caller can
// never generate a second encounter against a session that isn't there.
//
// Also resets `participants` back to just the current active Pokémon —
// participation is scoped to one encounter (see BattleParticipantRecord's
// own doc comment), exactly like wildDefeatRewardGranted resets to false
// here: a Pokémon that fought (or merely appeared for) an earlier,
// already-defeated wild in this same zone session must never remain
// "eligible" for a completely different wild's reward.
export async function advanceToNextEncounter(playerId: string, zoneId: ZoneId): Promise<EncounterResult | null> {
  const session = await prisma.fieldBattleSession.findUnique({ where: { playerId } });
  if (!session || session.zoneId !== zoneId) return null;

  const wild = startPokemonEncounter(zoneId);

  const updated = await prisma.fieldBattleSession.updateMany({
    where: { playerId, zoneId },
    data: {
      wildSpeciesId: wild.pokemon.id,
      wildLevel: wild.level,
      wildCurrentHp: wild.currentHealth,
      wildMaxHp: wild.maximumHealth,
      wildDefeatRewardGranted: false,
      participants: serializeParticipants([{ playerPokemonId: session.activePlayerPokemonId, fainted: false, order: 0 }]),
      // Phase 6E/6F: a new wild is a genuinely new battle instance — stat
      // stages (both sides) and the *wild's own* status/sleep-counter
      // never carry over from the encounter that just ended. The
      // player's own PlayerPokemon.status is untouched (it persists on
      // the Pokémon itself, unrelated to which wild it's currently
      // fighting).
      wildStatStages: EMPTY_STAT_STAGES,
      playerStatStages: EMPTY_STAT_STAGES,
      wildStatus: null,
      wildStatusTurnsRemaining: null,
      // Phase 7: a new wild is a genuinely new battle instance for
      // Volatile Conditions too — neither side carries confusion, Leech
      // Seed, trapping, etc. into a fresh encounter.
      wildVolatileState: EMPTY_VOLATILE_STATE,
      playerVolatileState: EMPTY_VOLATILE_STATE,
    },
  });

  return updated.count > 0 ? wild : null;
}
