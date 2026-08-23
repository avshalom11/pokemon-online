import "server-only";

import { isCaptureBallId } from "@/data/battle/capture-rate-config";
import { rollCapture } from "@/engine/battle/capture";
import { getFirstEmptyPartySlot } from "@/features/party/utils/party-rules";
import { getInventoryItemQuantity, removeInventoryItem } from "@/features/inventory/services/inventory.service";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { createOwnedPokemon } from "@/features/pokemon/services/create-owned-pokemon.service";
import { getTotalXpRequiredForPokemonLevel } from "@/features/pokemon-progression/pokemon-progression-calculations";
import { calculateCaptureXpReward } from "@/features/player-progression/progression-calculations";
import { addPlayerExperience } from "@/features/player-progression/progression-service";
import type { LevelUpResult } from "@/features/player-progression/progression-types";
import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import { prisma } from "@/lib/db/prisma";

export type AttemptCaptureResult =
  | { status: "captured"; speciesName: string; xpResult: LevelUpResult; remainingQuantity: number; addedToParty: boolean }
  | { status: "failed"; remainingQuantity: number }
  | { status: "invalid-encounter" }
  | { status: "invalid-item" }
  | { status: "no-balls" };

// Master Ball's own shop-catalog itemId (features/shop/data/shop-items.ts)
// — the one ball that bypasses CAPTURE_RATE_TABLE (data/battle/
// capture-rate-config.ts) entirely rather than being looked up in it (see
// this file's own guaranteed-capture branch below).
const MASTER_BALL_ITEM_ID = "master-ball";

// Server-side capture resolution — the only place the capture RNG
// (rollCapture, engine/battle/capture.ts) is ever invoked, and the only
// place a PlayerPokemon row is created for a captured wild Pokémon. Reads
// the wild Pokémon's species/level/HP entirely from the caller's own
// persisted FieldBattleSession — never from client-supplied params — so
// there is nothing left for a client to lie about; a request can only ever
// say "attempt a capture right now", never which species/level/HP that
// capture is rolled against.
//
// Duplicate-request safety: a captured Pokémon is created and the session
// is ended inside one interactive transaction that deletes the session
// *first* and only creates the Pokémon if that delete actually removed a
// row. Postgres resolves a DELETE's WHERE clause after taking the row's
// lock, so two concurrent calls racing this same transaction can never
// both see a row to delete — the loser's deleteMany reports 0 rows and
// aborts before ever creating a second Pokémon from one throw.
//
// Ball ownership/price/capture-rate are always resolved server-side
// against the static Shop catalog (by ballItemId) and CAPTURE_RATE_TABLE
// (features/shop/data/shop-items.ts, data/battle/capture-rate-config.ts)
// — a client can only ever say which ball it used, never what chance that
// implies. The ball decrement
// (removeInventoryItem, features/inventory/services/inventory.service.ts —
// the same atomic gte-guarded idiom the Shop's own sell flow uses) and the
// capture's effect (creating the Pokémon, or simply doing nothing on a
// miss) always happen inside the one transaction below, so "exactly one
// ball consumed per attempt, whether it succeeds or fails" can never
// desync from what actually happened to the encounter — see this
// function's own callers for why that guarantee matters (the Bag lets a
// player keep pressing Capture until either outcome, so a lost/duplicated
// decrement would silently give free throws or overcharge one).
export async function attemptCapture(userId: string, ballItemId: string): Promise<AttemptCaptureResult> {
  const profile = await getPlayerProfile(userId);
  const session = await prisma.fieldBattleSession.findUnique({ where: { playerId: profile.id } });

  if (!session) {
    return { status: "invalid-encounter" };
  }

  const species = getSpeciesById(session.wildSpeciesId);
  if (!species) {
    return { status: "invalid-encounter" };
  }

  const ball = getShopItemById(ballItemId);
  if (!ball || ball.categoryId !== "poke-balls") {
    return { status: "invalid-item" };
  }

  // Master Ball bypasses the RNG entirely (never rolled, never looked up in
  // CAPTURE_RATE_TABLE) rather than being modeled as some percentage that
  // could round to less than 100 — see this module's own
  // MASTER_BALL_ITEM_ID doc comment. Every other ball must resolve to a
  // real CaptureBallId (data/battle/capture-rate-config.ts) or the attempt
  // is rejected — a Shop item that's somehow categorized "poke-balls" but
  // isn't one of the three rollable balls or Master Ball can never reach
  // rollCapture with an untyped id.
  let captured: boolean;
  if (ball.id === MASTER_BALL_ITEM_ID) {
    captured = true;
  } else if (isCaptureBallId(ball.id)) {
    captured = rollCapture({ currentHp: session.wildCurrentHp, maxHp: session.wildMaxHp, rarity: species.rarity }, ball.id);
  } else {
    return { status: "invalid-item" };
  }

  return prisma.$transaction(async (tx) => {
    const removed = await removeInventoryItem(tx, profile.id, ballItemId, 1);
    if (!removed) {
      return { status: "no-balls" };
    }
    const remainingQuantity = await getInventoryItemQuantity(tx, profile.id, ballItemId);

    if (!captured) {
      return { status: "failed", remainingQuantity };
    }

    const ended = await tx.fieldBattleSession.deleteMany({ where: { playerId: profile.id } });
    if (ended.count === 0) {
      // Already ended by a racing duplicate request (or some other
      // battle-ending action) — never create a second Pokémon (or grant a
      // second XP reward) from this one throw. The ball itself is still
      // spent (already decremented above, same transaction) — from the
      // player's perspective this throw simply didn't land.
      return { status: "failed", remainingQuantity };
    }

    // createOwnedPokemon (shared with select-starter.service.ts) also
    // assigns this Pokémon's starting known moves in the same transaction
    // — see that function's doc comment for why this must never be
    // duplicated as a second, separate call site.
    const { pokemon } = await createOwnedPokemon(tx, {
      playerId: profile.id,
      speciesId: species.id,
      level: session.wildLevel,
      // Not a capture-XP reward (there isn't one — see
      // features/pokemon-progression's own "Pokémon do not receive XP
      // from capturing" rule); this is only the total-XP baseline that's
      // actually consistent with the level this Pokémon is created at, so
      // its very next real battle-XP grant (features/pokemon-progression)
      // computes a level *increase* from here, never an implicit drop
      // back down from a stale `experience: 0` default.
      experience: getTotalXpRequiredForPokemonLevel(session.wildLevel),
      currentHp: session.wildCurrentHp,
      isStarter: false,
      source: "capture",
      // partySlot deliberately omitted — createOwnedPokemon's own default
      // (storage only, null) is exactly the correct starting state; the
      // auto-add-to-party step right below is what may promote it out of
      // that default, never the other way around.
    });

    // FIELD CAPTURE — AUTO-ADD TO PARTY IF SPACE. Reuses
    // getFirstEmptyPartySlot (features/party/utils/party-rules.ts, the
    // same pure "which slot is next" logic a future party-editor auto-add
    // would also use) against the party's CURRENT occupancy, read fresh
    // inside this same transaction. Never touches assignToPartySlot
    // (features/party/services/party-management.service.ts): that
    // function's own ownership/Daycare checks and "vacate the destination
    // slot first" logic all exist for MOVING an already-in-party Pokémon
    // — a brand-new capture has neither an old slot to vacate nor any
    // possibility of already being in Daycare, so reusing it here would
    // just re-check guarantees this code path already has by
    // construction. Wrapped in its own try/catch, never allowed to fail
    // the capture itself: on the vanishingly rare chance of a genuine
    // race against a concurrent party edit (a real
    // [playerId, partySlot] unique-constraint hit), the Pokémon simply
    // stays in storage — its own already-correct default state — rather
    // than aborting an otherwise-successful capture (section 8's own
    // "keep it in storage rather than corrupting the capture flow" rule).
    let addedToParty = false;
    const currentParty = await tx.playerPokemon.findMany({
      where: { playerId: profile.id, partySlot: { not: null } },
      select: { partySlot: true },
    });
    const emptySlot = getFirstEmptyPartySlot(currentParty.map((member) => member.partySlot as number));
    if (emptySlot !== null) {
      try {
        await tx.playerPokemon.update({ where: { id: pokemon.id }, data: { partySlot: emptySlot } });
        addedToParty = true;
      } catch {
        // Left in storage — see this block's own doc comment.
      }
    }

    // Same transaction, same race guard as the delete/create above — the
    // deleteMany count check already makes this whole block run at most
    // once per encounter, so the XP grant inherits that same
    // exactly-once guarantee for free.
    const xpResult = await addPlayerExperience(tx, profile.id, calculateCaptureXpReward(session.wildLevel));

    return { status: "captured", speciesName: species.name, xpResult, remainingQuantity, addedToParty };
  });
}
