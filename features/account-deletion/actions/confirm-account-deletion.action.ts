"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import type { ConfirmAccountDeletionActionState } from "@/features/account-deletion/actions/confirm-account-deletion.state";
import { confirmAccountDeletion } from "@/features/account-deletion/services/account-deletion.service";
import { auth } from "@/lib/auth/auth";

const ERROR_MESSAGES: Record<"invalid" | "expired" | "used" | "error", string> = {
  invalid: "קישור המחיקה אינו תקין.",
  expired: "קישור המחיקה פג תוקף. יש לבקש מחיקת חשבון מחדש מהפרופיל שלך.",
  used: "קישור המחיקה כבר נוצל.",
  error: "אירעה שגיאה. נסה שוב מאוחר יותר.",
};

// ACCOUNT DELETION — the ONE place the account is actually, permanently
// deleted. Only ever reached via an explicit POST from the confirmation
// page's own final button (app/delete-account/confirm — see
// DeleteAccountConfirmForm.tsx) — GET-loading/scanning/prefetching that
// page never calls this (section 6). Possession of a valid token is the
// entire authorization here; no session/userId is read from the request at
// all (section 4) — see confirmAccountDeletion's own doc comment for why
// that's deliberate (the confirming device may not be logged in at all).
//
// On success: the deletion transaction has already cascaded away every
// Session row for this user (Better Auth's own Session.user relation is
// onDelete: Cascade — schema.prisma), which is what actually revokes access
// from every device. This request's own auth.api.signOut call additionally
// clears THIS browser's session cookie (best-effort — wrapped so a failure
// here can never block the redirect, same resilience posture as
// logoutAction in lib/auth/actions.ts), then redirects to the public
// entry screen. Deleted credentials can no longer sign in — the account
// row itself is gone.
export async function confirmAccountDeletionAction(
  _prevState: ConfirmAccountDeletionActionState,
  formData: FormData
): Promise<ConfirmAccountDeletionActionState> {
  const token = formData.get("token");
  if (typeof token !== "string" || token.length === 0) {
    return { status: "error", message: ERROR_MESSAGES.invalid };
  }

  const result = await confirmAccountDeletion(token);

  if (result.status !== "success") {
    return { status: "error", message: ERROR_MESSAGES[result.status] };
  }

  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // Deliberately swallowed — the account is already gone regardless; see
    // this function's own doc comment.
  }

  redirect("/");
}
