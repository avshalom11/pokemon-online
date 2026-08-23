import "server-only";

import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import type { ChangePasswordInput } from "../validation/profile.schema";

export type ChangePasswordResult = { status: "success" } | { status: "error"; message: string };

// Deliberately generic on any failure — never reveal whether the rejection
// was "current password wrong" vs. anything else, same "auth failures stay
// generic" precedent lib/auth/auth-errors.ts's getLoginErrorMessage already
// establishes for sign-in.
const GENERIC_CHANGE_PASSWORD_ERROR_MESSAGE = "לא ניתן היה לשנות את הסיסמה. ודא שהסיסמה הנוכחית נכונה ונסה שוב.";

// The one place a password is ever changed — a thin passthrough to Better
// Auth's own official changePassword flow (auth.api.changePassword). No
// password is ever read, hashed, compared, or stored by this project's own
// code; PlayerProfile has no password-related column at all. Identifies
// "which user" purely from the current request's session cookie (via
// headers()), never from a client-supplied id, so this can only ever
// change the authenticated caller's own password.
export async function changePassword(input: ChangePasswordInput): Promise<ChangePasswordResult> {
  try {
    await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        // Every OTHER session for this account is signed out on a
        // successful change (the current one — the one making this very
        // request — is deliberately left alone, so the player isn't logged
        // out by their own change-password action). Same "a password
        // change should kill any session an attacker might already be
        // holding" reasoning as the forgot-password reset flow's own
        // revokeSessionsOnPasswordReset (lib/auth/auth.ts).
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });

    return { status: "success" };
  } catch {
    return { status: "error", message: GENERIC_CHANGE_PASSWORD_ERROR_MESSAGE };
  }
}
