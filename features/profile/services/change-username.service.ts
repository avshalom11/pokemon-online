import "server-only";

import { headers } from "next/headers";

import { spendCurrency } from "@/features/currency/services/currency-reward.service";
import { USERNAME_CHANGE_COST_GOLD } from "@/features/profile/config/security-account.config";
import { auth } from "@/lib/auth/auth";
import { isUsernameTakenError } from "@/lib/auth/auth-errors";
import { prisma } from "@/lib/db/prisma";

export type ChangeUsernameResult =
  | { status: "success"; username: string }
  | { status: "same-username" }
  | { status: "username-taken" }
  | { status: "insufficient-gold" }
  | { status: "error" };

// SECURITY & ACCOUNT — the dedicated, paid username-change flow. Charging
// Gold and renaming the account are two DIFFERENT systems under the hood
// (PlayerProfile.gold is a plain Prisma column this codebase owns outright;
// the username itself is owned by Better Auth's own user table, updated
// only through its official auth.api.updateUser — see update-profile.
// service.ts's now-removed username handling for why this project never
// writes that column directly via Prisma). A single prisma.$transaction
// can't span both, so real "charge + rename must be atomic" is built as:
//
//   1. Pre-check availability via Better Auth's own isUsernameAvailable —
//      no charge yet. Makes the common case (a taken name) reject with
//      zero Gold ever touched, no transaction opened at all.
//   2. Atomically charge inside prisma.$transaction, using the same
//      gte-guarded spendCurrency every other Gold/coin spend in this
//      codebase uses (features/shop's own purchase services) — race-safe
//      against a concurrent spend dropping the balance between check and
//      charge.
//   3. Rename via auth.api.updateUser. If step 1's pre-check lost a race
//      (someone else claimed the name in between) or renaming fails for
//      any other reason, the charge from step 2 is refunded before
//      returning — so the OBSERVABLE end state is always exactly "gold
//      spent if and only if the rename actually took effect", even though
//      internally there's a brief charge-then-refund on that rare path.
//      This is the same DB-unique-constraint-is-the-real-backstop posture
//      lib/auth/auth-errors.ts's own isUsernameTakenError doc comment
//      already establishes for the ordinary (unpaid) registration race.
export async function changeUsername(
  playerId: string,
  currentUsername: string,
  newUsernameRaw: string
): Promise<ChangeUsernameResult> {
  const trimmed = newUsernameRaw.trim();

  if (trimmed.toLowerCase() === currentUsername.toLowerCase()) {
    return { status: "same-username" };
  }

  const availability = await auth.api.isUsernameAvailable({ body: { username: trimmed } });
  if (!availability.available) {
    return { status: "username-taken" };
  }

  const charged = await prisma.$transaction((tx) => spendCurrency(tx, playerId, "gold", USERNAME_CHANGE_COST_GOLD));
  if (!charged) {
    return { status: "insufficient-gold" };
  }

  try {
    await auth.api.updateUser({
      body: { username: trimmed, displayUsername: trimmed },
      headers: await headers(),
    });
  } catch (error) {
    await prisma.playerProfile.update({
      where: { id: playerId },
      data: { gold: { increment: USERNAME_CHANGE_COST_GOLD } },
    });

    return isUsernameTakenError(error) ? { status: "username-taken" } : { status: "error" };
  }

  // displayName mirrors a successful username change, same precedent
  // update-profile.service.ts's own (now-removed) username handling used
  // to establish at the point of writing PlayerProfile.
  await prisma.playerProfile.update({
    where: { id: playerId },
    data: { displayName: trimmed },
  });

  return { status: "success", username: trimmed.toLowerCase() };
}
