"use server";

import { requestAccountDeletion } from "@/features/account-deletion/services/account-deletion-request.service";
import { getCurrentSession } from "@/lib/auth/auth-session";

export type RequestAccountDeletionActionResult =
  | { status: "success"; message: string }
  | { status: "error"; message: string };

// ACCOUNT DELETION — request step, triggered by the Danger Zone dialog's
// "אישור ושליחת מייל" button. Resolves the acting account entirely from the
// server-side session — no userId or email ever arrives from the client
// (section 13). Never deletes anything itself; only issues a token and
// sends the confirmation email (see account-deletion-request.service.ts).
export async function requestAccountDeletionAction(): Promise<RequestAccountDeletionActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error", message: "יש להתחבר מחדש." };

  const result = await requestAccountDeletion(session.user.id);

  if (result.status === "error") {
    return { status: "error", message: "שליחת מייל האישור נכשלה. נסה שוב מאוחר יותר." };
  }

  return {
    status: "success",
    message: "שלחנו הודעת אישור לכתובת המייל הרשומה בחשבון שלך. החשבון יימחק רק לאחר אישור דרך המייל.",
  };
}
