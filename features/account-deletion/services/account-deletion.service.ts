import "server-only";

import { hashDeletionToken } from "@/lib/auth/account-deletion-token";
import { prisma } from "@/lib/db/prisma";

export type DeletionTokenCheckResult = "valid" | "invalid" | "expired" | "used";

// ACCOUNT DELETION — read-only token check for the confirmation PAGE's own
// GET render (app/delete-account/confirm/page.tsx). Never mutates anything
// — merely loading, scanning, or prefetching the emailed URL must not
// consume the token or delete the account (section 6). The actual
// consumption + deletion only ever happens in confirmAccountDeletion below,
// invoked from an explicit POST Server Action triggered by the page's own
// final button.
export async function checkDeletionToken(rawToken: string): Promise<DeletionTokenCheckResult> {
  const tokenHash = hashDeletionToken(rawToken);
  const record = await prisma.accountDeletionRequest.findUnique({ where: { tokenHash } });

  if (!record) return "invalid";
  if (record.consumedAt) return "used";
  if (record.expiresAt <= new Date()) return "expired";
  return "valid";
}

export type ConfirmAccountDeletionResult =
  | { status: "success" }
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "used" }
  | { status: "error" };

// ACCOUNT DELETION — step 2 (the actual, permanent, irreversible deletion).
// Only ever reached from an explicit POST Server Action after the token has
// already been validated once by the confirmation page's own render — this
// function re-validates from scratch regardless (never trusts that prior
// check), since the token could have expired or been consumed by a second
// tab/request in between.
//
// Everything below runs inside ONE prisma.$transaction — Prisma's default
// relationMode for this schema lets Postgres's own ON DELETE CASCADE do the
// real work: deleting the User row cascades to PlayerProfile (User's own
// FK, see schema.prisma), and every PlayerProfile-owned table cascades
// from THAT (pokemon, moves, field battle session, daily counts,
// notifications, inventory, seen species, eggs/incubators/incubations, gym
// progress/badges, regional champion progress/medals, NPC battle sessions,
// league tournament participants — which further cascade to their own
// league tournament matches/battle sessions, global chat messages, daycare
// stays, friendships on EITHER side, private conversations on EITHER side
// — which further cascade to their own messages, and Better Auth's own
// Session/Account rows). If any step here fails, the whole transaction
// rolls back atomically — there is no code path that leaves a half-deleted
// account (section 10).
//
// Two things are deliberately NOT left to cascade, and are cleaned up
// explicitly first:
//
//  1. LeagueTournamentMatch.activePlayerPokemonId... no — see
//     FieldBattleSession below. LeagueTournamentPlacement.playerId/
//     participantId are plain denormalized strings with NO foreign key at
//     all (schema.prisma's own doc comment on that model explains why: a
//     completed tournament's 1st/2nd/3rd place record is meant to survive
//     independently of live participant/tournament rows). Because there's
//     no FK, deleting the account would otherwise leave those columns
//     pointing at a now-nonexistent player forever — not a database
//     integrity error (no constraint exists to violate), but exactly the
//     kind of leftover reference to a deleted account this task asks to
//     avoid. Deleted explicitly by playerId before the User row goes.
//  2. FieldBattleSession.activePlayerPokemonId -> PlayerPokemon is
//     onDelete: Restrict (schema.prisma's own comment: a defense-in-depth
//     backstop against deleting a Pokémon that's genuinely mid-battle).
//     Both FieldBattleSession and PlayerPokemon cascade independently from
//     PlayerProfile, so a single `tx.user.delete()` resolves cleanly on
//     its own — Postgres processes the whole cascade graph before any
//     RESTRICT check is finalized. This explicit pre-delete is not
//     strictly required, but removes any reliance on that ordering
//     guarantee and makes the intent explicit, per the task's own "do not
//     blindly rely on cascade everywhere" instruction.
//  3. MARKETPLACE PHASE 7 (hardening) — MarketplaceListingPokemon.pokemon
//     -> PlayerPokemon is also onDelete: Restrict, the exact same
//     defense-in-depth shape as FieldBattleSession above (a locked
//     Pokémon must never silently vanish out from under an active/editing
//     listing). MarketplaceListing.seller is onDelete: Cascade, so this
//     player's own listings (and, via THEIR own onDelete: Cascade to
//     MarketplaceListingPokemon/MarketplaceListingItem, every lock row on
//     them) would already be swept away by the same single cascading
//     `tx.user.delete()` regardless — but exactly like point 2, this is
//     made explicit rather than relied on implicitly. Only the lock rows
//     need clearing here (never a real cancel — the listing row itself is
//     about to be destroyed by the cascade either way, so writing
//     status/cancelledAt on it first would never be observed by anyone).
//     The seller's own PlayerInventoryItem.lockedQuantity is left
//     untouched for the same reason: that row cascades away with the
//     account regardless of its locked/unlocked state.
export async function confirmAccountDeletion(rawToken: string): Promise<ConfirmAccountDeletionResult> {
  const tokenHash = hashDeletionToken(rawToken);

  try {
    return await prisma.$transaction(async (tx) => {
      const record = await tx.accountDeletionRequest.findUnique({ where: { tokenHash } });
      if (!record) return { status: "invalid" as const };
      if (record.consumedAt) return { status: "used" as const };
      if (record.expiresAt <= new Date()) return { status: "expired" as const };

      // Exactly-once claim — same guarded-updateMany idiom every other
      // race-safe primitive in this codebase uses (e.g.
      // wildDefeatRewardGranted). A concurrent second confirm request for
      // the same token loses this race and is told "used", never
      // double-deletes.
      const claimed = await tx.accountDeletionRequest.updateMany({
        where: { id: record.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (claimed.count === 0) return { status: "used" as const };

      const profile = await tx.playerProfile.findUnique({ where: { userId: record.userId }, select: { id: true } });
      if (profile) {
        await tx.leagueTournamentPlacement.deleteMany({ where: { playerId: profile.id } });
        await tx.fieldBattleSession.deleteMany({ where: { playerId: profile.id } });

        // MARKETPLACE PHASE 7 (hardening) — see point 3 above.
        const ownListingIds = (await tx.marketplaceListing.findMany({ where: { sellerId: profile.id }, select: { id: true } })).map(
          (listing) => listing.id
        );
        if (ownListingIds.length > 0) {
          await tx.marketplaceListingPokemon.deleteMany({ where: { listingId: { in: ownListingIds } } });
        }
      }

      await tx.user.delete({ where: { id: record.userId } });

      return { status: "success" as const };
    });
  } catch {
    return { status: "error" };
  }
}
