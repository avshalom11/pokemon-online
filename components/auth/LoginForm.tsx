"use client";

import { useActionState, useEffect, useState } from "react";

import { AuthMessage } from "./AuthMessage";
import { buildLockoutCountdownMessage, getRemainingLockoutMs } from "./lockout-countdown";
import { PasswordField } from "./PasswordField";
import { initialAuthActionState } from "@/lib/auth/auth-action-state";
import { loginAction } from "@/lib/auth/actions";

interface LoginFormProps {
  onForgotPassword: () => void;
}

// LOCKOUT COUNTDOWN — sessionStorage key holding only the server's own
// lockedUntil ISO timestamp (never a duration/countdown value the client
// computed itself), so a page refresh or a navigate-away-and-back can
// restore the SAME countdown instead of losing it or restarting a fresh
// one. Session-scoped (not localStorage) — clears on tab close, same as
// every other piece of this form's own state.
const LOCKOUT_STORAGE_KEY = "auth:lockedUntil";

export function LoginForm({ onForgotPassword }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialAuthActionState);

  // The one piece of lockout UI state that survives a refresh — useActionState's
  // own `state` is just in-memory React state tied to this component instance
  // and always resets to `initialAuthActionState` on a fresh page load, so it
  // alone can't render a countdown that survives F5. `lockedUntilIso` is
  // ALWAYS either the exact string AuthActionState.lockedUntil last sent
  // (lib/auth/actions.ts), or the exact string previously persisted from that
  // same field — never a value this component invents or extends on its own,
  // which is what keeps the server the sole authority on when the lock ends.
  const [lockedUntilIso, setLockedUntilIso] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  // Restore an in-progress lockout after a refresh/navigate-back. Runs once
  // on mount, client-side only (sessionStorage doesn't exist during SSR).
  useEffect(() => {
    const stored = sessionStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (!stored) return;

    if (getRemainingLockoutMs(stored) > 0) {
      setLockedUntilIso(stored);
    } else {
      // Already expired by the time this tab reopened — clean up rather
      // than leave a stale entry around. The real unlock already happened
      // server-side (isLockedOut self-heals on the next actual check).
      sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
    }
  }, []);

  // Adopts a fresh lock (or clears a stale one) whenever the server responds.
  // Any response that isn't `locked: true` — a normal wrong-credentials
  // error, a validation error, or a fresh unlocked state — clears the local
  // countdown; the server is re-checked from scratch on every real submit
  // regardless of what this component currently displays.
  useEffect(() => {
    if (state.status !== "error") return;

    if (state.locked && state.lockedUntil) {
      setLockedUntilIso(state.lockedUntil);
      sessionStorage.setItem(LOCKOUT_STORAGE_KEY, state.lockedUntil);
    } else if (!state.locked) {
      setLockedUntilIso(null);
      sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
    }
  }, [state]);

  // The live tick — recomputes remaining time from the authoritative
  // lockedUntilIso every second (never accumulates/decrements a counter of
  // its own, so it can't drift or desync from the real server expiry).
  // Returns cleanly to normal login state the instant remaining time
  // reaches zero.
  useEffect(() => {
    if (!lockedUntilIso) {
      setRemainingMs(null);
      return;
    }

    function tick() {
      const remaining = getRemainingLockoutMs(lockedUntilIso!);
      if (remaining <= 0) {
        setRemainingMs(null);
        setLockedUntilIso(null);
        sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
        return;
      }
      setRemainingMs(remaining);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockedUntilIso]);

  const isLockedOut = remainingMs !== null;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {isLockedOut ? (
        <AuthMessage tone="error" message={buildLockoutCountdownMessage(remainingMs)} />
      ) : state.status === "error" && state.message ? (
        <AuthMessage tone="error" message={state.message} />
      ) : null}

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

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="rememberMe"
            value="true"
            defaultChecked
            className="h-4 w-4 rounded border-white/20 bg-slate-900 accent-amber-400"
          />
          השאר אותי מחובר
        </label>

        <button
          type="button"
          onClick={onForgotPassword}
          className={`text-sm font-medium transition-colors hover:text-amber-300 ${
            isLockedOut ? "font-semibold text-amber-400" : "text-slate-400"
          }`}
        >
          שכחתי סיסמה
        </button>
      </div>

      <button
        type="submit"
        disabled={pending || isLockedOut}
        className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "מתחבר..." : "התחברות"}
      </button>
    </form>
  );
}
