"use client";

import { useActionState } from "react";

import { AuthMessage } from "./AuthMessage";
import { PasswordField } from "./PasswordField";
import { initialAuthActionState } from "@/lib/auth/auth-action-state";
import { loginAction } from "@/lib/auth/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialAuthActionState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message ? <AuthMessage tone="error" message={state.message} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-identifier" className="text-sm font-medium text-slate-200">
          שם משתמש או אימייל
        </label>
        <input
          id="login-identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          aria-invalid={state.fieldErrors?.identifier ? true : undefined}
          className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2.5 text-slate-100 outline-none transition-colors focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/30"
        />
        {state.fieldErrors?.identifier ? (
          <p className="text-xs text-red-400">{state.fieldErrors.identifier[0]}</p>
        ) : null}
      </div>

      <PasswordField
        name="password"
        label="סיסמה"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password?.[0]}
      />

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          name="rememberMe"
          value="true"
          defaultChecked
          className="h-4 w-4 rounded border-white/20 bg-slate-900 accent-amber-400"
        />
        זכור אותי
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "מתחבר..." : "התחברות"}
      </button>
    </form>
  );
}
