"use client";

import { useActionState } from "react";
import Link from "next/link";

import { AuthMessage } from "./AuthMessage";
import { PasswordField } from "./PasswordField";
import { initialPasswordResetActionState } from "@/lib/auth/auth-action-state";
import { resetPasswordAction } from "@/lib/auth/actions";

interface ResetPasswordFormProps {
  token: string;
}

// The second half of the forgot-password flow — reached from the emailed
// link's token (app/reset-password/page.tsx passes it through as a prop,
// never read from anywhere else). Submits via resetPasswordAction, which is
// a thin wrapper around Better Auth's own single-use resetPassword
// endpoint; the token itself travels as a hidden field so it's included in
// the same FormData useActionState already threads through, rather than a
// second manual fetch call.
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialPasswordResetActionState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <AuthMessage tone="success" message={state.message ?? ""} />
        <Link
          href="/"
          className="rounded-lg bg-amber-400 px-4 py-2.5 text-center text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
        >
          מעבר להתחברות
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />

      {state.status === "error" && state.message ? <AuthMessage tone="error" message={state.message} /> : null}

      <PasswordField
        name="newPassword"
        label="סיסמה חדשה"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.newPassword?.[0]}
      />

      <PasswordField
        name="confirmNewPassword"
        label="אימות סיסמה חדשה"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmNewPassword?.[0]}
      />

      <button
        type="submit"
        disabled={pending || !token}
        className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "מעדכן..." : "עדכן סיסמה"}
      </button>
    </form>
  );
}
