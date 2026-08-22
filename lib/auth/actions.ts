"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as z from "zod";

import { markOffline } from "@/features/presence/services/presence.service";
import type { AuthActionState } from "@/lib/auth/auth-action-state";
import { auth } from "@/lib/auth/auth";
import { getLoginErrorMessage, getRegistrationErrorMessage } from "@/lib/auth/auth-errors";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import { loginSchema, registerSchema } from "@/lib/auth/validation";

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

  try {
    if (isEmailIdentifier) {
      await auth.api.signInEmail({
        body: { email: identifier.toLowerCase(), password, rememberMe },
        headers: await headers(),
      });
    } else {
      await auth.api.signInUsername({
        body: { username: identifier, password, rememberMe },
        headers: await headers(),
      });
    }
  } catch {
    // Deliberately ignore the specific error — login always returns the
    // same generic message regardless of cause (see getLoginErrorMessage).
    return { status: "error", message: getLoginErrorMessage() };
  }

  // See the matching comment in registerAction above.
  redirect("/home");
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
