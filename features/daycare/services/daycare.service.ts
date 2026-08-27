import "server-only";

import { calculateDaycareProgress } from "@/features/daycare/daycare-calculations";
import type { CollectFromDaycareResult, DepositToDaycareResult } from "@/features/daycare/types";
import { spendCurrency } from "@/features/currency/services/currency-reward.service";
import { getTotalXpRequiredForPokemonLevel } from "@/features/pokemon-progression/pokemon-progression-calculations";
import { applyPokemonXpGrant } from "@/features/pokemon-progression/pokemon-progression-service";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { DAYCARE_DEPOSIT_FEE, DAYCARE_MAX_POKEMON_LEVEL, DAYCARE_MAX_SLOTS } from "@/features/daycare/config/daycare.config";
import { prisma } from "@/lib/db/prisma";

function isUniqueConstraintViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

// PHASE 2 — 5 SLOTS + DEPOSIT FEE. Both thrown purely to force the whole
// deposit transaction (including the deposit-fee spend, which necessarily
// runs BEFORE either of these checks — see depositToDaycare's own doc
// comment for why) to roll back — same "throw to undo an already-performed
// step" idiom collectFromDaycare's own DaycareInsufficientFundsError
// already establishes below.
class DaycareInsufficientFundsForDepositError extends Error {}
class DaycareFullError extends Error {}

// DEPOSIT — Section 7 (eligibility) + Section 8/Section 1 (up to
// DAYCARE_MAX_SLOTS per player, Phase 2). Every check re-reads fresh from
// the database (never trusts a client's idea of level/party/Daycare
// state) and re-validates ownership before any business rule, same
// convention release-pokemon.service.ts/party-management.service.ts
// already establish.
//
// PARTY HANDLING DECISION (unchanged from Phase 1) — a Pokémon currently
// occupying a party slot is REJECTED here ("in-party"), requiring the
// player to remove it via the existing party-management flow
// (removeFromParty) first, rather than this function silently clearing
// partySlot itself. This mirrors release-pokemon.service.ts's OWN
// established convention for the one directly analogous existing action,
// and gets removeFromParty's own "would-leave-no-usable" safety net for
// free.
//
// 500 MONEY DEPOSIT FEE + 5-SLOT CAP — CONCURRENCY. Every deposit for a
// given player necessarily spends DAYCARE_DEPOSIT_FEE against that SAME
// player's own PlayerProfile row (spendCurrency's own atomic
// gte-guarded UPDATE). Postgres takes a real row-level lock for that
// UPDATE, held for the rest of the transaction — so of two concurrent
// deposit requests FOR THE SAME PLAYER, the second one's own spendCurrency
// call blocks until the first transaction commits or rolls back. This is
// what makes the capacity re-count immediately after (inside this same
// transaction, while still holding that lock) race-safe: two concurrent
// deposits for the same player can never both observe "count < 5" and
// both proceed, the exact race a plain pre-check alone could never
// prevent. No new schema column (e.g. a slot-index) is needed for this —
// the existing per-player currency row already gives every deposit a
// natural, already-necessary serialization point specific to that one
// player, never blocking unrelated players' deposits.
//
// The fee is spent FIRST (before the capacity check), so if the player
// turns out to already be at capacity, DaycareFullError forces the whole
// transaction — spend included — to roll back: "if creation fails, the
// 500 Money deduction must roll back" (Section 4) holds for every
// rejection reason, not just insufficient funds.
export async function depositToDaycare(playerId: string, playerPokemonId: string): Promise<DepositToDaycareResult> {
  const pokemon = await prisma.playerPokemon.findUnique({ where: { id: playerPokemonId } });
  if (!pokemon || pokemon.playerId !== playerId) {
    return { ok: false, error: "not-owned" };
  }
  if (pokemon.level >= DAYCARE_MAX_POKEMON_LEVEL) {
    return { ok: false, error: "already-max-level" };
  }
  if (pokemon.partySlot !== null) {
    return { ok: false, error: "in-party" };
  }

  const existingStayForPokemon = await prisma.playerDaycareStay.findUnique({ where: { playerPokemonId } });
  if (existingStayForPokemon) {
    return { ok: false, error: "already-in-daycare" };
  }

  // MARKETPLACE PHASE 7 (hardening) — a Pokémon currently locked into a
  // listing must never be deposited. Same "check the other feature's own
  // table directly rather than depend on its service" convention this
  // function already follows for `playerDaycareStay` above (and
  // release-pokemon.service.ts/party-management.service.ts establish
  // elsewhere) — reuses the Marketplace lock's own existence as the source
  // of truth, never a duplicated flag.
  const marketplaceLock = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId } });
  if (marketplaceLock) {
    return { ok: false, error: "marketplace-listed" };
  }

  // Fast, non-transactional pre-check for the common "already full" case —
  // avoids a wasted currency spend/rollback round trip when the player
  // obviously already has 5 stays. Never the ONLY guard against exceeding
  // the cap — the re-count inside the transaction below (behind the
  // per-player lock described above) is the real, race-safe enforcement.
  const preCheckCount = await prisma.playerDaycareStay.count({ where: { playerId } });
  if (preCheckCount >= DAYCARE_MAX_SLOTS) {
    return { ok: false, error: "daycare-full" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const spent = await spendCurrency(tx, playerId, "money", DAYCARE_DEPOSIT_FEE);
      if (!spent) throw new DaycareInsufficientFundsForDepositError();

      const count = await tx.playerDaycareStay.count({ where: { playerId } });
      if (count >= DAYCARE_MAX_SLOTS) throw new DaycareFullError();

      await tx.playerDaycareStay.create({ data: { playerPokemonId, playerId, startingLevel: pokemon.level } });
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof DaycareInsufficientFundsForDepositError) {
      return { ok: false, error: "insufficient-funds" };
    }
    if (error instanceof DaycareFullError) {
      return { ok: false, error: "daycare-full" };
    }
    // A concurrent duplicate deposit request for this exact Pokémon lost
    // the race against playerPokemonId's own primary key (unchanged,
    // unconditional — see PlayerDaycareStay's own doc comment).
    if (isUniqueConstraintViolation(error)) {
      return { ok: false, error: "already-in-daycare" };
    }
    throw error;
  }
}

// PICKUP — Section 9 (atomic pickup) + Section 17 (exactly-once). PHASE
// 2 — now scoped to ONE specific `playerPokemonId`: collecting one
// deposited Pokémon calculates/charges/applies only that Pokémon's own
// stay and never touches the player's other 0-4 active stays, which stay
// completely independent (each has its own row, its own depositedAt/
// startingLevel — there is no shared state between them to accidentally
// couple).
//
// EXACTLY-ONCE — the CAS-guarded delete below (deleteMany matched on both
// playerPokemonId and playerId) is what makes two simultaneous/duplicate
// pickup requests for the same stay resolve safely: Postgres takes a real
// row-level lock for a DELETE, so of two concurrent transactions racing to
// delete the SAME row, the second one always blocks until the first
// commits, then re-evaluates its WHERE clause against the now-committed
// (row gone) state and matches zero rows — it returns "not-found" HAVING
// NEVER REACHED spendCurrency below, so a duplicate request can never
// double-charge or double-apply levels. This is why the delete happens
// BEFORE the currency spend, not after: whichever request "wins" the
// delete is the only one that will ever proceed to pay/apply, and the
// loser exits harmlessly before touching money or levels at all.
//
// INSUFFICIENT FUNDS AFTER A SUCCESSFUL DELETE — the one remaining case:
// this request legitimately won the delete, but the player doesn't have
// enough Money for THIS Pokémon's own accumulated debt. The Pokémon must
// NOT be removed from Daycare in that case (Section 5's explicit rule) —
// so this throws a typed error to force the ENTIRE transaction (including
// the delete just performed) to roll back, restoring the stay row exactly
// as if this request had never run.
//
// The original 500 deposit fee is never refunded and never re-charged
// here — it was already spent once, at deposit time, and this function
// only ever touches `progress.debt` (the accumulated per-level cost),
// which has never included the deposit fee.
class DaycareInsufficientFundsError extends Error {}

export async function collectFromDaycare(playerId: string, playerPokemonId: string): Promise<CollectFromDaycareResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const stay = await tx.playerDaycareStay.findUnique({ where: { playerPokemonId } });
      if (!stay || stay.playerId !== playerId) return { ok: false, error: "not-found" };

      const pokemon = await tx.playerPokemon.findUnique({ where: { id: stay.playerPokemonId } });
      if (!pokemon || pokemon.playerId !== playerId) return { ok: false, error: "not-found" };

      // Authoritative — recomputed fresh, inside this transaction, against
      // the real current instant, from ONLY this one stay's own
      // depositedAt/startingLevel. Never trusts any earlier read (a stale
      // progress snapshot from the page's own last poll, for instance),
      // and never affected by any OTHER stay this player may also have.
      const progress = calculateDaycareProgress({ startingLevel: stay.startingLevel, depositedAt: stay.depositedAt, now: new Date() });

      const removed = await tx.playerDaycareStay.deleteMany({
        where: { playerId, playerPokemonId: stay.playerPokemonId },
      });
      if (removed.count === 0) return { ok: false, error: "not-found" };

      const spent = await spendCurrency(tx, playerId, "money", progress.debt);
      if (!spent) throw new DaycareInsufficientFundsError();

      // LEVELS ARE PENDING UNTIL PICKUP (Section 4) — this is the one
      // moment they're ever actually applied to PlayerPokemon, reusing the
      // EXACT existing XP-grant machinery (never a duplicated level-up
      // implementation): the Daycare-earned level delta is converted into
      // a plain XP amount (the total XP required to reach
      // progress.effectiveLevel, minus whatever XP this Pokémon already
      // has), and applyPokemonXpGrant is what actually writes the new
      // level/XP/HP, runs move-learning across every level crossed, and
      // creates a pending evolution decision if the new level qualifies
      // (a PENDING decision only; never auto-evolves). `xpAmount` is
      // safely clamped to >= 0 by applyPokemonXpGrant itself, so
      // earnedLevels === 0 (picked up immediately) naturally grants
      // nothing at all — no separate early-return needed for that case.
      const xpAmount = getTotalXpRequiredForPokemonLevel(progress.effectiveLevel) - pokemon.experience;
      const result = await applyPokemonXpGrant(tx, pokemon.id, xpAmount, "finisher", 1, "daycare");

      const species = getSpeciesById(pokemon.speciesId);

      return {
        ok: true,
        displayName: pokemon.nickname ?? species?.name ?? pokemon.speciesId,
        previousLevel: result.previousLevel,
        newLevel: result.newLevel,
        levelsGained: result.levelsGained,
        moneySpent: progress.debt,
      };
    });
  } catch (error) {
    if (error instanceof DaycareInsufficientFundsError) {
      return { ok: false, error: "insufficient-funds" };
    }
    throw error;
  }
}
