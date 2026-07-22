"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as z from "zod";

import type { AuthActionState } from "@/lib/auth/auth-action-state";
import { auth } from "@/lib/auth/auth";
import { getLoginErrorMessage, getRegistrationErrorMessage } from "@/lib/auth/auth-errors";
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

  redirect("/map");
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

  redirect("/map");
}

export async function logoutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
