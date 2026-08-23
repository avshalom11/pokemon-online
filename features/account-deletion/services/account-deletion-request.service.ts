import "server-only";

import { DELETE_ACCOUNT_CONFIRM_PATH, DELETION_TOKEN_EXPIRES_IN_MS } from "@/features/account-deletion/config/account-deletion.config";
import { generateDeletionToken, hashDeletionToken } from "@/lib/auth/account-deletion-token";
import { sendAccountDeletionEmail } from "@/lib/email/account-deletion-email";
import { prisma } from "@/lib/db/prisma";

export type RequestAccountDeletionResult = { status: "success" } | { status: "error" };

// ACCOUNT DELETION — step 1: issue a fresh single-use token and email the
// confirmation link to the account's OWN registered email. Takes only
// `userId` (resolved by the caller server-side from the active session —
// see request-account-deletion.action.ts) and looks the email up itself
// directly from the User row, rather than trusting a caller-supplied
// email string — the same "never trust a client-suppliable identity
// field" posture as the rest of lib/auth/.
//
// Two-phase because a Prisma transaction can't span an external HTTP call
// to Resend: 1) atomically replace any previous outstanding token for this
// user inside prisma.$transaction (so at most one valid link ever exists —
// section 12 of the task), 2) send the email. If the send fails, the
// just-created row is deleted so a failed delivery can never leave a valid-
// but-undelivered deletion link sitting in the database (section 11) — the
// account itself is never touched by either phase, only this bookkeeping
// row.
//
// CRASH FIX — phase 1 (the token transaction) used to run with no error
// handling at all, unlike phase 2 below: any failure there (a DB error, a
// stale Prisma Client missing this model after a schema change — see this
// project's own restart-after-migrate note in lib/db/prisma.ts, which is
// exactly what caused a real crash here once) threw straight out of this
// function, through requestAccountDeletionAction, and into the client as
// an unhandled Server Action error — a full crash instead of the clean
// "שליחת מייל האישור נכשלה" message every other failure path already
// shows. This matches auth.ts's own sendResetPassword / actions.ts's
// requestPasswordResetAction, both of which never let a token/DB failure
// escape uncaught either. The account itself is still never touched by
// this phase either way (no User/PlayerProfile row is ever written here).
export async function requestAccountDeletion(userId: string): Promise<RequestAccountDeletionResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return { status: "error" };

  const rawToken = generateDeletionToken();
  const tokenHash = hashDeletionToken(rawToken);
  const expiresAt = new Date(Date.now() + DELETION_TOKEN_EXPIRES_IN_MS);

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      // Invalidate any previous outstanding (unconsumed) request for this
      // user before issuing a new one — "only the latest valid request
      // should remain usable" (section 12).
      await tx.accountDeletionRequest.deleteMany({ where: { userId, consumedAt: null } });
      return tx.accountDeletionRequest.create({ data: { userId, tokenHash, expiresAt } });
    });
  } catch {
    // No token row was durably created (a failed transaction leaves
    // nothing behind to clean up) and the account itself was never
    // touched — same clean, retryable error as a failed email send below.
    return { status: "error" };
  }

  const confirmUrl = `${process.env.BETTER_AUTH_URL ?? ""}${DELETE_ACCOUNT_CONFIRM_PATH}?token=${rawToken}`;

  try {
    await sendAccountDeletionEmail(user.email, confirmUrl);
  } catch {
    // Delivery failed — remove the just-issued row so no valid-but-
    // undelivered link is left behind, then report a clean error the user
    // can retry (section 11).
    await prisma.accountDeletionRequest.delete({ where: { id: created.id } }).catch(() => {});
    return { status: "error" };
  }

  return { status: "success" };
}
