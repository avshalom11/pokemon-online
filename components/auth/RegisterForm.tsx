"use client";

import { useActionState } from "react";

import { AuthMessage } from "./AuthMessage";
import { PasswordField } from "./PasswordField";
import { initialAuthActionState } from "@/lib/auth/auth-action-state";
import { registerAction } from "@/lib/auth/actions";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialAuthActionState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? <AuthMessage tone="error" message={state.message} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-username" className="text-sm font-medium text-slate-200">
          שם משתמש
        </label>
        <input
          id="register-username"
          name="username"
          type="text"
          autoComplete="username"
          required
          aria-invalid={state.fieldErrors?.username ? true : undefined}
          className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2.5 text-slate-100 outline-none transition-colors focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/30"
        />
        {state.fieldErrors?.username ? (
          <p className="text-xs text-red-400">{state.fieldErrors.username[0]}</p>
        ) : (
          <p className="text-xs text-slate-500">3–20 תווים: אותיות באנגלית, ספרות וקו תחתון בלבד</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-email" className="text-sm font-medium text-slate-200">
          אימייל
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2.5 text-slate-100 outline-none transition-colors focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/30"
        />
        {state.fieldErrors?.email ? <p className="text-xs text-red-400">{state.fieldErrors.email[0]}</p> : null}
      </div>

      <PasswordField
        name="password"
        label="סיסמה"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password?.[0]}
      />

      <PasswordField
        name="confirmPassword"
        label="אימות סיסמה"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword?.[0]}
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "נרשם..." : "הרשמה"}
      </button>
    </form>
  );
}
