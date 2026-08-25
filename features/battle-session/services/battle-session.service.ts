import "server-only";

import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import type { EncounterResult } from "@/engine/encounter/pokemon-encounter-engine";
import { resolveWildEncounter } from "@/engine/encounter/legendary-test-boost";
import { ALL_STAT_NAMES } from "@/engine/moves";
import type { StatStages } from "@/features/battle/stats/stat-stages";
import { resetVolatileOnSwitch, type VolatileState } from "@/features/battle/volatile/volatile-condition.types";
import { rollAndAwardChest } from "@/features/chests/services/chest-drop.service";
import type { ChestDropOutcome } from "@/features/chests/types/chest-drop.types";
import { grantFieldBattleCurrencyRewards } from "@/features/currency/services/field-battle-currency-reward.service";
import { incrementDailyBattleCount } from "@/features/daily-battles/services/daily-battle-count.service";
import { rollAndAwardEgg } from "@/features/eggs/services/egg-drop.service";
import { progressActiveIncubations } from "@/features/eggs/services/incubation.service";
import type { EggDropOutcome, IncubationProgressSummary } from "@/features/eggs/types/egg.types";
import { markSpeciesSeen } from "@/features/pokedex/services/mark-species-seen.service";
import { getPlayerParty, hydrateOwnedPokemonRows, PLAYER_PARTY_QUERY_ARGS } from "@/features/pokemon/services/player-pokemon";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getFirstUsableMember, hasUsableMember, isUsable } from "@/features/party/utils/party-rules";
import { getEligibleParticipantIds, withParticipant, withParticipantFainted } from "@/features/pokemon-progression/pokemon-progression-calculations";
import { grantBattlePokemonXp } from "@/features/pokemon-progression/pokemon-progression-service";
import type { BattleParticipantRecord, PokemonLevelUpResult } from "@/features/pokemon-progression/pokemon-progression-types";
import { calculateVictoryXpReward } from "@/features/player-progression/progression-calculations";
import { addPlayerExperience, getPlayerLevel } from "@/features/player-progression/progression-service";
import { resolveEffectiveWildLevelRange } from "@/features/player/services/wild-level-preference.service";
import type { LevelUpResult } from "@/features/player-progression/progression-types";
import { prisma } from "@/lib/db/prisma";
import type { FieldBattleSession, Prisma } from "@/lib/generated/prisma/client";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import { toRegionId, type RegionId } from "@/shared/types/region";
import { ALL_ZONE_IDS, type ZoneId } from "@/shared/types/zone";

// The authoritative result of a wild-Pokémon victory: the player-account
// reward, every eligible owned Pokémon's own reward, (EGGS PHASE 2) whether
// this exact victory dropped an egg, (CHESTS PHASE 5) whether it dropped a
// chest, and (EGGS PHASE 3) whether it progressed the player's active
// incubation — all granted atomically together — see syncWildHp below.
export interface BattleVictoryReward {
  player: LevelUpResult;
  pokemon: PokemonLevelUpResult[];
  egg: EggDropOutcome;
  // CHESTS PHASE 5 — entirely independent of `egg` above: its own
  // separate 0.12% roll (features/chests/data/chest-drop-config.ts), never
  // gating or gated by the egg roll. One victory may award an egg, a
  // chest, both, or neither.
  chest: ChestDropOutcome;
  // Today a player only ever has one active incubation (Phase 1: one
  // Standard Incubator each), so this is a single nullable summary — see
  // IncubationProgressSummary's own doc comment (features/eggs/types/
  // egg.types.ts) for why progressActiveIncubations itself still stays
  // generic over every active incubation underneath.
  incubationProgress: IncubationProgressSummary;
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

// Structural check only — "is this string shaped like one of the six known
// zone ids at all", never "does it resolve in a specific region's own zone
// data" (that's getZone's job, called with a real RegionId once one is
// known). The same six zone ids exist in every region (see shared/types/
// zone.ts's own ALL_ZONE_IDS doc comment), so this is deliberately
// region-independent.
function isValidZoneId(value: string): value is ZoneId {
  return (ALL_ZONE_IDS as readonly string[]).includes(value);
}

interface PersistedSessionRow {
  zoneId: string;
  wildSpeciesId: string;
  wildLevel: number;
  wildCurrentHp: number;
  wildMaxHp: number;
  // Only the species needs checking here (see restoreFromRow) — the row is
  // treated as stale/invalid the same way a missing wild species already is
  // if this doesn't resolve, so a restored battle is never one promotion
  // away from a broken "next" encounter.
  nextWildSpeciesId: string;
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

  // The pre-generated "next" encounter must resolve too — a restored
  // battle is only ever handed back once it's genuinely one encounter
  // ahead again (see the model's own nextWild* doc comment); a row missing
  // that guarantee is exactly as stale/invalid as one with a broken
  // current wild.
  if (!getSpeciesById(row.nextWildSpeciesId)) return null;

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

// Same local helper (and P2002 meaning) as gym-progression.service.ts's own
// isUniqueConstraintViolation, league-battle-session.service.ts, etc. — a
// concurrent/duplicate request already inserted the row this one just tried
// to create.
function isUniqueConstraintViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

// GAME TUTORIAL — PHASE 3. Pidgey's real species/base stats — never a
// second/fabricated Pokémon; only the LEVEL is fixed rather than rolled.
// Level 6 is deliberately the top of Grassland's own real level-up range
// for Pidgey (data/zones/kanto-zone-data.ts: minimumLevel 2, maximumLevel
// 6) — chosen (not guessed) against the real formulas: verified against
// engine/battle/damage-calculation.ts and pokemon-stat-calculations.ts
// that even a critical-hit Tackle/Scratch (every Starter's own strongest
// move still known at STARTER_POKEMON_LEVEL, the level onboarding creates
// every Starter at) cannot faint a level-6 Pidgey in one hit, while a
// level-6 Pidgey's own only offensive move at this level (tackle —
// sand-attack, its other level-≤6 move, is a status move with no damage)
// deals only minor damage back to any real Starter species. `currentHealth`
// equals `maximumHealth` — a freshly-started encounter, exactly like any
// real wild encounter's own EncounterResult.
const TUTORIAL_PIDGEY_SPECIES_ID = "pidgey";
const TUTORIAL_PIDGEY_LEVEL = 6;

function buildTutorialPidgeyEncounter(zoneId: ZoneId): EncounterResult {
  const species = getSpeciesById(TUTORIAL_PIDGEY_SPECIES_ID);
  if (!species) {
    // Should never happen — "pidgey" is a real, static catalog entry — but
    // never worth crashing ambiguously if the catalog ever changes.
    throw new Error(`tutorial Pidgey species "${TUTORIAL_PIDGEY_SPECIES_ID}" not found in the species catalog`);
  }

  const maxHealth = calculatePokemonHpStat(species.baseStats.health, TUTORIAL_PIDGEY_LEVEL);

  return { zoneId, pokemon: species, level: TUTORIAL_PIDGEY_LEVEL, currentHealth: maxHealth, maximumHealth: maxHealth };
}

// The single entry point for "the player is opening the battle screen for
// this zone" — restores an existing session for that zone if one exists,
// redirects to the player's real session if it's for a different zone,
// discards and recovers from a stale/invalid session, or starts a brand
// new one via resolveWildEncounter (engine/encounter/legendary-test-boost.ts)
// — the real, unmodified weighted encounter engine (startPokemonEncounter)
// unless the dev-only LEGENDARY_ENCOUNTER_TEST_MODE flag is on, in which
// case behavior is identical to before except in development. This is the
// only place a FieldBattleSession row is ever created.
//
// `regionId` (Phase 4) is only ever consulted on the "start a brand new
// session" path below — restoring an existing row never needs it, since
// PlayerProfile.regionId can only ever change via travelToRegion
// (features/regions/services/region.service.ts), which always deletes any
// in-progress FieldBattleSession in the same transaction. That means a
// session can only ever exist while the player's region has stayed exactly
// what it was when the session (or its last promotion) was created — so a
// restored row is guaranteed to still belong to the caller's own current
// region without this function needing to store or re-check regionId
// itself.
export async function getOrStartBattle(
  playerId: string,
  requestedZoneId: ZoneId,
  regionId: RegionId,
  // GAME TUTORIAL — PHASE 3. Set only by battle-view.service.ts's own
  // getBattleViewData, only after it has confirmed (via
  // getOrCreateTutorialProgress) that this player's Tutorial is genuinely
  // still at its own unresolved Field Battle stage — never trusted from
  // anywhere else, and never consulted at all on the "existing session"
  // restore path below, which behaves identically regardless (a resumed
  // session already carries whatever isTutorialEncounter value it was
  // created with).
  options?: { forceTutorialEncounter?: boolean }
): Promise<GetOrStartBattleResult> {
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
  // Phase 1 — Wild Pokémon level scaling: read once and reused for both
  // rolls below, so the current and precomputed-next encounter are always
  // scaled to the same player-level snapshot.
  // MAP — SELECTABLE WILD LEVEL RANGE: wildLevelRange is the player's own
  // server-validated selected bracket (falls back to their highest
  // unlocked bracket automatically — see resolveEffectiveWildLevelRange's
  // own doc comment), read once and reused for both rolls below for the
  // same reason playerLevel is.
  const playerLevel = await getPlayerLevel(playerId);
  const wildLevelRange = await resolveEffectiveWildLevelRange(playerId);

  let wild: EncounterResult;
  let nextWild: EncounterResult;
  if (options?.forceTutorialEncounter) {
    // GAME TUTORIAL — PHASE 3. Deterministic — never resolveWildEncounter's
    // real RNG — and never promoted: this session always ends in a
    // guaranteed capture (capture.service.ts's own attemptCapture), so
    // `nextWild` is only ever populated to satisfy the schema's NOT NULL
    // columns, never actually shown to the player. Reusing the exact same
    // encounter object for both is deliberate, not a bug.
    wild = buildTutorialPidgeyEncounter(requestedZoneId);
    nextWild = wild;
  } else {
    wild = resolveWildEncounter(regionId, requestedZoneId, playerLevel, wildLevelRange);
    // The session is created already one encounter ahead — see the model's
    // own nextWild* doc comment. resolveWildEncounter is a pure, in-memory
    // weighted pick (no I/O), so precomputing this second encounter up
    // front costs nothing measurable; it just guarantees a promotion is
    // always instant, from the very first encounter of the session
    // onward, never only after the first defeat.
    nextWild = resolveWildEncounter(regionId, requestedZoneId, playerLevel, wildLevelRange);
  }

  try {
    await prisma.fieldBattleSession.create({
      data: {
        playerId,
        zoneId: requestedZoneId,
        wildSpeciesId: wild.pokemon.id,
        wildLevel: wild.level,
        wildCurrentHp: wild.currentHealth,
        wildMaxHp: wild.maximumHealth,
        nextWildSpeciesId: nextWild.pokemon.id,
        nextWildLevel: nextWild.level,
        nextWildCurrentHp: nextWild.currentHealth,
        nextWildMaxHp: nextWild.maximumHealth,
        activePlayerPokemonId: activePokemon.id,
        // The starting active Pokémon is a participant in this first
        // encounter from the moment the session exists — see
        // BattleParticipantRecord's own doc comment.
        participants: serializeParticipants([{ playerPokemonId: activePokemon.id, fainted: false, order: 0 }]),
        // GAME TUTORIAL — PHASE 3.
        isTutorialEncounter: Boolean(options?.forceTutorialEncounter),
      },
    });
  } catch (error) {
    // FIELD BATTLE STUCK — a genuine, reproduced race: playerId is
    // FieldBattleSession's own unique key (@id), so a concurrent/duplicate
    // request for this same player (e.g. a client-side navigation racing
    // its own in-flight flee/defeat cleanup — see BattleContent's
    // handleEscape) can lose this create() to another request that won the
    // race and already inserted a row. Previously this crashed the whole
    // page with an uncaught PrismaClientKnownRequestError, stranding the
    // player on a frozen error screen. Same create-then-catch-P2002 idiom
    // already established elsewhere in this codebase (gym-progression.
    // service.ts's markGymBattleCompleted, league-battle-session.service.ts,
    // ...) — the loser just resumes whatever the winner actually created,
    // exactly like the "existing session" branch above already does,
    // instead of treating a benign race as a fatal error.
    if (!isUniqueConstraintViolation(error)) throw error;

    const winner = await prisma.fieldBattleSession.findUniqueOrThrow({ where: { playerId } });
    if (winner.zoneId !== requestedZoneId) {
      return { status: "redirect", zoneId: winner.zoneId as ZoneId };
    }

    const restored = restoreFromRow(winner, party);
    if (restored) {
      return { status: "ready", battle: restored };
    }

    // Vanishingly unlikely (the winner just created this row moments ago),
    // but never worth crashing over — same "discard and let the caller
    // retry" recovery the "existing" branch above already uses for a
    // stale/invalid row.
    await prisma.fieldBattleSession.deleteMany({ where: { playerId } });
    return { status: "no-usable-party" };
  }

  // Pokédex — this is the wild the player actually sees on this fresh
  // session's very first render; the pre-generated nextWild is never
  // marked here (it isn't shown yet). Restoring an EXISTING session
  // (the branch above) never reaches this line at all, so a refresh/reopen
  // can never re-mark anything — see markSpeciesSeen's own doc comment for
  // why calling it again would be harmless anyway.
  await markSpeciesSeen(prisma, playerId, wild.pokemon.id);

  // The daily battle counter deliberately does NOT increment here — see
  // promoteToNextEncounter's own doc comment for the one true increment
  // point. Merely starting a session (or restoring one on refresh/reopen)
  // is not a victory; only actually defeating a wild Pokémon counts.

  return {
    status: "ready",
    battle: { zoneId: requestedZoneId, wild, party, activePokemonId: activePokemon.id },
  };
}

// The one true existence check for "does this player currently have an
// active field battle session" — a plain boolean over the exact same
// FieldBattleSession row every other function on this file reads/writes,
// never a second tracked concept of "in battle." Used by app/(game)/layout.tsx
// to seed the sidebar's ActiveBattleProvider (features/battle-session/
// context/active-battle-context.tsx) for a hard refresh/direct navigation
// landing straight on /battle — soft client-side navigation into/out of
// battle updates that same context live instead (BattleContent's own mount/
// unmount, since entering/leaving the battle screen is exactly when a real
// session starts/ends here).
export async function hasActiveBattleSession(playerId: string): Promise<boolean> {
  const session = await prisma.fieldBattleSession.findUnique({ where: { playerId }, select: { playerId: true } });
  return session !== null;
}

// FIELD BATTLE PERFORMANCE — the FieldBattleSession row and the player's
// active party used to be two independent top-level Prisma calls
// (previously `Promise.all([fieldBattleSession.findUnique, getPlayerParty])`
// in battle-action.service.ts). Measured against this project's actual
// remote Neon setup, running them concurrently was consistently SLOWER than
// a single query, not faster: each concurrent top-level call appears to pay
// its own connection-acquisition cost on this pooled/serverless setup, so
// "parallel" here meant two connection round trips instead of one reused
// connection. This reads both through PlayerProfile's own two relations
// (`fieldBattleSession`, `pokemon`) in a SINGLE Prisma call instead — one
// query, one connection, no JS-side race between two independent awaits.
// Returns nulls/empty for a player with no row/party rather than throwing;
// callers keep their own existing "no session"/"not owned" handling
// unchanged (see executeBattleAction).
export async function getActiveBattleSessionWithParty(
  playerId: string
): Promise<{ session: FieldBattleSession | null; party: OwnedPokemon[] }> {
  const profile = await prisma.playerProfile.findUnique({
    where: { id: playerId },
    select: {
      fieldBattleSession: true,
      pokemon: PLAYER_PARTY_QUERY_ARGS,
    },
  });

  return {
    session: profile?.fieldBattleSession ?? null,
    party: hydrateOwnedPokemonRows(profile?.pokemon ?? []),
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
export async function syncWildHp(
  playerId: string,
  zoneId: ZoneId,
  currentHp: number,
  // Test-only seam, same convention executeBattleAction's own randomSource
  // param already establishes (battle-action.service.ts) — production
  // callers never pass this, so the currency roll falls back to
  // Math.random. Threaded through here purely so a test can pin both the
  // turn's combat rolls and the currency roll to one deterministic
  // sequence, without needing two separate stubbing mechanisms.
  randomSource?: () => number
): Promise<BattleVictoryReward | null> {
  const session = await prisma.fieldBattleSession.findUnique({ where: { playerId } });
  if (!session || session.zoneId !== zoneId) return null;

  return applyWildHpSync(playerId, zoneId, currentHp, session, randomSource);
}

// LATENCY AUDIT — the reward-claim half of syncWildHp above, split out so a
// caller that has *already* loaded this exact session row this same request
// (battle-action.service.ts — every ordinary attack reads the session once,
// at the top of executeBattleAction, purely to validate the action) can
// reuse it instead of syncWildHp re-querying the identical row a second
// time. `session` must be the caller's own fresh read of this player's
// FieldBattleSession — every field this function reads from it
// (wildSpeciesId, wildLevel, wildDefeatRewardGranted, participants,
// activePlayerPokemonId) is never mutated anywhere between
// executeBattleAction's initial read and this call, so passing that same
// object through is exactly as correct as re-fetching it here would be.
// syncWildHp itself is untouched for every other caller (tests,
// sync-wild-hp.action.ts) — it still fetches its own session, then simply
// delegates here.
export async function applyWildHpSync(
  playerId: string,
  zoneId: ZoneId,
  currentHp: number,
  session: FieldBattleSession,
  randomSource?: () => number
): Promise<BattleVictoryReward | null> {
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

    // Money/gold — same confirmed-victory guarantee as the XP grants above
    // (this whole branch only ever runs once, having just claimed
    // wildDefeatRewardGranted): never fires for an escape, a loss, a
    // capture, or a refresh. See field-battle-currency-reward.service.ts's
    // own doc comment for the full reward flow.
    await grantFieldBattleCurrencyRewards(tx, playerId, species.name, randomSource);

    // EGGS PHASE 2 — same confirmed-victory guarantee as every reward
    // above, riding in the exact same transaction so an awarded egg can
    // never be lost or duplicated independently of the rest of this
    // victory's reward (see rollAndAwardEgg's own doc comment,
    // egg-drop.service.ts). regionId is the field battle's own region —
    // read fresh from PlayerProfile inside this same transaction, never the
    // zone — matching the egg's own PlayerOwnedEgg.regionId semantics
    // (Phase 1).
    const profile = await tx.playerProfile.findUniqueOrThrow({ where: { id: playerId } });
    const egg = await rollAndAwardEgg(tx, playerId, toRegionId(profile.regionId), randomSource);

    // CHESTS PHASE 5 — same confirmed-victory guarantee as every reward
    // above, riding in the exact same transaction so an awarded chest can
    // never be lost or duplicated independently of the rest of this
    // victory's reward (see rollAndAwardChest's own doc comment,
    // chest-drop.service.ts). Entirely independent of the egg roll just
    // above — its own separate 0.12% roll, never blocking or blocked by
    // the egg roll; a single victory may award an egg, a chest, both, or
    // neither.
    const chest = await rollAndAwardChest(tx, playerId, randomSource);

    // EGGS PHASE 3 — same confirmed-victory guarantee as every reward
    // above, riding in the exact same transaction: a racing/retried call
    // for the same kill can never progress incubation twice, since this
    // whole branch only runs once per victory (see
    // progressActiveIncubations's own doc comment, incubation.service.ts).
    // Entirely independent of the egg roll just above — a freshly dropped
    // egg has no PlayerEggIncubation row yet, so it can never be the one
    // that gets progressed here; only an already-active incubation, if any,
    // is affected.
    const incubationUpdates = await progressActiveIncubations(tx, playerId);

    return { player, pokemon, egg, chest, incubationProgress: incubationUpdates[0] ?? null };
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

// The result of promoting the pre-generated "next" encounter into place —
// both halves of the model's own one-ahead invariant: `wild` is what the
// player now faces (already fully resolved before this call ever ran —
// see the model's nextWild* doc comment), `nextWild` is its freshly
// resolved replacement, so the session is immediately one-ahead again the
// instant this returns.
export interface AdvancedEncounter {
  wild: EncounterResult;
  nextWild: EncounterResult;
  // The daily battle counter's own post-increment value (see
  // incrementDailyBattleCount, daily-battle-count.service.ts) — carried
  // straight through from the same transaction so the client (the global
  // header's live daily-battle count) never needs a second round trip to
  // learn it.
  dailyBattleCount: number;
}

// Promotes the already-prepared next encounter (nextWild* on the session
// row) into the current one, and resolves a brand new replacement for that
// slot in the same write — called the instant a wild faints (see
// battle-action.service.ts), inside the SAME request that resolved the
// killing blow. resolveWildEncounter runs here only to refill the *next*
// slot; it is never what produces the encounter this call hands back, so
// there is no "generate, then wait" step on this path at all — the
// generation for what's returned already happened, earlier, off the
// critical path (session creation or the previous promotion).
//
// Continuing in the same zone reuses the same session row — only the
// wild*/nextWild* fields are overwritten — rather than ending and
// recreating it, so party HP and the active Pokémon carry over untouched.
// Returns null if there's no matching session to advance (stale/duplicate
// call after the session already ended), so a caller can never promote
// into a session that isn't there.
//
// Also resets `participants` back to just the current active Pokémon —
// participation is scoped to one encounter (see BattleParticipantRecord's
// own doc comment), exactly like wildDefeatRewardGranted resets to false
// here: a Pokémon that fought (or merely appeared for) an earlier,
// already-defeated wild in this same zone session must never remain
// "eligible" for a completely different wild's reward.
//
// This is also the daily battle counter's one true increment point (see
// features/daily-battles/services/daily-battle-count.service.ts) — it only
// ever runs from battle-action.service.ts's wildFainted && !battleEnded
// branch, i.e. exactly when the player has just genuinely defeated a wild
// Pokémon and the encounter is advancing, never on session start/restore
// (getOrStartBattle), escape, capture, or a party wipe. The updateMany's
// `wildCurrentHp: 0` WHERE guard is the same "claim, then act" idiom
// syncWildHp's wildDefeatRewardGranted guard already uses: a racing or
// retried call for the exact same kill finds the row already promoted
// (nonzero wildCurrentHp) and matches 0 rows, so it can never promote a
// second time or increment the counter twice for one victory. Wrapped in a
// transaction so the promotion and the increment either both happen or
// neither does.
// `regionId` (Phase 4) is only needed for the freshly-generated replacement
// `nextWild` below — the promoted `wild` was already fully resolved earlier
// (session creation or the previous promotion) and is read as-is from the
// row. Same "region can only ever be what it was when the session was
// created" guarantee as getOrStartBattle's own doc comment explains.
export async function promoteToNextEncounter(playerId: string, zoneId: ZoneId, regionId: RegionId): Promise<AdvancedEncounter | null> {
  const session = await prisma.fieldBattleSession.findUnique({ where: { playerId } });
  if (!session || session.zoneId !== zoneId) return null;

  const promotedSpecies = getSpeciesById(session.nextWildSpeciesId);
  if (!promotedSpecies) return null;

  const wild: EncounterResult = {
    zoneId,
    pokemon: promotedSpecies,
    level: session.nextWildLevel,
    currentHealth: session.nextWildCurrentHp,
    maximumHealth: session.nextWildMaxHp,
  };
  // Phase 1 — Wild Pokémon level scaling: the promoted `wild` above was
  // already generated (and leveled) earlier, off this critical path — only
  // the freshly-generated replacement `nextWild` needs today's player level
  // (and, MAP — SELECTABLE WILD LEVEL RANGE, today's selected bracket).
  const playerLevel = await getPlayerLevel(playerId);
  const wildLevelRange = await resolveEffectiveWildLevelRange(playerId);
  const nextWild = resolveWildEncounter(regionId, zoneId, playerLevel, wildLevelRange);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.fieldBattleSession.updateMany({
      // wildCurrentHp: 0 — only a session whose current wild is still
      // exactly where the lethal hit left it gets promoted; see this
      // function's own doc comment for why that's what makes a racing
      // duplicate call safe.
      where: { playerId, zoneId, wildCurrentHp: 0 },
      data: {
        wildSpeciesId: wild.pokemon.id,
        wildLevel: wild.level,
        wildCurrentHp: wild.currentHealth,
        wildMaxHp: wild.maximumHealth,
        nextWildSpeciesId: nextWild.pokemon.id,
        nextWildLevel: nextWild.level,
        nextWildCurrentHp: nextWild.currentHealth,
        nextWildMaxHp: nextWild.maximumHealth,
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

    if (updated.count === 0) return null;

    const dailyBattleCount = await incrementDailyBattleCount(tx, playerId);

    // Pokédex — `wild` here is the just-promoted species, actually shown to
    // the player for the first time at this exact moment; the freshly
    // generated replacement `nextWild` is never marked (not shown yet).
    // Inside the same race guard as the promotion itself, so a losing
    // duplicate/racing call (updated.count === 0, returned above) never
    // reaches this line.
    await markSpeciesSeen(tx, playerId, wild.pokemon.id);

    return { wild, nextWild, dailyBattleCount };
  });
}
