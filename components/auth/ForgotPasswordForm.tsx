"use client";

import { useActionState } from "react";

import { AuthMessage } from "./AuthMessage";
import { initialPasswordResetActionState } from "@/lib/auth/auth-action-state";
import { requestPasswordResetAction } from "@/lib/auth/actions";

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialPasswordResetActionState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-slate-400">
        הזן את כתובת האימייל שאיתה נרשמת, ונשלח אליך קישור לאיפוס הסיסמה.
      </p>

      {state.status === "error" && state.message ? <AuthMessage tone="error" message={state.message} /> : null}
      {state.status === "success" && state.message ? <AuthMessage tone="success" message={state.message} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="forgot-password-email" className="text-sm font-medium text-slate-200">
          אימייל
        </label>
        <input
          id="forgot-password-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2.5 text-slate-100 outline-none transition-colors focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/30"
        />
        {state.fieldErrors?.email ? <p className="text-xs text-red-400">{state.fieldErrors.email[0]}</p> : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "שולח..." : "שלח קישור לאיפוס"}
      </button>

      <button
        type="button"
        onClick={onBackToLogin}
        className="text-sm font-medium text-slate-400 transition-colors hover:text-amber-300"
      >
        חזרה להתחברות
      </button>
    </form>
  );
}
