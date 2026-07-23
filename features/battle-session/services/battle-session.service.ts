import "server-only";

import { calculateBattleStats } from "@/engine/battle/stat-calculation";
import { startPokemonEncounter, type EncounterResult } from "@/engine/encounter/pokemon-encounter-engine";
import { ZONE_DATA } from "@/data/zones/zone-data";
import { getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getFirstUsableMember, hasUsableMember, isUsable } from "@/features/party/utils/party-rules";
import { prisma } from "@/lib/db/prisma";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import type { ZoneId } from "@/shared/types/zone";

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
export async function syncWildHp(playerId: string, zoneId: ZoneId, currentHp: number): Promise<void> {
  const session = await prisma.fieldBattleSession.findUnique({ where: { playerId } });
  if (!session || session.zoneId !== zoneId) return;

  const species = getSpeciesById(session.wildSpeciesId);
  if (!species) return;

  const maxHp = calculateBattleStats(species.baseStats, session.wildLevel).health;
  const clampedHp = Math.max(0, Math.min(maxHp, currentHp));

  await prisma.fieldBattleSession.updateMany({
    where: { playerId, zoneId },
    data: { wildCurrentHp: clampedHp },
  });
}

// `playerPokemonId` ownership/party-membership is the caller's
// responsibility to have already validated (see
// sync-active-pokemon.action.ts) before this is reached.
export async function syncActivePokemon(playerId: string, playerPokemonId: string): Promise<void> {
  await prisma.fieldBattleSession.updateMany({
    where: { playerId },
    data: { activePlayerPokemonId: playerPokemonId },
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
    },
  });

  return updated.count > 0 ? wild : null;
}
