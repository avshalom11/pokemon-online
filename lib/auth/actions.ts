"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as z from "zod";

import { markOffline } from "@/features/presence/services/presence.service";
import type { AuthActionState, PasswordResetActionState } from "@/lib/auth/auth-action-state";
import { auth } from "@/lib/auth/auth";
import { getLoginErrorMessage, getRegistrationErrorMessage } from "@/lib/auth/auth-errors";
import { getCurrentSession } from "@/lib/auth/auth-session";
import {
  getProgressiveDelayMs,
  isLockedOut,
  LOGIN_LOCKED_MESSAGE,
  normalizeLoginIdentifier,
  recordFailedLoginAttempt,
  resetLoginAttempts,
} from "@/lib/auth/login-lockout";
import { getPlayerProfile, notifySecurityLoginLockout } from "@/lib/auth/player-profile";
import { hashIp, resolveRequestIp } from "@/lib/auth/request-ip";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/auth/validation";

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { username, email, password } = parsed.data;

  try {
    await auth.api.signUpEmail({
      body: {
        name: username,
        email,
        password,
        username,
      },
      headers: await headers(),
    });
  } catch (error) {
    // Never log the submitted password/email — only the mapped, safe
    // message is ever returned to the client.
    return { status: "error", message: getRegistrationErrorMessage(error) };
  }

  // The single landing destination after authentication is /home (see
  // features/onboarding/services/onboarding-status.ts). This redirect only
  // hands the freshly-authenticated user into protected territory — it does
  // not decide onboarding status itself (auth stays ignorant of that
  // business rule); /home's own server-side guard re-checks and bounces to
  // /onboarding/starter when needed, exactly as it does for every other
  // entry point.
  redirect("/home");
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { identifier, password, rememberMe } = parsed.data;
  const isEmailIdentifier = identifier.includes("@");
  const requestHeaders = await headers();

  // LOGIN RATE LIMITING — keyed by (identifier, requester IP), never the
  // account alone (see login-lockout.ts's own module doc comment for why
  // the old global-per-account design was itself an abuse vector). Applied
  // for EVERY identifier, including ones that resolve to no real account —
  // see isLockedOut's own doc comment on why unknown identifiers must be
  // rate-limited too, so their mere absence-of-lockout can't leak
  // "this account doesn't exist."
  const identifierKey = normalizeLoginIdentifier(identifier);
  const ipHash = hashIp(resolveRequestIp(requestHeaders));

  const preCheck = await isLockedOut(identifierKey, ipHash);
  if (preCheck.locked) {
    return {
      status: "error",
      message: LOGIN_LOCKED_MESSAGE,
      locked: true,
      lockedUntil: preCheck.lockedUntil!.toISOString(),
    };
  }

  try {
    if (isEmailIdentifier) {
      await auth.api.signInEmail({
        body: { email: identifier.toLowerCase(), password, rememberMe },
        headers: requestHeaders,
      });
    } else {
      await auth.api.signInUsername({
        body: { username: identifier, password, rememberMe },
        headers: requestHeaders,
      });
    }
  } catch {
    const { justLockedOut, lockedUntil, failedAttempts } = await recordFailedLoginAttempt(identifierKey, ipHash);

    // PROGRESSIVE DELAY — a small, non-blocking server-side delay before
    // attempts 3/4 respond (see getProgressiveDelayMs's own doc comment
    // for why a setTimeout-based await here never ties up the event loop
    // for other concurrent requests). Applied uniformly regardless of
    // whether the identifier resolves to a real account, for the same
    // enumeration-resistance reason as the rate limit itself.
    const delayMs = getProgressiveDelayMs(failedAttempts);
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (justLockedOut) {
      // Fire-and-forget from the caller's perspective (awaited, but its
      // own try/catch means a failure here can never affect this
      // response) — see notifySecurityLoginLockout's own doc comment for
      // why this lives in lib/auth/player-profile.ts rather than importing
      // features/notifications directly into this file.
      await notifySecurityLoginLockout(identifierKey, isEmailIdentifier);
      return {
        status: "error",
        message: LOGIN_LOCKED_MESSAGE,
        locked: true,
        lockedUntil: lockedUntil!.toISOString(),
      };
    }

    // Deliberately ignore the specific error — login always returns the
    // same generic message regardless of cause (see getLoginErrorMessage).
    return { status: "error", message: getLoginErrorMessage() };
  }

  await resetLoginAttempts(identifierKey, ipHash);

  // See the matching comment in registerAction above.
  redirect("/home");
}

// FORGOT PASSWORD — thin wrapper around Better Auth's own
// requestPasswordReset (see lib/auth/auth.ts's emailAndPassword.
// sendResetPassword for the token/email side). Always returns the same
// generic success message regardless of whether the email is registered —
// Better Auth's own endpoint already behaves this way internally (a
// nonexistent email gets an identical response after a dummy token
// generation, to keep timing consistent too); this action preserves that
// same non-disclosure even across its own try/catch.
export async function requestPasswordResetAction(
  _prevState: PasswordResetActionState,
  formData: FormData
): Promise<PasswordResetActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const redirectTo = `${process.env.BETTER_AUTH_URL ?? ""}/reset-password`;

  try {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data.email, redirectTo },
      headers: await headers(),
    });
  } catch {
    // Never surfaced to the client — see this action's own doc comment.
  }

  return {
    status: "success",
    message: "אם קיים חשבון עם כתובת האימייל הזו, נשלח אליו קישור לאיפוס הסיסמה.",
  };
}

// RESET PASSWORD — the second half of the forgot-password flow, reached
// from the emailed link's token. A thin wrapper around Better Auth's own
// resetPassword: the token is validated and consumed exactly once there
// (internalAdapter.consumeVerificationValue in the installed better-auth
// source) — an invalid, already-used, or expired token always throws,
// mapped here to one generic Hebrew message. The new password is hashed by
// Better Auth internally; this code never sees or stores it in plaintext.
export async function resetPasswordAction(
  _prevState: PasswordResetActionState,
  formData: FormData
): Promise<PasswordResetActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    await auth.api.resetPassword({
      body: { newPassword: parsed.data.newPassword, token: parsed.data.token },
      headers: await headers(),
    });
  } catch {
    return {
      status: "error",
      message: "קישור האיפוס אינו תקין או שפג תוקפו. יש לבקש קישור חדש.",
    };
  }

  return {
    status: "success",
    message: "הסיסמה עודכנה בהצלחה. אפשר להתחבר עם הסיסמה החדשה.",
  };
}

// ONLINE PRESENCE — IMMEDIATE OFFLINE ON LOGOUT. Resolved BEFORE
// auth.api.signOut invalidates the session below — the player marked
// offline is always this request's own real session, never a
// client-supplied id. Wrapped in one try/catch around the whole
// resolve-then-write so a presence failure (a missing/unresolvable
// session, a DB error) can never trap the user logged in: the sign-out
// and redirect below always run regardless. Closing the browser or
// losing connection without hitting this button entirely bypasses this —
// that path still relies purely on the existing heartbeat timeout
// (PRESENCE_ONLINE_WINDOW_MS), completely unchanged by this addition.
export async function logoutAction() {
  try {
    const session = await getCurrentSession();
    if (session) {
      const profile = await getPlayerProfile(session.user.id);
      await markOffline(profile.id);
    }
  } catch {
    // Deliberately swallowed — see doc comment above.
  }

  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
